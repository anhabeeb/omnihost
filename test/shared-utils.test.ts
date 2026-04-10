import type { Booking, Room } from "../shared/domain";
import { calculateBookingTotal, estimateRoomAvailability } from "../shared/utils";
import { describe, expect, it } from "vitest";

describe("calculateBookingTotal", () => {
  it("includes packages and fees in the total", () => {
    expect(
      calculateBookingTotal({
        nightlyRate: 150,
        nights: 2,
        cleaningFee: 20,
        taxAmount: 15,
        discountAmount: 10,
        selectedPackages: [
          {
            id: "pkg-full-board",
            name: "Full Board",
            pricingMode: "perNight",
            quantity: 2,
            unitPrice: 40,
            totalPrice: 80
          }
        ]
      })
    ).toBe(405);
  });
});

describe("estimateRoomAvailability", () => {
  const rooms: Room[] = [
    {
      id: "room-1",
      name: "Coral Courtyard",
      floor: "Garden",
      capacity: 2,
      rate: 120,
      status: "ready",
      color: "#d26749",
      amenities: [],
      packageOptions: [
        {
          id: "pkg-half-board",
          name: "Half Board",
          description: "Breakfast and dinner",
          pricingMode: "perNight",
          price: 30
        }
      ],
      createdAt: "2026-04-10T00:00:00.000Z",
      updatedAt: "2026-04-10T00:00:00.000Z"
    }
  ];

  const bookings: Booking[] = [
    {
      id: "booking-1",
      guestName: "Ava Noor",
      guestEmail: "ava@example.com",
      guestPhone: "+1 555",
      roomId: "room-1",
      source: "Direct",
      status: "confirmed",
      checkIn: "2026-04-12",
      checkOut: "2026-04-14",
      guests: 2,
      nightlyRate: 120,
      cleaningFee: 20,
      taxAmount: 18,
      discountAmount: 0,
      totalAmount: 278,
      selectedPackages: [],
      specialRequests: "",
      internalNotes: "",
      createdAt: "2026-04-10T00:00:00.000Z",
      updatedAt: "2026-04-10T00:00:00.000Z"
    }
  ];

  it("excludes rooms with overlapping active bookings", () => {
    expect(
      estimateRoomAvailability(rooms, bookings, {
        checkIn: "2026-04-13",
        checkOut: "2026-04-15",
        guests: 2
      })
    ).toHaveLength(0);
  });

  it("returns rates for open windows", () => {
    expect(
      estimateRoomAvailability(rooms, bookings, {
        checkIn: "2026-04-15",
        checkOut: "2026-04-17",
        guests: 2
      })[0]?.estimate.totalFrom
    ).toBe(240);
  });
});
