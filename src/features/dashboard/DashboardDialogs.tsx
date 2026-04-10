import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography
} from "@mui/material";

import type {
  Booking,
  GuesthouseSnapshot,
  SendEmailInput,
  UpdateRoomInput,
  UpsertBookingInput,
  UpsertDocumentInput
} from "../../../shared/domain";
import { formatMoney } from "../../../shared/utils";

interface RoomDialogProps {
  value: UpdateRoomInput | null;
  currency: string;
  onClose: () => void;
  onChange: (next: UpdateRoomInput) => void;
  onSubmit: () => Promise<void>;
}

export function RoomDialog({ currency, onChange, onClose, onSubmit, value }: RoomDialogProps) {
  return (
    <Dialog open={Boolean(value)} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit Room Packages</DialogTitle>
      <DialogContent>
        {value ? (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Nightly Rate"
              type="number"
              value={value.rate}
              onChange={(event) => onChange({ ...value, rate: Number(event.target.value) })}
            />
            <TextField
              label="Room Status"
              value={value.status}
              onChange={(event) => onChange({ ...value, status: event.target.value })}
            />
            {value.packageOptions.map((option, index) => (
              <Stack key={option.id} direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  label="Package Name"
                  fullWidth
                  value={option.name}
                  onChange={(event) => {
                    const packageOptions = [...value.packageOptions];
                    packageOptions[index] = { ...option, name: event.target.value };
                    onChange({ ...value, packageOptions });
                  }}
                />
                <TextField
                  label="Description"
                  fullWidth
                  value={option.description}
                  onChange={(event) => {
                    const packageOptions = [...value.packageOptions];
                    packageOptions[index] = { ...option, description: event.target.value };
                    onChange({ ...value, packageOptions });
                  }}
                />
                <TextField
                  label={`Price (${currency})`}
                  type="number"
                  value={option.price}
                  onChange={(event) => {
                    const packageOptions = [...value.packageOptions];
                    packageOptions[index] = { ...option, price: Number(event.target.value) };
                    onChange({ ...value, packageOptions });
                  }}
                />
              </Stack>
            ))}
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => void onSubmit()}>
          Save Room
        </Button>
      </DialogActions>
    </Dialog>
  );
}

interface BookingDialogProps {
  snapshot: GuesthouseSnapshot;
  value: UpsertBookingInput | null;
  onClose: () => void;
  onChange: (next: UpsertBookingInput) => void;
  onSubmit: () => Promise<void>;
}

export function BookingDialog({
  onChange,
  onClose,
  onSubmit,
  snapshot,
  value
}: BookingDialogProps) {
  const packageOptions =
    snapshot.rooms.find((room) => room.id === value?.roomId)?.packageOptions ?? [];

  const updateField = <K extends keyof UpsertBookingInput>(
    key: K,
    nextValue: UpsertBookingInput[K]
  ) => {
    if (!value) return;
    onChange({ ...value, [key]: nextValue });
  };

  const togglePackage = (packageId: string) => {
    if (!value) return;
    const option = packageOptions.find((entry) => entry.id === packageId);
    if (!option) return;

    const exists = value.selectedPackages.some((entry) => entry.id === packageId);
    updateField(
      "selectedPackages",
      exists
        ? value.selectedPackages.filter((entry) => entry.id !== packageId)
        : [
            ...value.selectedPackages,
            {
              id: option.id,
              name: option.name,
              pricingMode: option.pricingMode,
              quantity: 1,
              unitPrice: option.price,
              totalPrice: option.price
            }
          ]
    );
  };

  return (
    <Dialog open={Boolean(value)} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Booking Editor</DialogTitle>
      <DialogContent>
        {value ? (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField fullWidth label="Guest Name" value={value.guestName} onChange={(event) => updateField("guestName", event.target.value)} />
              <TextField fullWidth label="Guest Email" value={value.guestEmail} onChange={(event) => updateField("guestEmail", event.target.value)} />
            </Stack>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField fullWidth label="Phone" value={value.guestPhone} onChange={(event) => updateField("guestPhone", event.target.value)} />
              <TextField fullWidth label="Source" value={value.source} onChange={(event) => updateField("source", event.target.value)} />
            </Stack>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField select fullWidth label="Status" value={value.status} onChange={(event) => updateField("status", event.target.value as Booking["status"])}>
                {["pending", "confirmed", "checked-in", "checked-out", "cancelled"].map((status) => (
                  <MenuItem key={status} value={status}>{status}</MenuItem>
                ))}
              </TextField>
              <TextField select fullWidth label="Room" value={value.roomId} onChange={(event) => updateField("roomId", event.target.value)}>
                {snapshot.rooms.map((room) => (
                  <MenuItem key={room.id} value={room.id}>{room.name}</MenuItem>
                ))}
              </TextField>
            </Stack>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField label="Check In" type="date" slotProps={{ inputLabel: { shrink: true } }} value={value.checkIn} onChange={(event) => updateField("checkIn", event.target.value)} />
              <TextField label="Check Out" type="date" slotProps={{ inputLabel: { shrink: true } }} value={value.checkOut} onChange={(event) => updateField("checkOut", event.target.value)} />
              <TextField label="Guests" type="number" value={value.guests} onChange={(event) => updateField("guests", Number(event.target.value))} />
            </Stack>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField label="Nightly Rate" type="number" value={value.nightlyRate} onChange={(event) => updateField("nightlyRate", Number(event.target.value))} />
              <TextField label="Cleaning Fee" type="number" value={value.cleaningFee} onChange={(event) => updateField("cleaningFee", Number(event.target.value))} />
              <TextField label="Tax" type="number" value={value.taxAmount} onChange={(event) => updateField("taxAmount", Number(event.target.value))} />
            </Stack>
            <Typography variant="subtitle1">Package Selection</Typography>
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
              {packageOptions.map((option) => {
                const active = value.selectedPackages.some((entry) => entry.id === option.id);
                return (
                  <Chip
                    key={option.id}
                    clickable
                    color={active ? "secondary" : "default"}
                    label={`${option.name} · ${formatMoney(option.price, snapshot.profile.currency)}`}
                    onClick={() => togglePackage(option.id)}
                  />
                );
              })}
            </Stack>
            <TextField label="Special Requests" multiline minRows={2} value={value.specialRequests} onChange={(event) => updateField("specialRequests", event.target.value)} />
            <TextField label="Internal Notes" multiline minRows={2} value={value.internalNotes} onChange={(event) => updateField("internalNotes", event.target.value)} />
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => void onSubmit()}>
          Save Booking
        </Button>
      </DialogActions>
    </Dialog>
  );
}

interface DocumentDialogProps {
  value: UpsertDocumentInput | null;
  onClose: () => void;
  onChange: (next: UpsertDocumentInput) => void;
  onSubmit: () => Promise<void>;
}

export function DocumentDialog({ onChange, onClose, onSubmit, value }: DocumentDialogProps) {
  return (
    <Dialog open={Boolean(value)} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{value?.kind === "quotation" ? "Quotation" : "Invoice"} Builder</DialogTitle>
      <DialogContent>
        {value ? (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField fullWidth label="Recipient Email" value={value.recipientEmail} onChange={(event) => onChange({ ...value, recipientEmail: event.target.value })} />
              <TextField select fullWidth label="Status" value={value.status} onChange={(event) => onChange({ ...value, status: event.target.value as UpsertDocumentInput["status"] })}>
                {["draft", "sent", "accepted", "paid", "void"].map((status) => (
                  <MenuItem key={status} value={status}>{status}</MenuItem>
                ))}
              </TextField>
            </Stack>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField label="Issue Date" type="date" slotProps={{ inputLabel: { shrink: true } }} value={value.issueDate} onChange={(event) => onChange({ ...value, issueDate: event.target.value })} />
              <TextField label="Due Date" type="date" slotProps={{ inputLabel: { shrink: true } }} value={value.dueDate} onChange={(event) => onChange({ ...value, dueDate: event.target.value })} />
            </Stack>
            {value.lineItems.map((lineItem, index) => (
              <Stack key={lineItem.id} direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  fullWidth
                  label="Description"
                  value={lineItem.description}
                  onChange={(event) => {
                    const lineItems = [...value.lineItems];
                    lineItems[index] = { ...lineItem, description: event.target.value };
                    onChange({ ...value, lineItems });
                  }}
                />
                <TextField
                  label="Qty"
                  type="number"
                  value={lineItem.quantity}
                  onChange={(event) => {
                    const lineItems = [...value.lineItems];
                    lineItems[index] = { ...lineItem, quantity: Number(event.target.value) };
                    onChange({ ...value, lineItems });
                  }}
                />
                <TextField
                  label="Unit Price"
                  type="number"
                  value={lineItem.unitPrice}
                  onChange={(event) => {
                    const lineItems = [...value.lineItems];
                    lineItems[index] = { ...lineItem, unitPrice: Number(event.target.value) };
                    onChange({ ...value, lineItems });
                  }}
                />
              </Stack>
            ))}
            <Button
              variant="text"
              onClick={() =>
                onChange({
                  ...value,
                  lineItems: [
                    ...value.lineItems,
                    {
                      id: crypto.randomUUID(),
                      description: "Custom line item",
                      quantity: 1,
                      unitPrice: 0,
                      amount: 0
                    }
                  ]
                })
              }
            >
              Add Line Item
            </Button>
            <TextField label="Note" multiline minRows={3} value={value.note} onChange={(event) => onChange({ ...value, note: event.target.value })} />
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => void onSubmit()}>
          Save Document
        </Button>
      </DialogActions>
    </Dialog>
  );
}

interface EmailDialogProps {
  value: SendEmailInput | null;
  onClose: () => void;
  onChange: (next: SendEmailInput) => void;
  onSubmit: () => Promise<void>;
}

export function EmailDialog({ onChange, onClose, onSubmit, value }: EmailDialogProps) {
  return (
    <Dialog open={Boolean(value)} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Send Email</DialogTitle>
      <DialogContent>
        {value ? (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Recipient Email" value={value.recipientEmail} onChange={(event) => onChange({ ...value, recipientEmail: event.target.value })} />
            <TextField
              select
              label="Email Type"
              value={value.kind}
              onChange={(event) => onChange({ ...value, kind: event.target.value as SendEmailInput["kind"] })}
            >
              {["confirmation", "quotation", "invoice"].map((kind) => (
                <MenuItem key={kind} value={kind}>{kind}</MenuItem>
              ))}
            </TextField>
            <TextField label="Message" multiline minRows={4} value={value.message} onChange={(event) => onChange({ ...value, message: event.target.value })} />
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => void onSubmit()}>
          Send Email
        </Button>
      </DialogActions>
    </Dialog>
  );
}
