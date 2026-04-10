import type {
  AvailabilityRequest,
  AuthSession,
  GuesthouseSnapshot,
  InitializeSystemInput,
  LoginInput,
  QueueMutation,
  SendEmailInput,
  SystemStatus,
  UpdateRoomInput,
  UpsertBookingInput,
  UpsertDocumentInput
} from "../../shared/domain";

async function request<T>(path: string, init?: RequestInit, token?: string): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | {
          error?: string;
          issues?: {
            fieldErrors?: Record<string, string[] | undefined>;
            formErrors?: string[];
          };
        }
      | null;

    const fieldErrors = body?.issues?.fieldErrors
      ? Object.entries(body.issues.fieldErrors)
          .flatMap(([field, messages]) =>
            (messages ?? []).map((message) => `${field}: ${message}`)
          )
      : [];
    const formErrors = body?.issues?.formErrors ?? [];
    const details = [...fieldErrors, ...formErrors].filter(Boolean).join(" | ");

    throw new Error(
      details ? `${body?.error ?? `Request failed: ${response.status}`} ${details}` : body?.error ?? `Request failed: ${response.status}`
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function getSystemStatus() {
  return request<SystemStatus>("/api/system/status");
}

export function initializeSystem(payload: InitializeSystemInput) {
  return request<{ session: AuthSession; snapshot: GuesthouseSnapshot }>(
    "/api/system/initialize",
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );
}

export function login(payload: LoginInput) {
  return request<{ session: AuthSession; snapshot: GuesthouseSnapshot }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function logout(token: string) {
  return request<void>("/api/auth/logout", { method: "POST" }, token);
}

export function getSnapshot(token: string) {
  return request<GuesthouseSnapshot>("/api/bootstrap", undefined, token);
}

export function getAvailability(token: string, input: AvailabilityRequest) {
  const search = new URLSearchParams({
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    guests: String(input.guests)
  });
  return request<unknown[]>(`/api/availability?${search.toString()}`, undefined, token);
}

export function saveRoom(token: string, payload: UpdateRoomInput) {
  return request(`/api/rooms/${payload.id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  }, token);
}

export function saveBooking(token: string, payload: UpsertBookingInput) {
  const method = payload.id ? "PUT" : "POST";
  const path = method === "POST" ? "/api/bookings" : `/api/bookings/${payload.id}`;
  return request(path, {
    method,
    body: JSON.stringify(payload)
  }, token);
}

export function saveDocument(token: string, payload: UpsertDocumentInput) {
  const method = payload.id ? "PUT" : "POST";
  const path = method === "POST" ? "/api/documents" : `/api/documents/${payload.id}`;
  return request(path, {
    method,
    body: JSON.stringify(payload)
  }, token);
}

export function sendEmail(token: string, payload: SendEmailInput) {
  return request("/api/emails/send", {
    method: "POST",
    body: JSON.stringify(payload)
  }, token);
}

export function flushMutation(token: string, mutation: QueueMutation) {
  switch (mutation.type) {
    case "update-room":
      return saveRoom(token, mutation.payload as UpdateRoomInput);
    case "upsert-booking":
      return saveBooking(token, mutation.payload as UpsertBookingInput);
    case "upsert-document":
      return saveDocument(token, mutation.payload as UpsertDocumentInput);
    case "send-email":
      return sendEmail(token, mutation.payload as SendEmailInput);
    default:
      throw new Error("Unsupported queue mutation.");
  }
}
