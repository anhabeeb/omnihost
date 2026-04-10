import { z } from "zod";

const packageOptionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  pricingMode: z.enum(["perNight", "perStay", "custom"]),
  price: z.coerce.number().min(0)
});

const selectedPackageSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  pricingMode: z.enum(["perNight", "perStay", "custom"]),
  quantity: z.coerce.number().int().positive().max(90),
  unitPrice: z.coerce.number().min(0),
  totalPrice: z.coerce.number().min(0).optional().default(0)
});

const lineItemSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(2),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0),
  amount: z.coerce.number().min(0).optional().default(0)
});

export const initializeSystemSchema = z.object({
  companyName: z.string().min(2),
  guesthouseName: z.string().min(2),
  tagline: z.string().min(2),
  address: z.string().min(5),
  phone: z.string().min(5),
  email: z.string().email(),
  currency: z.string().min(3).max(3),
  quotePrefix: z.string().min(2).max(6),
  invoicePrefix: z.string().min(2).max(6),
  adminName: z.string().min(2),
  username: z.string().min(3),
  password: z.string().min(8)
});

export const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(8)
});

export const availabilitySchema = z
  .object({
    checkIn: z.string().min(1),
    checkOut: z.string().min(1),
    guests: z.coerce.number().int().positive().max(12)
  })
  .refine((value) => value.checkOut > value.checkIn, {
    path: ["checkOut"],
    message: "Check-out must be after check-in."
  });

export const updateRoomSchema = z.object({
  id: z.string().min(1),
  rate: z.coerce.number().positive(),
  status: z.string().min(2),
  packageOptions: z.array(packageOptionSchema).max(12)
});

export const bookingSchema = z
  .object({
    id: z.string().min(1),
    guestName: z.string().min(2),
    guestEmail: z.string().email(),
    guestPhone: z.string().min(5),
    roomId: z.string().min(1),
    source: z.string().min(2),
    status: z.enum(["pending", "confirmed", "checked-in", "checked-out", "cancelled"]),
    checkIn: z.string().min(1),
    checkOut: z.string().min(1),
    guests: z.coerce.number().int().positive().max(12),
    nightlyRate: z.coerce.number().min(0),
    cleaningFee: z.coerce.number().min(0),
    taxAmount: z.coerce.number().min(0),
    discountAmount: z.coerce.number().min(0),
    selectedPackages: z.array(selectedPackageSchema).default([]),
    specialRequests: z.string().max(2000).default(""),
    internalNotes: z.string().max(2000).default("")
  })
  .refine((value) => value.checkOut > value.checkIn, {
    path: ["checkOut"],
    message: "Check-out must be after check-in."
  });

export const documentSchema = z.object({
  id: z.string().min(1),
  bookingId: z.string().min(1),
  kind: z.enum(["quotation", "invoice"]),
  status: z.enum(["draft", "sent", "accepted", "paid", "void"]),
  recipientEmail: z.string().email(),
  issueDate: z.string().min(1),
  dueDate: z.string().min(1),
  currency: z.string().min(3).max(3),
  note: z.string().max(4000).default(""),
  lineItems: z.array(lineItemSchema).min(1).max(30),
  taxAmount: z.coerce.number().min(0),
  discountAmount: z.coerce.number().min(0)
});

export const sendEmailSchema = z.object({
  bookingId: z.string().min(1),
  kind: z.enum(["confirmation", "quotation", "invoice"]),
  recipientEmail: z.string().email(),
  message: z.string().max(4000).default(""),
  documentId: z.string().min(1).optional()
});

