import { Suspense, lazy, startTransition, useEffect, useEffectEvent, useRef, useState } from "react";

import type {
  AuthSession,
  AvailabilityRequest,
  AvailabilityResult,
  Booking,
  ConnectivityState,
  GuesthouseSnapshot,
  InitializeSystemInput,
  LoginInput,
  QueueMutation,
  SendEmailInput,
  SystemStatus,
  UpdateRoomInput,
  UpsertBookingInput,
  UpsertDocumentInput
} from "../shared/domain";
import { calculateBookingTotal, calculateDocumentSubtotal, calculateNights, estimateRoomAvailability } from "../shared/utils";
import { LoadingScreen, LoginScreen, SetupScreen } from "./features/AuthScreens";
import { createAvailabilityDraft } from "./features/dashboardData";
import {
  flushMutation,
  getAvailability,
  getSnapshot,
  getSystemStatus,
  initializeSystem,
  login,
  logout
} from "./lib/api";
import { readQueue, readSnapshot, writeQueue, writeSnapshot } from "./offline/storage";

const SESSION_STORAGE_KEY = "omnihost-session";
const AppDashboard = lazy(() =>
  import("./features/AppDashboard").then((module) => ({ default: module.AppDashboard }))
);

function readStoredSession(): AuthSession | null {
  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

function createSetupDraft(): InitializeSystemInput {
  return {
    companyName: "OmniHost Hospitality Group",
    guesthouseName: "OmniHost",
    tagline: "Hospitality operations in one live control center.",
    address: "24 Lantern Walk, Oceanfront District",
    phone: "+1 (555) 014-9191",
    email: "ops@omnihost.app",
    currency: "USD",
    quotePrefix: "QTN",
    invoicePrefix: "INV",
    adminName: "Operations Owner",
    username: "owner",
    password: "Password123"
  };
}

function createLoginDraft(): LoginInput {
  return {
    username: "owner",
    password: "Password123"
  };
}

function applyOptimisticBooking(snapshot: GuesthouseSnapshot, payload: UpsertBookingInput) {
  const nights = calculateNights(payload.checkIn, payload.checkOut);
  const totalAmount = calculateBookingTotal({
    nightlyRate: payload.nightlyRate,
    nights,
    cleaningFee: payload.cleaningFee,
    taxAmount: payload.taxAmount,
    discountAmount: payload.discountAmount,
    selectedPackages: payload.selectedPackages
  });
  const record: Booking = {
    ...payload,
    totalAmount,
    createdAt: snapshot.bookings.find((booking) => booking.id === payload.id)?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return {
    ...snapshot,
    bookings: [record, ...snapshot.bookings.filter((booking) => booking.id !== payload.id)]
  };
}

function applyOptimisticDocument(snapshot: GuesthouseSnapshot, payload: UpsertDocumentInput) {
  const lineItems = payload.lineItems.map((lineItem) => ({
    ...lineItem,
    amount: lineItem.quantity * lineItem.unitPrice
  }));
  const subtotal = calculateDocumentSubtotal(lineItems);
  const totalAmount = subtotal + payload.taxAmount - payload.discountAmount;

  return {
    ...snapshot,
    documents: [
      {
        id: payload.id,
        bookingId: payload.bookingId,
        kind: payload.kind,
        status: payload.status,
        documentNumber:
          snapshot.documents.find((document) => document.id === payload.id)?.documentNumber ??
          `${payload.kind === "quotation" ? snapshot.profile.quotePrefix : snapshot.profile.invoicePrefix}-DRAFT`,
        recipientEmail: payload.recipientEmail,
        issueDate: payload.issueDate,
        dueDate: payload.dueDate,
        currency: payload.currency,
        note: payload.note,
        lineItems,
        subtotal,
        taxAmount: payload.taxAmount,
        discountAmount: payload.discountAmount,
        totalAmount,
        createdAt:
          snapshot.documents.find((document) => document.id === payload.id)?.createdAt ??
          new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      ...snapshot.documents.filter((document) => document.id !== payload.id)
    ]
  };
}

export default function App() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [snapshot, setSnapshot] = useState<GuesthouseSnapshot | null>(null);
  const [queue, setQueue] = useState<QueueMutation[]>([]);
  const [session, setSession] = useState<AuthSession | null>(() => readStoredSession());
  const [statusLoading, setStatusLoading] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [error, setError] = useState("");
  const [setupForm, setSetupForm] = useState<InitializeSystemInput>(createSetupDraft());
  const [loginForm, setLoginForm] = useState<LoginInput>(createLoginDraft());
  const [availabilityInput, setAvailabilityInput] = useState<AvailabilityRequest>(createAvailabilityDraft());
  const [availabilityResults, setAvailabilityResults] = useState<AvailabilityResult[]>([]);
  const [connectivity, setConnectivity] = useState<ConnectivityState>(
    navigator.onLine ? "connecting" : "offline"
  );
  const [presence, setPresence] = useState(0);
  const flushRef = useRef(false);
  const clientIdRef = useRef(crypto.randomUUID());
  const wsRef = useRef<WebSocket | null>(null);
  const queueRef = useRef(queue);
  const sessionRef = useRef(session);

  useEffect(() => {
    queueRef.current = queue;
    void writeQueue(queue);
  }, [queue]);

  useEffect(() => {
    sessionRef.current = session;

    if (session) {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, [session]);

  useEffect(() => {
    void (async () => {
      const [storedSnapshot, storedQueue, status] = await Promise.all([
        readSnapshot(),
        readQueue(),
        getSystemStatus()
      ]);
      if (storedSnapshot) {
        setSnapshot(storedSnapshot);
      }
      setQueue(storedQueue);
      setSystemStatus(status);
      setStatusLoading(false);
    })().catch((issue) => {
      setError(issue instanceof Error ? issue.message : "Failed to load OmniHost.");
      setStatusLoading(false);
    });
  }, []);

  useEffect(() => {
    void writeSnapshot(snapshot);
  }, [snapshot]);

  const syncSnapshot = useEffectEvent(async () => {
    if (!sessionRef.current) {
      return;
    }

    try {
      const nextSnapshot = await getSnapshot(sessionRef.current.token);
      startTransition(() => {
        setSnapshot(nextSnapshot);
        setError("");
      });
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Failed to sync data.");
    }
  });

  const flushQueueEffect = useEffectEvent(async () => {
    if (flushRef.current || !sessionRef.current || !navigator.onLine || queueRef.current.length === 0) {
      return;
    }

    flushRef.current = true;

    try {
      let workingQueue = [...queueRef.current];

      while (workingQueue.length > 0 && sessionRef.current) {
        const mutation = workingQueue[0];

        try {
          await flushMutation(sessionRef.current.token, mutation);
          workingQueue = workingQueue.slice(1);
          startTransition(() => setQueue(workingQueue));
        } catch (issue) {
          const message = issue instanceof Error ? issue.message : "Queued action failed.";
          workingQueue = [
            {
              ...mutation,
              attempts: mutation.attempts + 1,
              lastError: message
            },
            ...workingQueue.slice(1)
          ];
          startTransition(() => setQueue(workingQueue));
          setError(message);
          break;
        }
      }

      await syncSnapshot();
    } finally {
      flushRef.current = false;
    }
  });

  useEffect(() => {
    const handleOnline = () => {
      setConnectivity("connecting");
      void flushQueueEffect();
      void syncSnapshot();
    };

    const handleOffline = () => {
      setConnectivity("offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [flushQueueEffect, syncSnapshot]);

  useEffect(() => {
    if (!session || !systemStatus?.isInitialized) {
      wsRef.current?.close();
      wsRef.current = null;
      return;
    }

    let cancelled = false;
    let retryDelay = 1000;

    const connect = () => {
      if (cancelled) {
        return;
      }

      if (!navigator.onLine) {
        setConnectivity("offline");
        return;
      }

      setConnectivity("connecting");
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const socket = new WebSocket(
        `${protocol}//${window.location.host}/ws/live?token=${encodeURIComponent(
          session.token
        )}&clientId=${encodeURIComponent(clientIdRef.current)}`
      );
      wsRef.current = socket;

      socket.onopen = () => {
        retryDelay = 1000;
        setConnectivity("live");
      };
      socket.onmessage = (event) => {
        const message = JSON.parse(event.data as string) as {
          type: "welcome" | "pong" | "broadcast";
          activeConnections?: number;
          needsSync?: boolean;
        };

        setPresence(message.activeConnections ?? 0);

        if (message.type === "broadcast" || message.needsSync) {
          void syncSnapshot();
        }
      };
      socket.onclose = () => {
        if (cancelled) {
          return;
        }

        setConnectivity(navigator.onLine ? "connecting" : "offline");
        window.setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 30000);
      };
    };

    connect();

    return () => {
      cancelled = true;
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [session, systemStatus?.isInitialized, syncSnapshot]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "ping",
            clientId: clientIdRef.current,
            lastSyncAt: snapshot?.lastSyncAt ?? "",
            pendingMutations: queueRef.current.length
          })
        );
      }
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [session, snapshot?.lastSyncAt]);

  useEffect(() => {
    if (session && systemStatus?.isInitialized) {
      void syncSnapshot();
      void flushQueueEffect();
    }
  }, [session, systemStatus?.isInitialized, flushQueueEffect, syncSnapshot]);

  const enqueueMutation = useEffectEvent((mutation: QueueMutation) => {
    startTransition(() => setQueue((currentQueue) => [...currentQueue, mutation]));
  });

  const runAvailability = useEffectEvent(async () => {
    if (session && navigator.onLine) {
      try {
        const results = await getAvailability(session.token, availabilityInput);
        setAvailabilityResults(results as AvailabilityResult[]);
        return;
      } catch {
        // Fall back to local estimate below.
      }
    }

    if (snapshot) {
      setAvailabilityResults(
        estimateRoomAvailability(snapshot.rooms, snapshot.bookings, availabilityInput)
      );
    }
  });

  const saveRoom = useEffectEvent(async (payload: UpdateRoomInput) => {
    if (snapshot) {
      startTransition(() =>
        setSnapshot({
          ...snapshot,
          rooms: snapshot.rooms.map((room) =>
            room.id === payload.id
              ? { ...room, rate: payload.rate, status: payload.status, packageOptions: payload.packageOptions, updatedAt: new Date().toISOString() }
              : room
          )
        })
      );
    }

    enqueueMutation({
      id: crypto.randomUUID(),
      type: "update-room",
      payload,
      createdAt: new Date().toISOString(),
      attempts: 0,
      lastError: ""
    });
    await flushQueueEffect();
  });

  const saveBooking = useEffectEvent(async (payload: UpsertBookingInput) => {
    if (snapshot) {
      startTransition(() => setSnapshot(applyOptimisticBooking(snapshot, payload)));
    }

    enqueueMutation({
      id: crypto.randomUUID(),
      type: "upsert-booking",
      payload,
      createdAt: new Date().toISOString(),
      attempts: 0,
      lastError: ""
    });
    await flushQueueEffect();
  });

  const saveDocument = useEffectEvent(async (payload: UpsertDocumentInput) => {
    if (snapshot) {
      startTransition(() => setSnapshot(applyOptimisticDocument(snapshot, payload)));
    }

    enqueueMutation({
      id: crypto.randomUUID(),
      type: "upsert-document",
      payload,
      createdAt: new Date().toISOString(),
      attempts: 0,
      lastError: ""
    });
    await flushQueueEffect();
  });

  const sendBookingEmail = useEffectEvent(async (payload: SendEmailInput) => {
    enqueueMutation({
      id: crypto.randomUUID(),
      type: "send-email",
      payload,
      createdAt: new Date().toISOString(),
      attempts: 0,
      lastError: ""
    });
    await flushQueueEffect();
  });

  const handleSetup = useEffectEvent(async () => {
    setAuthBusy(true);
    setError("");

    try {
      const result = await initializeSystem(setupForm);
      startTransition(() => {
        setSession(result.session);
        setSnapshot(result.snapshot);
        setSystemStatus({ isInitialized: true, companyName: setupForm.companyName });
      });
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Setup failed.");
    } finally {
      setAuthBusy(false);
    }
  });

  const handleLogin = useEffectEvent(async () => {
    setAuthBusy(true);
    setError("");

    try {
      const result = await login(loginForm);
      startTransition(() => {
        setSession(result.session);
        setSnapshot(result.snapshot);
      });
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Login failed.");
    } finally {
      setAuthBusy(false);
    }
  });

  const handleLogout = useEffectEvent(async () => {
    if (session) {
      try {
        await logout(session.token);
      } catch {
        // Ignore remote logout failures and clear local session anyway.
      }
    }

    startTransition(() => {
      setSession(null);
      setSnapshot(null);
      setQueue([]);
    });
    await writeSnapshot(null);
    await writeQueue([]);
  });

  if (statusLoading) {
    return (
      <LoadingScreen
        title="Starting OmniHost"
        subtitle="Loading local cache, system status, and workspace shell."
      />
    );
  }

  if (!systemStatus?.isInitialized) {
    return (
      <SetupScreen
        value={setupForm}
        busy={authBusy}
        error={error}
        onChange={setSetupForm}
        onSubmit={() => void handleSetup()}
      />
    );
  }

  if (!session) {
    return (
      <LoginScreen
        value={loginForm}
        busy={authBusy}
        error={error}
        onChange={setLoginForm}
        onSubmit={() => void handleLogin()}
      />
    );
  }

  if (!snapshot) {
    return (
      <LoadingScreen
        title="Preparing your workspace"
        subtitle="Syncing the latest bookings, rooms, documents, and operations data."
      />
    );
  }

  return (
    <Suspense
      fallback={
        <LoadingScreen
          title="Opening your workspace"
          subtitle="Loading the OmniHost operations suite."
        />
      }
    >
      <AppDashboard
        session={session}
        snapshot={snapshot}
        queue={queue}
        connectivity={connectivity}
        presence={presence}
        error={error}
        availabilityInput={availabilityInput}
        availabilityResults={availabilityResults}
        onAvailabilityChange={setAvailabilityInput}
        onRunAvailability={runAvailability}
        onSaveRoom={saveRoom}
        onSaveBooking={saveBooking}
        onSaveDocument={saveDocument}
        onSendEmail={sendBookingEmail}
        onLogout={handleLogout}
        onError={setError}
      />
    </Suspense>
  );
}
