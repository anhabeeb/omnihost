import { Hono } from "hono";
import { ZodError } from "zod";

import type { AuthSession, InitializeSystemInput, LoginInput, SendEmailInput } from "../shared/domain";
import { BookingSyncHub } from "./durable/BookingSyncHub";
import {
  createEmailLog,
  findAvailability,
  getBookingById,
  getDocumentById,
  getRoomById,
  getSnapshot,
  updateRoom,
  upsertBooking,
  upsertDocument
} from "./data/operations";
import {
  createCompany,
  createUser,
  deleteSession,
  findUserCredentials,
  getSessionByTokenHash,
  getSystemStatus,
  persistSession,
  touchSession,
  getProfile
} from "./data/system";
import { sendTransactionalEmail } from "./email/provider";
import { buildEmailTemplate, renderDocumentPreview } from "./email/templates";
import type { AuthorizedSession, Env } from "./lib/env";
import { AppError } from "./lib/errors";
import { createSessionToken, hashPassword, sha256, verifyPassword } from "./lib/security";
import {
  availabilitySchema,
  bookingSchema,
  documentSchema,
  initializeSystemSchema,
  loginSchema,
  sendEmailSchema,
  updateRoomSchema
} from "./lib/schemas";

type Variables = {
  user: AuthorizedSession["user"];
  token: string;
};

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const publicApiRoutes = new Set([
  "/api/system/status",
  "/api/system/initialize",
  "/api/auth/login"
]);

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.replace("Bearer ", "").trim();
}

async function issueSession(env: Env, user: AuthorizedSession["user"]): Promise<AuthSession> {
  const { token, tokenHash } = await createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await persistSession(env, user.id, tokenHash, expiresAt);
  return { token, user };
}

async function authorizeRequest(env: Env, request: Request): Promise<AuthorizedSession | null> {
  const token = getBearerToken(request);

  if (!token) {
    return null;
  }

  const tokenHash = await sha256(token);
  const session = await getSessionByTokenHash(env, tokenHash);

  if (!session) {
    return null;
  }

  if (session.expiresAt <= new Date().toISOString()) {
    await deleteSession(env, tokenHash);
    return null;
  }

  await touchSession(env, tokenHash);

  return { token, user: session.user };
}

async function parseJsonBody<T>(request: Request): Promise<T> {
  return (await request.json()) as T;
}

async function broadcastMutation(
  env: Env,
  entity: "booking" | "document" | "email" | "snapshot" | "room",
  reason: string
) {
  const id = env.BOOKING_SYNC.idFromName("omnihost-live");
  const stub = env.BOOKING_SYNC.get(id);

  await stub.fetch("https://sync/broadcast", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      entity,
      reason,
      serverTime: new Date().toISOString()
    })
  });
}

app.use("/api/*", async (context, next) => {
  const pathname = new URL(context.req.url).pathname;

  if (publicApiRoutes.has(pathname)) {
    await next();
    return;
  }

  const session = await authorizeRequest(context.env, context.req.raw);

  if (!session) {
    return context.json({ error: "Unauthorized" }, 401);
  }

  context.set("user", session.user);
  context.set("token", session.token);
  await next();
});

app.get("/api/system/status", async (context) => context.json(await getSystemStatus(context.env)));

app.post("/api/system/initialize", async (context) => {
  const status = await getSystemStatus(context.env);

  if (status.isInitialized) {
    throw new AppError(409, "The system has already been initialized.", "already_initialized");
  }

  const input = initializeSystemSchema.parse(
    await parseJsonBody<InitializeSystemInput>(context.req.raw)
  );
  const password = await hashPassword(input.password);

  await createCompany(context.env, input);
  const user = await createUser(context.env, {
    fullName: input.adminName,
    username: input.username,
    email: input.email,
    passwordHash: password.hash,
    passwordSalt: password.salt,
    passwordIterations: password.iterations
  });
  const session = await issueSession(context.env, user);
  const snapshot = await getSnapshot(context.env);

  return context.json({ session, snapshot }, 201);
});

app.post("/api/auth/login", async (context) => {
  const status = await getSystemStatus(context.env);

  if (!status.isInitialized) {
    throw new AppError(409, "Initialize OmniHost before logging in.", "not_initialized");
  }

  const input = loginSchema.parse(await parseJsonBody<LoginInput>(context.req.raw));
  const credentials = await findUserCredentials(context.env, input.username);

  if (!credentials) {
    throw new AppError(401, "Invalid username or password.", "invalid_credentials");
  }

  const isValid = await verifyPassword(
    input.password,
    credentials.password_hash,
    credentials.password_salt,
    Number(credentials.password_iterations)
  );

  if (!isValid) {
    throw new AppError(401, "Invalid username or password.", "invalid_credentials");
  }

  const session = await issueSession(context.env, {
    id: credentials.id,
    fullName: credentials.full_name,
    username: credentials.username,
    email: credentials.email,
    role: credentials.role
  });
  const snapshot = await getSnapshot(context.env);

  return context.json({ session, snapshot });
});

app.post("/api/auth/logout", async (context) => {
  await deleteSession(context.env, await sha256(context.get("token")));
  return context.body(null, 204);
});

app.get("/api/bootstrap", async (context) => context.json(await getSnapshot(context.env)));
app.get("/api/sync", async (context) => context.json(await getSnapshot(context.env)));

app.get("/api/availability", async (context) => {
  const input = availabilitySchema.parse({
    checkIn: context.req.query("checkIn"),
    checkOut: context.req.query("checkOut"),
    guests: context.req.query("guests")
  });

  return context.json(await findAvailability(context.env, input));
});

app.put("/api/rooms/:id", async (context) => {
  const input = updateRoomSchema.parse({
    ...(await parseJsonBody<Record<string, unknown>>(context.req.raw)),
    id: context.req.param("id")
  });
  const room = await updateRoom(context.env, input);
  await broadcastMutation(context.env, "room", "room updated");
  return context.json(room);
});

app.post("/api/bookings", async (context) => {
  const booking = await upsertBooking(
    context.env,
    bookingSchema.parse(await parseJsonBody<Record<string, unknown>>(context.req.raw))
  );
  await broadcastMutation(context.env, "booking", "booking created");
  return context.json(booking, 201);
});

app.put("/api/bookings/:id", async (context) => {
  const booking = await upsertBooking(
    context.env,
    bookingSchema.parse({
      ...(await parseJsonBody<Record<string, unknown>>(context.req.raw)),
      id: context.req.param("id")
    })
  );
  await broadcastMutation(context.env, "booking", "booking updated");
  return context.json(booking);
});

app.post("/api/documents", async (context) => {
  const document = await upsertDocument(
    context.env,
    documentSchema.parse(await parseJsonBody<Record<string, unknown>>(context.req.raw))
  );
  await broadcastMutation(context.env, "document", "document created");
  return context.json(document, 201);
});

app.put("/api/documents/:id", async (context) => {
  const document = await upsertDocument(
    context.env,
    documentSchema.parse({
      ...(await parseJsonBody<Record<string, unknown>>(context.req.raw)),
      id: context.req.param("id")
    })
  );
  await broadcastMutation(context.env, "document", "document updated");
  return context.json(document);
});

app.get("/api/documents/:id/render", async (context) => {
  const document = await getDocumentById(context.env, context.req.param("id"));
  const booking = await getBookingById(context.env, document.bookingId);
  const room = await getRoomById(context.env, booking.roomId);
  const profile = await getProfile(context.env);

  return context.html(renderDocumentPreview({ profile, booking, room, document }));
});

app.post("/api/emails/send", async (context) => {
  const input = sendEmailSchema.parse(await parseJsonBody<SendEmailInput>(context.req.raw));
  const booking = await getBookingById(context.env, input.bookingId);
  const room = await getRoomById(context.env, booking.roomId);
  const profile = await getProfile(context.env);
  const document = input.documentId ? await getDocumentById(context.env, input.documentId) : undefined;
  const email = buildEmailTemplate({
    profile,
    booking,
    room,
    kind: input.kind,
    message: input.message,
    document
  });

  try {
    const result = await sendTransactionalEmail(context.env, {
      to: input.recipientEmail,
      subject: email.subject,
      html: email.html,
      text: email.text
    });
    const log = await createEmailLog(context.env, {
      bookingId: input.bookingId,
      documentId: input.documentId ?? null,
      kind: input.kind,
      recipientEmail: input.recipientEmail,
      subject: email.subject,
      providerMessageId: result.providerMessageId,
      status: "sent",
      errorMessage: "",
      sentAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    await broadcastMutation(context.env, "email", "email sent");
    return context.json(log, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email delivery failed.";
    const log = await createEmailLog(context.env, {
      bookingId: input.bookingId,
      documentId: input.documentId ?? null,
      kind: input.kind,
      recipientEmail: input.recipientEmail,
      subject: email.subject,
      providerMessageId: "",
      status: "failed",
      errorMessage: message,
      sentAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    await broadcastMutation(context.env, "email", "email failed");
    return context.json({ error: message, log }, 502);
  }
});

app.onError((error, context) => {
  if (error instanceof AppError) {
    return new Response(JSON.stringify({ error: error.message, code: error.code }), {
      status: error.status,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }

  if (error instanceof ZodError) {
    return context.json({ error: "Validation failed.", issues: error.flatten() }, 400);
  }

  console.error(error);
  return context.json({ error: "Unexpected server error." }, 500);
});

app.notFound((context) => context.json({ error: "Not found." }, 404));

export { BookingSyncHub };

export default {
  async fetch(request: Request, env: Env, executionContext: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === "/ws/live") {
      const token = url.searchParams.get("token");

      if (!token) {
        return new Response("Unauthorized", { status: 401 });
      }

      const session = await getSessionByTokenHash(env, await sha256(token));

      if (!session || session.expiresAt <= new Date().toISOString()) {
        return new Response("Unauthorized", { status: 401 });
      }

      const id = env.BOOKING_SYNC.idFromName("omnihost-live");
      const stub = env.BOOKING_SYNC.get(id);
      const clientId = url.searchParams.get("clientId") ?? crypto.randomUUID();
      const upstream = new Request(
        `https://sync/connect?clientId=${encodeURIComponent(clientId)}&userId=${encodeURIComponent(session.user.id)}`,
        request
      );

      return stub.fetch(upstream);
    }

    return app.fetch(request, env, executionContext as never);
  }
};
