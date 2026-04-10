import type {
  AuthUser,
  Booking,
  BookingDocument,
  EmailLog,
  GuesthouseProfile,
  Room,
  SelectedPackage
} from "../../shared/domain";

export interface CompanyRow {
  id: string;
  company_name: string;
  guesthouse_name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  currency: string;
  quote_prefix: string;
  invoice_prefix: string;
  created_at: string;
  updated_at: string;
}

export interface UserRow {
  id: string;
  full_name: string;
  username: string;
  email: string;
  role: string;
  password_hash: string;
  password_salt: string;
  password_iterations: number;
  created_at: string;
  updated_at: string;
}

export interface SessionLookupRow {
  expires_at: string;
  user_id: string;
  full_name: string;
  username: string;
  email: string;
  role: string;
}

export interface RoomRow {
  id: string;
  name: string;
  floor: string;
  capacity: number;
  rate: number;
  status: string;
  color: string;
  amenities_json: string;
  package_options_json: string;
  created_at: string;
  updated_at: string;
}

export interface BookingRow {
  id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  room_id: string;
  source: string;
  status: Booking["status"];
  check_in: string;
  check_out: string;
  guests: number;
  nightly_rate: number;
  cleaning_fee: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  selected_packages_json: string;
  special_requests: string;
  internal_notes: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentRow {
  id: string;
  booking_id: string;
  kind: BookingDocument["kind"];
  status: BookingDocument["status"];
  document_number: string;
  recipient_email: string;
  issue_date: string;
  due_date: string;
  currency: string;
  note: string;
  line_items_json: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

export interface EmailLogRow {
  id: string;
  booking_id: string;
  document_id: string | null;
  kind: EmailLog["kind"];
  recipient_email: string;
  subject: string;
  provider_message_id: string;
  status: EmailLog["status"];
  error_message: string;
  sent_at: string;
  updated_at: string;
}

export function nowIso() {
  return new Date().toISOString();
}

export function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function mapCompanyRow(row: CompanyRow): GuesthouseProfile {
  return {
    id: row.id,
    name: row.guesthouse_name,
    tagline: row.tagline,
    address: row.address,
    phone: row.phone,
    email: row.email,
    currency: row.currency,
    quotePrefix: row.quote_prefix,
    invoicePrefix: row.invoice_prefix
  };
}

export function mapUserRow(
  row: Pick<UserRow, "id" | "full_name" | "username" | "email" | "role">
): AuthUser {
  return {
    id: row.id,
    fullName: row.full_name,
    username: row.username,
    email: row.email,
    role: row.role
  };
}

export function mapRoomRow(row: RoomRow): Room {
  return {
    id: row.id,
    name: row.name,
    floor: row.floor,
    capacity: Number(row.capacity),
    rate: Number(row.rate),
    status: row.status,
    color: row.color,
    amenities: parseJson<string[]>(row.amenities_json, []),
    packageOptions: parseJson<Room["packageOptions"]>(row.package_options_json, []),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapBookingRow(row: BookingRow): Booking {
  return {
    id: row.id,
    guestName: row.guest_name,
    guestEmail: row.guest_email,
    guestPhone: row.guest_phone,
    roomId: row.room_id,
    source: row.source,
    status: row.status,
    checkIn: row.check_in,
    checkOut: row.check_out,
    guests: Number(row.guests),
    nightlyRate: Number(row.nightly_rate),
    cleaningFee: Number(row.cleaning_fee),
    taxAmount: Number(row.tax_amount),
    discountAmount: Number(row.discount_amount),
    totalAmount: Number(row.total_amount),
    selectedPackages: parseJson<SelectedPackage[]>(row.selected_packages_json, []),
    specialRequests: row.special_requests,
    internalNotes: row.internal_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapDocumentRow(row: DocumentRow): BookingDocument {
  return {
    id: row.id,
    bookingId: row.booking_id,
    kind: row.kind,
    status: row.status,
    documentNumber: row.document_number,
    recipientEmail: row.recipient_email,
    issueDate: row.issue_date,
    dueDate: row.due_date,
    currency: row.currency,
    note: row.note,
    lineItems: parseJson<BookingDocument["lineItems"]>(row.line_items_json, []),
    subtotal: Number(row.subtotal),
    taxAmount: Number(row.tax_amount),
    discountAmount: Number(row.discount_amount),
    totalAmount: Number(row.total_amount),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapEmailRow(row: EmailLogRow): EmailLog {
  return {
    id: row.id,
    bookingId: row.booking_id,
    documentId: row.document_id,
    kind: row.kind,
    recipientEmail: row.recipient_email,
    subject: row.subject,
    providerMessageId: row.provider_message_id,
    status: row.status,
    errorMessage: row.error_message,
    sentAt: row.sent_at,
    updatedAt: row.updated_at
  };
}

export function normalizeSelectedPackages(
  room: Room,
  selectedPackages: SelectedPackage[],
  nights: number
) {
  const catalog = new Map(room.packageOptions.map((option) => [option.id, option]));

  return selectedPackages
    .filter((selectedPackage) => selectedPackage.quantity > 0)
    .map((selectedPackage) => {
      const catalogOption = catalog.get(selectedPackage.id);
      const pricingMode = catalogOption?.pricingMode ?? selectedPackage.pricingMode;
      const unitPrice = catalogOption?.price ?? selectedPackage.unitPrice;
      const quantity = pricingMode === "perNight" ? nights : selectedPackage.quantity;

      return {
        id: selectedPackage.id,
        name: catalogOption?.name ?? selectedPackage.name,
        pricingMode,
        quantity,
        unitPrice,
        totalPrice: quantity * unitPrice
      };
    });
}

