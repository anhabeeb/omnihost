export type BookingStatus =
  | "pending"
  | "confirmed"
  | "checked-in"
  | "checked-out"
  | "cancelled";

export type DocumentKind = "quotation" | "invoice";
export type DocumentStatus = "draft" | "sent" | "accepted" | "paid" | "void";
export type EmailKind = "confirmation" | "quotation" | "invoice";
export type EmailStatus = "sent" | "failed" | "queued";
export type ConnectivityState = "offline" | "connecting" | "live";

export interface GuesthouseProfile {
  id: string;
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  currency: string;
  quotePrefix: string;
  invoicePrefix: string;
}

export interface PackageOption {
  id: string;
  name: string;
  description: string;
  pricingMode: "perNight" | "perStay" | "custom";
  price: number;
}

export interface SelectedPackage {
  id: string;
  name: string;
  pricingMode: "perNight" | "perStay" | "custom";
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Room {
  id: string;
  name: string;
  floor: string;
  capacity: number;
  rate: number;
  status: string;
  color: string;
  amenities: string[];
  packageOptions: PackageOption[];
  createdAt: string;
  updatedAt: string;
}

export interface UpdateRoomInput {
  id: string;
  rate: number;
  status: string;
  packageOptions: PackageOption[];
}

export interface Booking {
  id: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  roomId: string;
  source: string;
  status: BookingStatus;
  checkIn: string;
  checkOut: string;
  guests: number;
  nightlyRate: number;
  cleaningFee: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  selectedPackages: SelectedPackage[];
  specialRequests: string;
  internalNotes: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface BookingDocument {
  id: string;
  bookingId: string;
  kind: DocumentKind;
  status: DocumentStatus;
  documentNumber: string;
  recipientEmail: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  note: string;
  lineItems: DocumentLineItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface EmailLog {
  id: string;
  bookingId: string;
  documentId: string | null;
  kind: EmailKind;
  recipientEmail: string;
  subject: string;
  providerMessageId: string;
  status: EmailStatus;
  errorMessage: string;
  sentAt: string;
  updatedAt: string;
}

export interface GuesthouseSnapshot {
  profile: GuesthouseProfile;
  rooms: Room[];
  bookings: Booking[];
  documents: BookingDocument[];
  emails: EmailLog[];
  lastSyncAt: string;
  serverTime: string;
}

export interface UpsertBookingInput {
  id: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  roomId: string;
  source: string;
  status: BookingStatus;
  checkIn: string;
  checkOut: string;
  guests: number;
  nightlyRate: number;
  cleaningFee: number;
  taxAmount: number;
  discountAmount: number;
  selectedPackages: SelectedPackage[];
  specialRequests: string;
  internalNotes: string;
}

export interface UpsertDocumentInput {
  id: string;
  bookingId: string;
  kind: DocumentKind;
  status: DocumentStatus;
  recipientEmail: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  note: string;
  lineItems: DocumentLineItem[];
  taxAmount: number;
  discountAmount: number;
}

export interface SendEmailInput {
  bookingId: string;
  kind: EmailKind;
  recipientEmail: string;
  message: string;
  documentId?: string;
}

export interface AvailabilityRequest {
  checkIn: string;
  checkOut: string;
  guests: number;
}

export interface AvailabilityResult {
  room: Room;
  estimate: {
    nights: number;
    baseRate: number;
    packageStartingAt: number;
    totalFrom: number;
  };
}

export type QueueMutationType =
  | "update-room"
  | "upsert-booking"
  | "upsert-document"
  | "send-email";

export interface QueueMutation {
  id: string;
  type: QueueMutationType;
  payload: UpdateRoomInput | UpsertBookingInput | UpsertDocumentInput | SendEmailInput;
  createdAt: string;
  attempts: number;
  lastError: string;
}

export interface SyncEnvelope {
  snapshot: GuesthouseSnapshot;
}

export interface AuthUser {
  id: string;
  fullName: string;
  username: string;
  email: string;
  role: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

export interface SystemStatus {
  isInitialized: boolean;
  companyName?: string;
}

export interface InitializeSystemInput {
  companyName: string;
  guesthouseName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  currency: string;
  quotePrefix: string;
  invoicePrefix: string;
  adminName: string;
  username: string;
  password: string;
}

export interface LoginInput {
  username: string;
  password: string;
}

export interface HeartbeatClientMessage {
  type: "ping";
  clientId: string;
  lastSyncAt: string;
  pendingMutations: number;
}

export interface WelcomeServerMessage {
  type: "welcome";
  serverTime: string;
  activeConnections: number;
}

export interface PongServerMessage {
  type: "pong";
  serverTime: string;
  needsSync: boolean;
  activeConnections: number;
}

export interface BroadcastServerMessage {
  type: "broadcast";
  entity: "booking" | "document" | "email" | "snapshot";
  reason: string;
  serverTime: string;
}

export type SyncServerMessage =
  | WelcomeServerMessage
  | PongServerMessage
  | BroadcastServerMessage;
