import type {
  Booking,
  BookingDocument,
  EmailKind,
  GuesthouseProfile,
  Room
} from "../../shared/domain";
import { formatMoney } from "../../shared/utils";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderPackageList(booking: Booking, currency: string) {
  if (booking.selectedPackages.length === 0) {
    return "<p>No room packages were added to this stay.</p>";
  }

  return `
    <ul style="padding-left:18px;margin:0;">
      ${booking.selectedPackages
        .map(
          (selectedPackage) => `
            <li style="margin-bottom:8px;">
              <strong>${escapeHtml(selectedPackage.name)}</strong>
              <span style="display:block;color:#546579;">
                ${selectedPackage.quantity} x ${formatMoney(selectedPackage.unitPrice, currency)} =
                ${formatMoney(selectedPackage.totalPrice, currency)}
              </span>
            </li>
          `
        )
        .join("")}
    </ul>
  `;
}

function renderDocumentTable(document: BookingDocument) {
  return `
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead>
        <tr style="background:#edf3f7;color:#0f3557;">
          <th style="text-align:left;padding:12px;">Description</th>
          <th style="text-align:right;padding:12px;">Qty</th>
          <th style="text-align:right;padding:12px;">Unit</th>
          <th style="text-align:right;padding:12px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${document.lineItems
          .map(
            (lineItem) => `
              <tr>
                <td style="padding:12px;border-bottom:1px solid #e4e9ef;">${escapeHtml(lineItem.description)}</td>
                <td style="padding:12px;border-bottom:1px solid #e4e9ef;text-align:right;">${lineItem.quantity}</td>
                <td style="padding:12px;border-bottom:1px solid #e4e9ef;text-align:right;">${formatMoney(lineItem.unitPrice, document.currency)}</td>
                <td style="padding:12px;border-bottom:1px solid #e4e9ef;text-align:right;">${formatMoney(lineItem.amount, document.currency)}</td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderDocumentSummary(document: BookingDocument) {
  return `
    <div style="margin-left:auto;max-width:280px;">
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e4e9ef;">
        <span>Subtotal</span>
        <strong>${formatMoney(document.subtotal, document.currency)}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e4e9ef;">
        <span>Tax</span>
        <strong>${formatMoney(document.taxAmount, document.currency)}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e4e9ef;">
        <span>Discount</span>
        <strong>${formatMoney(document.discountAmount, document.currency)}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;padding:12px 0;font-size:16px;color:#0f3557;">
        <span>Total</span>
        <strong>${formatMoney(document.totalAmount, document.currency)}</strong>
      </div>
    </div>
  `;
}

function renderDocumentLayout(input: {
  profile: GuesthouseProfile;
  booking: Booking;
  room: Room;
  document: BookingDocument;
  heading: string;
  helperCopy: string;
  note: string;
}) {
  const { booking, document, helperCopy, heading, note, profile, room } = input;

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(document.documentNumber)} · ${escapeHtml(profile.name)}</title>
      </head>
      <body style="margin:0;background:#f6efe5;font-family:Manrope, Arial, sans-serif;color:#1f2f3a;">
        <main style="max-width:960px;margin:0 auto;padding:40px 20px;">
          <section style="background:#ffffff;border-radius:28px;padding:36px;box-shadow:0 24px 80px rgba(15,53,87,0.12);">
            <div style="display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap;">
              <div>
                <p style="margin:0;color:#d26749;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">${escapeHtml(profile.name)}</p>
                <h1 style="margin:12px 0 8px;font-family:Fraunces, Georgia, serif;font-size:40px;color:#0f3557;">${escapeHtml(heading)}</h1>
                <p style="margin:0;max-width:520px;color:#546579;line-height:1.7;">${escapeHtml(helperCopy)}</p>
              </div>
              <div style="min-width:220px;padding:16px;border-radius:18px;background:#edf3f7;">
                <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:#546579;">Document no.</div>
                <div style="margin-top:8px;font-size:24px;font-weight:800;color:#0f3557;">${escapeHtml(document.documentNumber)}</div>
                <div style="margin-top:12px;color:#546579;">Issued ${escapeHtml(document.issueDate)}</div>
                <div style="color:#546579;">Due ${escapeHtml(document.dueDate)}</div>
              </div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px;margin-top:28px;">
              <div style="padding:20px;border-radius:20px;background:#faf6f0;">
                <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:#546579;">Billed to</div>
                <div style="margin-top:10px;font-weight:700;color:#0f3557;">${escapeHtml(booking.guestName)}</div>
                <div style="color:#546579;">${escapeHtml(document.recipientEmail)}</div>
                <div style="color:#546579;">${escapeHtml(booking.guestPhone)}</div>
              </div>
              <div style="padding:20px;border-radius:20px;background:#faf6f0;">
                <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:#546579;">Stay details</div>
                <div style="margin-top:10px;font-weight:700;color:#0f3557;">${escapeHtml(room.name)}</div>
                <div style="color:#546579;">${escapeHtml(booking.checkIn)} to ${escapeHtml(booking.checkOut)}</div>
                <div style="color:#546579;">${booking.guests} guest${booking.guests === 1 ? "" : "s"}</div>
              </div>
              <div style="padding:20px;border-radius:20px;background:#faf6f0;">
                <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:#546579;">Property</div>
                <div style="margin-top:10px;font-weight:700;color:#0f3557;">${escapeHtml(profile.name)}</div>
                <div style="color:#546579;">${escapeHtml(profile.address)}</div>
                <div style="color:#546579;">${escapeHtml(profile.phone)}</div>
                <div style="color:#546579;">${escapeHtml(profile.email)}</div>
              </div>
            </div>

            <div style="margin-top:28px;">${renderDocumentTable(document)}</div>

            <div style="display:grid;grid-template-columns:2fr 1fr;gap:28px;align-items:start;margin-top:24px;">
              <div style="padding:20px;border-radius:20px;background:#faf6f0;">
                <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:#546579;">Notes</div>
                <p style="margin:12px 0 0;line-height:1.7;color:#385066;">
                  ${escapeHtml(note || document.note || "Thank you for choosing OmniHost.")}
                </p>
              </div>
              ${renderDocumentSummary(document)}
            </div>
          </section>
        </main>
      </body>
    </html>
  `;
}

export function renderDocumentPreview(input: {
  profile: GuesthouseProfile;
  booking: Booking;
  room: Room;
  document: BookingDocument;
}) {
  const heading = input.document.kind === "quotation" ? "Quotation" : "Invoice";
  const helperCopy =
    input.document.kind === "quotation"
      ? "A branded quotation generated directly from OmniHost."
      : "A branded invoice generated directly from OmniHost.";

  return renderDocumentLayout({
    ...input,
    heading,
    helperCopy,
    note: input.document.note
  });
}

export function buildEmailTemplate(input: {
  profile: GuesthouseProfile;
  booking: Booking;
  room: Room;
  kind: EmailKind;
  message: string;
  document?: BookingDocument;
}) {
  const { booking, document, kind, message, profile, room } = input;

  if (kind === "confirmation") {
    return {
      subject: `Booking confirmation for ${booking.guestName} · ${profile.name}`,
      html: `
        <div style="font-family:Manrope, Arial, sans-serif;background:#f6efe5;padding:32px;">
          <div style="max-width:720px;margin:0 auto;background:#ffffff;border-radius:26px;padding:32px;">
            <p style="margin:0;color:#d26749;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Booking confirmed</p>
            <h1 style="font-family:Fraunces, Georgia, serif;color:#0f3557;font-size:34px;margin:14px 0;">${escapeHtml(profile.name)}</h1>
            <p style="color:#385066;line-height:1.7;">${escapeHtml(message || `We are excited to welcome ${booking.guestName} for their stay.`)}</p>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-top:24px;">
              <div style="padding:18px;border-radius:18px;background:#edf3f7;">
                <div style="font-size:12px;text-transform:uppercase;color:#546579;">Room</div>
                <div style="margin-top:8px;font-weight:700;color:#0f3557;">${escapeHtml(room.name)}</div>
                <div style="color:#546579;">${escapeHtml(booking.checkIn)} to ${escapeHtml(booking.checkOut)}</div>
              </div>
              <div style="padding:18px;border-radius:18px;background:#edf3f7;">
                <div style="font-size:12px;text-transform:uppercase;color:#546579;">Reservation total</div>
                <div style="margin-top:8px;font-weight:700;color:#0f3557;">${formatMoney(booking.totalAmount, profile.currency)}</div>
                <div style="color:#546579;">${booking.guests} guest${booking.guests === 1 ? "" : "s"}</div>
              </div>
            </div>
            <div style="margin-top:24px;padding:20px;border-radius:18px;background:#faf6f0;">
              <div style="font-size:12px;text-transform:uppercase;color:#546579;">Packages</div>
              <div style="margin-top:12px;">${renderPackageList(booking, profile.currency)}</div>
            </div>
          </div>
        </div>
      `,
      text: `${profile.name} booking confirmation\nRoom: ${room.name}\nStay: ${booking.checkIn} to ${booking.checkOut}\nTotal: ${formatMoney(booking.totalAmount, profile.currency)}\n${message}`
    };
  }

  if (!document) {
    throw new Error("Document email requested without a document.");
  }

  return {
    subject: `${document.kind === "quotation" ? "Quotation" : "Invoice"} ${document.documentNumber} · ${profile.name}`,
    html: renderDocumentLayout({
      profile,
      booking,
      room,
      document,
      heading: document.kind === "quotation" ? "Quotation" : "Invoice",
      helperCopy: message || `Please find your ${document.kind} from OmniHost below.`,
      note: message || document.note
    }),
    text: `${profile.name}\n${document.kind === "quotation" ? "Quotation" : "Invoice"} ${document.documentNumber}\nGuest: ${booking.guestName}\nRoom: ${room.name}\nTotal: ${formatMoney(document.totalAmount, document.currency)}\n${message || document.note}`
  };
}

