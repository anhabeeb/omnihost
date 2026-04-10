import type {
  AvailabilityRequest,
  AvailabilityResult,
  Booking,
  BookingDocument,
  EmailLog,
  GuesthouseSnapshot,
  Room,
  UpdateRoomInput,
  UpsertBookingInput,
  UpsertDocumentInput
} from "../../shared/domain";
import {
  calculateBookingTotal,
  calculateDocumentSubtotal,
  calculateNights,
  estimateRoomAvailability,
  sortByUpdatedAtDesc
} from "../../shared/utils";

import { AppError } from "../lib/errors";
import type { Env } from "../lib/env";
import {
  type BookingRow,
  type DocumentRow,
  type EmailLogRow,
  type RoomRow,
  mapBookingRow,
  mapDocumentRow,
  mapEmailRow,
  mapRoomRow,
  normalizeSelectedPackages,
  nowIso
} from "./helpers";
import { getLastSyncAt, getProfile } from "./system";

async function getRoomRow(env: Env, roomId: string) {
  return env.DB.prepare("SELECT * FROM rooms WHERE id = ? LIMIT 1").bind(roomId).first<RoomRow>();
}

async function getBookingRow(env: Env, bookingId: string) {
  return env.DB.prepare("SELECT * FROM bookings WHERE id = ? LIMIT 1").bind(bookingId).first<BookingRow>();
}

async function getDocumentRow(env: Env, documentId: string) {
  return env.DB.prepare("SELECT * FROM documents WHERE id = ? LIMIT 1").bind(documentId).first<DocumentRow>();
}

export async function listRooms(env: Env): Promise<Room[]> {
  const result = await env.DB.prepare("SELECT * FROM rooms ORDER BY rate ASC, name ASC").all<RoomRow>();
  return result.results.map(mapRoomRow);
}

export async function listBookings(env: Env): Promise<Booking[]> {
  const result = await env.DB.prepare("SELECT * FROM bookings ORDER BY check_in ASC, created_at DESC").all<BookingRow>();
  return result.results.map(mapBookingRow);
}

export async function listDocuments(env: Env): Promise<BookingDocument[]> {
  const result = await env.DB.prepare("SELECT * FROM documents ORDER BY updated_at DESC").all<DocumentRow>();
  return result.results.map(mapDocumentRow);
}

export async function listEmailLogs(env: Env): Promise<EmailLog[]> {
  const result = await env.DB.prepare("SELECT * FROM email_logs ORDER BY sent_at DESC").all<EmailLogRow>();
  return result.results.map(mapEmailRow);
}

export async function getSnapshot(env: Env): Promise<GuesthouseSnapshot> {
  const [profile, rooms, bookings, documents, emails, lastSyncAt] = await Promise.all([
    getProfile(env),
    listRooms(env),
    listBookings(env),
    listDocuments(env),
    listEmailLogs(env),
    getLastSyncAt(env)
  ]);

  return {
    profile,
    rooms,
    bookings,
    documents: sortByUpdatedAtDesc(documents),
    emails: sortByUpdatedAtDesc(emails),
    lastSyncAt,
    serverTime: nowIso()
  };
}

export async function findAvailability(env: Env, input: AvailabilityRequest): Promise<AvailabilityResult[]> {
  const [rooms, bookings] = await Promise.all([listRooms(env), listBookings(env)]);
  return estimateRoomAvailability(rooms, bookings, input);
}

export async function updateRoom(env: Env, input: UpdateRoomInput): Promise<Room> {
  const existing = await getRoomRow(env, input.id);

  if (!existing) {
    throw new AppError(404, "Room not found.", "room_not_found");
  }

  await env.DB.prepare(
    "UPDATE rooms SET rate = ?, status = ?, package_options_json = ?, updated_at = ? WHERE id = ?"
  )
    .bind(input.rate, input.status, JSON.stringify(input.packageOptions), nowIso(), input.id)
    .run();

  const room = await getRoomRow(env, input.id);

  if (!room) {
    throw new AppError(500, "Room update failed.", "room_update_failed");
  }

  return mapRoomRow(room);
}

async function assertNoConflict(
  env: Env,
  bookingId: string,
  roomId: string,
  checkIn: string,
  checkOut: string,
  status: Booking["status"]
) {
  if (status === "cancelled" || status === "checked-out") {
    return;
  }

  const row = await env.DB.prepare(
    `
      SELECT id
      FROM bookings
      WHERE room_id = ?
        AND id != ?
        AND status IN (?, ?, ?)
        AND NOT (check_out <= ? OR check_in >= ?)
      LIMIT 1
    `
  )
    .bind(roomId, bookingId, "pending", "confirmed", "checked-in", checkIn, checkOut)
    .first<{ id: string }>();

  if (row) {
    throw new AppError(409, "This room is unavailable for the selected dates.", "booking_conflict");
  }
}

export async function upsertBooking(env: Env, input: UpsertBookingInput): Promise<Booking> {
  const roomRow = await getRoomRow(env, input.roomId);

  if (!roomRow) {
    throw new AppError(404, "Selected room does not exist.", "room_not_found");
  }

  const room = mapRoomRow(roomRow);

  if (input.guests > room.capacity) {
    throw new AppError(
      400,
      `${room.name} supports up to ${room.capacity} guests.`,
      "room_capacity_exceeded"
    );
  }

  await assertNoConflict(env, input.id, input.roomId, input.checkIn, input.checkOut, input.status);

  const existing = await getBookingRow(env, input.id);
  const nights = calculateNights(input.checkIn, input.checkOut);
  const selectedPackages = normalizeSelectedPackages(room, input.selectedPackages, nights);
  const totalAmount = calculateBookingTotal({
    nightlyRate: input.nightlyRate || room.rate,
    nights,
    cleaningFee: input.cleaningFee,
    taxAmount: input.taxAmount,
    discountAmount: input.discountAmount,
    selectedPackages
  });
  const createdAt = existing?.created_at ?? nowIso();
  const updatedAt = nowIso();

  await env.DB.prepare(
    `
      INSERT INTO bookings (
        id, guest_name, guest_email, guest_phone, room_id, source, status,
        check_in, check_out, guests, nightly_rate, cleaning_fee, tax_amount,
        discount_amount, total_amount, selected_packages_json, special_requests,
        internal_notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        guest_name = excluded.guest_name,
        guest_email = excluded.guest_email,
        guest_phone = excluded.guest_phone,
        room_id = excluded.room_id,
        source = excluded.source,
        status = excluded.status,
        check_in = excluded.check_in,
        check_out = excluded.check_out,
        guests = excluded.guests,
        nightly_rate = excluded.nightly_rate,
        cleaning_fee = excluded.cleaning_fee,
        tax_amount = excluded.tax_amount,
        discount_amount = excluded.discount_amount,
        total_amount = excluded.total_amount,
        selected_packages_json = excluded.selected_packages_json,
        special_requests = excluded.special_requests,
        internal_notes = excluded.internal_notes,
        updated_at = excluded.updated_at
    `
  )
    .bind(
      input.id,
      input.guestName,
      input.guestEmail,
      input.guestPhone,
      input.roomId,
      input.source,
      input.status,
      input.checkIn,
      input.checkOut,
      input.guests,
      input.nightlyRate || room.rate,
      input.cleaningFee,
      input.taxAmount,
      input.discountAmount,
      totalAmount,
      JSON.stringify(selectedPackages),
      input.specialRequests,
      input.internalNotes,
      createdAt,
      updatedAt
    )
    .run();

  const booking = await getBookingRow(env, input.id);

  if (!booking) {
    throw new AppError(500, "Booking save failed.", "booking_save_failed");
  }

  return mapBookingRow(booking);
}

async function createDocumentNumber(env: Env, kind: BookingDocument["kind"]) {
  const profile = await getProfile(env);
  const row = await env.DB.prepare("SELECT COUNT(*) AS count FROM documents WHERE kind = ?")
    .bind(kind)
    .first<{ count: number }>();
  const prefix = kind === "quotation" ? profile.quotePrefix : profile.invoicePrefix;
  return `${prefix}-${new Date().getUTCFullYear()}-${String(Number(row?.count ?? 0) + 1).padStart(4, "0")}`;
}

export async function upsertDocument(env: Env, input: UpsertDocumentInput): Promise<BookingDocument> {
  const booking = await getBookingRow(env, input.bookingId);

  if (!booking) {
    throw new AppError(404, "Booking not found for this document.", "booking_not_found");
  }

  const existing = await getDocumentRow(env, input.id);
  const lineItems = input.lineItems.map((lineItem) => ({
    ...lineItem,
    amount: lineItem.quantity * lineItem.unitPrice
  }));
  const subtotal = calculateDocumentSubtotal(lineItems);
  const totalAmount = subtotal + input.taxAmount - input.discountAmount;
  const createdAt = existing?.created_at ?? nowIso();
  const updatedAt = nowIso();
  const documentNumber = existing?.document_number ?? (await createDocumentNumber(env, input.kind));

  await env.DB.prepare(
    `
      INSERT INTO documents (
        id, booking_id, kind, status, document_number, recipient_email, issue_date,
        due_date, currency, note, line_items_json, subtotal, tax_amount,
        discount_amount, total_amount, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        booking_id = excluded.booking_id,
        kind = excluded.kind,
        status = excluded.status,
        recipient_email = excluded.recipient_email,
        issue_date = excluded.issue_date,
        due_date = excluded.due_date,
        currency = excluded.currency,
        note = excluded.note,
        line_items_json = excluded.line_items_json,
        subtotal = excluded.subtotal,
        tax_amount = excluded.tax_amount,
        discount_amount = excluded.discount_amount,
        total_amount = excluded.total_amount,
        updated_at = excluded.updated_at
    `
  )
    .bind(
      input.id,
      input.bookingId,
      input.kind,
      input.status,
      documentNumber,
      input.recipientEmail,
      input.issueDate,
      input.dueDate,
      input.currency,
      input.note,
      JSON.stringify(lineItems),
      subtotal,
      input.taxAmount,
      input.discountAmount,
      totalAmount,
      createdAt,
      updatedAt
    )
    .run();

  const document = await getDocumentRow(env, input.id);

  if (!document) {
    throw new AppError(500, "Document save failed.", "document_save_failed");
  }

  return mapDocumentRow(document);
}

export async function createEmailLog(env: Env, input: Omit<EmailLog, "id">): Promise<EmailLog> {
  const id = crypto.randomUUID();

  await env.DB.prepare(
    `
      INSERT INTO email_logs (
        id, booking_id, document_id, kind, recipient_email, subject,
        provider_message_id, status, error_message, sent_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  )
    .bind(
      id,
      input.bookingId,
      input.documentId,
      input.kind,
      input.recipientEmail,
      input.subject,
      input.providerMessageId,
      input.status,
      input.errorMessage,
      input.sentAt,
      input.updatedAt
    )
    .run();

  const row = await env.DB.prepare("SELECT * FROM email_logs WHERE id = ? LIMIT 1")
    .bind(id)
    .first<EmailLogRow>();

  if (!row) {
    throw new AppError(500, "Email log save failed.", "email_log_save_failed");
  }

  return mapEmailRow(row);
}

export async function getBookingById(env: Env, bookingId: string): Promise<Booking> {
  const booking = await getBookingRow(env, bookingId);

  if (!booking) {
    throw new AppError(404, "Booking not found.", "booking_not_found");
  }

  return mapBookingRow(booking);
}

export async function getDocumentById(env: Env, documentId: string): Promise<BookingDocument> {
  const document = await getDocumentRow(env, documentId);

  if (!document) {
    throw new AppError(404, "Document not found.", "document_not_found");
  }

  return mapDocumentRow(document);
}

export async function getRoomById(env: Env, roomId: string): Promise<Room> {
  const room = await getRoomRow(env, roomId);

  if (!room) {
    throw new AppError(404, "Room not found.", "room_not_found");
  }

  return mapRoomRow(room);
}

