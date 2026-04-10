import dayjs from "dayjs";

import type {
  AvailabilityResult,
  Booking,
  BookingDocument,
  DocumentLineItem,
  Room,
  SelectedPackage
} from "./domain";

export function calculateNights(checkIn: string, checkOut: string): number {
  const start = dayjs(checkIn);
  const end = dayjs(checkOut);
  return Math.max(end.diff(start, "day"), 1);
}

export function calculateDocumentSubtotal(lineItems: DocumentLineItem[]): number {
  return lineItems.reduce((sum, item) => sum + item.amount, 0);
}

export function calculateBookingTotal(input: {
  nightlyRate: number;
  nights: number;
  cleaningFee: number;
  taxAmount: number;
  discountAmount: number;
  selectedPackages: SelectedPackage[];
}): number {
  const packageTotal = input.selectedPackages.reduce(
    (sum, selectedPackage) => sum + selectedPackage.totalPrice,
    0
  );

  return (
    input.nightlyRate * input.nights +
    input.cleaningFee +
    input.taxAmount -
    input.discountAmount +
    packageTotal
  );
}

export function sortByUpdatedAtDesc<T extends { updatedAt: string }>(records: T[]): T[] {
  return [...records].sort((left, right) =>
    dayjs(right.updatedAt).valueOf() - dayjs(left.updatedAt).valueOf()
  );
}

export function summarizeOccupancy(rooms: Room[], bookings: Booking[]) {
  const activeStatuses = new Set(["pending", "confirmed", "checked-in"]);
  const activeBookings = bookings.filter((booking) => activeStatuses.has(booking.status));
  const occupiedRoomIds = new Set(activeBookings.map((booking) => booking.roomId));
  const occupied = occupiedRoomIds.size;
  const available = Math.max(rooms.length - occupied, 0);
  const projectedRevenue = activeBookings.reduce(
    (sum, booking) => sum + booking.totalAmount,
    0
  );

  return {
    totalRooms: rooms.length,
    occupied,
    available,
    occupancyRate: rooms.length === 0 ? 0 : occupied / rooms.length,
    projectedRevenue
  };
}

export function createDefaultLineItems(booking: Booking, room: Room | undefined): DocumentLineItem[] {
  const nights = calculateNights(booking.checkIn, booking.checkOut);
  const nightlyRate = booking.nightlyRate || room?.rate || 0;

  return [
    {
      id: crypto.randomUUID(),
      description: `${room?.name ?? "Suite"} stay (${nights} night${nights === 1 ? "" : "s"})`,
      quantity: nights,
      unitPrice: nightlyRate,
      amount: nights * nightlyRate
    },
    {
      id: crypto.randomUUID(),
      description: "Turnover and hospitality prep",
      quantity: 1,
      unitPrice: booking.cleaningFee,
      amount: booking.cleaningFee
    },
    ...booking.selectedPackages.map((selectedPackage) => ({
      id: crypto.randomUUID(),
      description: selectedPackage.name,
      quantity: selectedPackage.quantity,
      unitPrice: selectedPackage.unitPrice,
      amount: selectedPackage.totalPrice
    }))
  ].filter((item) => item.amount > 0);
}

export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(amount);
}

export function findDocumentForBooking(
  documents: BookingDocument[],
  bookingId: string,
  kind: BookingDocument["kind"]
): BookingDocument | undefined {
  return sortByUpdatedAtDesc(
    documents.filter((document) => document.bookingId === bookingId && document.kind === kind)
  )[0];
}

export function estimateRoomAvailability(
  rooms: Room[],
  bookings: Booking[],
  input: { checkIn: string; checkOut: string; guests: number }
): AvailabilityResult[] {
  const nights = calculateNights(input.checkIn, input.checkOut);
  const activeStatuses = new Set(["pending", "confirmed", "checked-in"]);

  return rooms
    .filter((room) => room.capacity >= input.guests)
    .filter((room) =>
      !bookings.some((booking) => {
        if (booking.roomId !== room.id || !activeStatuses.has(booking.status)) {
          return false;
        }

        return !(booking.checkOut <= input.checkIn || booking.checkIn >= input.checkOut);
      })
    )
    .map((room) => {
      const packageStartingAt = room.packageOptions.reduce((lowest, option) => {
        const optionTotal =
          option.pricingMode === "perNight" ? option.price * nights : option.price;
        return Math.min(lowest, optionTotal);
      }, Number.POSITIVE_INFINITY);

      return {
        room,
        estimate: {
          nights,
          baseRate: room.rate,
          packageStartingAt:
            packageStartingAt === Number.POSITIVE_INFINITY ? 0 : packageStartingAt,
          totalFrom: room.rate * nights
        }
      };
    });
}
