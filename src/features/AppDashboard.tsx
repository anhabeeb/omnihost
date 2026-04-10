import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { Alert, Box, Button, Card, Chip, Stack, Tab, Tabs, Typography } from "@mui/material";
import { useState } from "react";

import type {
  AuthSession,
  AvailabilityRequest,
  AvailabilityResult,
  Booking,
  BookingDocument,
  ConnectivityState,
  GuesthouseSnapshot,
  QueueMutation,
  Room,
  SendEmailInput,
  UpdateRoomInput,
  UpsertBookingInput,
  UpsertDocumentInput
} from "../../shared/domain";
import { BookingsPanel } from "./dashboard/BookingsPanel";
import { ControlPanel } from "./dashboard/ControlPanel";
import { BookingDialog, DocumentDialog, EmailDialog, RoomDialog } from "./dashboard/DashboardDialogs";
import { FinancePanel } from "./dashboard/FinancePanel";
import { OverviewPanel } from "./dashboard/OverviewPanel";
import { OperationsPanel } from "./dashboard/OperationsPanel";
import { createBookingDraft, createDocumentDraft, createRoomDraft } from "./dashboardData";

interface AppDashboardProps {
  session: AuthSession;
  snapshot: GuesthouseSnapshot;
  queue: QueueMutation[];
  connectivity: ConnectivityState;
  presence: number;
  availabilityInput: AvailabilityRequest;
  availabilityResults: AvailabilityResult[];
  error: string;
  onAvailabilityChange: (next: AvailabilityRequest) => void;
  onRunAvailability: () => Promise<void>;
  onSaveRoom: (payload: UpdateRoomInput) => Promise<void>;
  onSaveBooking: (payload: UpsertBookingInput) => Promise<void>;
  onSaveDocument: (payload: UpsertDocumentInput) => Promise<void>;
  onSendEmail: (payload: SendEmailInput) => Promise<void>;
  onLogout: () => Promise<void>;
  onError: (message: string) => void;
}

export function AppDashboard(props: AppDashboardProps) {
  const {
    availabilityInput,
    availabilityResults,
    connectivity,
    error,
    onAvailabilityChange,
    onError,
    onLogout,
    onRunAvailability,
    onSaveBooking,
    onSaveDocument,
    onSaveRoom,
    onSendEmail,
    presence,
    queue,
    session,
    snapshot
  } = props;
  const [tab, setTab] = useState(0);
  const [roomDialog, setRoomDialog] = useState<UpdateRoomInput | null>(null);
  const [bookingDialog, setBookingDialog] = useState<UpsertBookingInput | null>(null);
  const [documentDialog, setDocumentDialog] = useState<UpsertDocumentInput | null>(null);
  const [emailDialog, setEmailDialog] = useState<SendEmailInput | null>(null);

  const openDocument = (booking: Booking, kind: "quotation" | "invoice") => {
    setDocumentDialog(createDocumentDraft(snapshot, booking, kind));
  };

  const openDocumentEmail = (document: BookingDocument) => {
    setEmailDialog({
      bookingId: document.bookingId,
      kind: document.kind,
      recipientEmail: document.recipientEmail,
      message: `Please review your ${document.kind} from ${snapshot.profile.name}.`,
      documentId: document.id
    });
  };

  const editDocument = (document: BookingDocument) => {
    setDocumentDialog({
      id: document.id,
      bookingId: document.bookingId,
      kind: document.kind,
      status: document.status,
      recipientEmail: document.recipientEmail,
      issueDate: document.issueDate,
      dueDate: document.dueDate,
      currency: document.currency,
      note: document.note,
      lineItems: document.lineItems,
      taxAmount: document.taxAmount,
      discountAmount: document.discountAmount
    });
  };

  const openBookingEmail = (booking: Booking, kind: SendEmailInput["kind"]) => {
    setEmailDialog({
      bookingId: booking.id,
      kind,
      recipientEmail: booking.guestEmail,
      message:
        kind === "confirmation"
          ? `Your stay with ${snapshot.profile.name} is confirmed.`
          : `Please review your ${kind} from ${snapshot.profile.name}.`,
      documentId:
        kind === "confirmation"
          ? undefined
          : snapshot.documents.find(
              (document) => document.bookingId === booking.id && document.kind === kind
            )?.id
    });
  };

  return (
    <Box sx={{ minHeight: "100vh", p: { xs: 2, md: 3.5 } }}>
      <Stack spacing={3}>
        <Card sx={{ overflow: "hidden" }}>
          <Box
            sx={{
              p: { xs: 3, md: 4 },
              background:
                "linear-gradient(135deg, rgba(15,53,87,1) 0%, rgba(45,106,142,1) 48%, rgba(210,103,73,1) 100%)",
              color: "common.white"
            }}
          >
            <Stack direction={{ xs: "column", md: "row" }} spacing={3} sx={{ justifyContent: "space-between" }}>
              <Stack spacing={1.5}>
                <Chip label={snapshot.profile.name} color="secondary" sx={{ alignSelf: "flex-start" }} />
                <Typography variant="h2">One live control center for the entire guesthouse.</Typography>
                <Typography sx={{ opacity: 0.85, maxWidth: 760 }}>
                  OmniHost brings bookings, room packages, quotations, invoices, housekeeping,
                  CRM, finance, compliance, and realtime sync into one responsive workspace.
                </Typography>
              </Stack>
              <Stack spacing={1.5} sx={{ alignItems: { xs: "flex-start", md: "flex-end" } }}>
                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <Chip
                    label={connectivity === "live" ? "Realtime Live" : connectivity === "connecting" ? "Connecting" : "Offline"}
                    color={connectivity === "live" ? "success" : connectivity === "connecting" ? "warning" : "default"}
                  />
                  <Chip label={`${queue.length} queued`} color={queue.length ? "warning" : "default"} />
                  <Chip label={`${presence} active`} color="primary" />
                </Stack>
                <Typography sx={{ opacity: 0.82 }}>Signed in as {session.user.fullName}</Typography>
                <Button
                  color="inherit"
                  variant="outlined"
                  startIcon={<LogoutRoundedIcon />}
                  onClick={() => void onLogout()}
                  sx={{ borderColor: "rgba(255,255,255,0.36)", color: "inherit" }}
                >
                  Log Out
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Card>

        {error ? <Alert severity="error">{error}</Alert> : null}

        <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" allowScrollButtonsMobile>
          <Tab label="Overview" />
          <Tab label="Bookings" />
          <Tab label="Operations" />
          <Tab label="Finance" />
          <Tab label="Control" />
        </Tabs>

        {tab === 0 ? (
          <OverviewPanel
            snapshot={snapshot}
            availabilityInput={availabilityInput}
            availabilityResults={availabilityResults}
            onAvailabilityChange={onAvailabilityChange}
            onRunAvailability={onRunAvailability}
          />
        ) : null}

        {tab === 1 ? (
          <BookingsPanel
            snapshot={snapshot}
            onCreateBooking={(room: Room) => setBookingDialog(createBookingDraft(room))}
            onEditBooking={(booking) => setBookingDialog({ ...booking })}
            onEditRoom={(room) => setRoomDialog(createRoomDraft(room))}
            onOpenDocument={openDocument}
            onOpenEmail={openBookingEmail}
          />
        ) : null}

        {tab === 2 ? <OperationsPanel snapshot={snapshot} /> : null}
        {tab === 3 ? (
          <FinancePanel
            snapshot={snapshot}
            onEditDocument={editDocument}
            onSendDocument={openDocumentEmail}
          />
        ) : null}
        {tab === 4 ? <ControlPanel snapshot={snapshot} queue={queue} /> : null}

        <RoomDialog
          value={roomDialog}
          currency={snapshot.profile.currency}
          onClose={() => setRoomDialog(null)}
          onChange={setRoomDialog}
          onSubmit={async () => {
            if (!roomDialog) return;
            try {
              await onSaveRoom(roomDialog);
              setRoomDialog(null);
            } catch (error) {
              onError(error instanceof Error ? error.message : "Room save failed.");
            }
          }}
        />

        <BookingDialog
          value={bookingDialog}
          snapshot={snapshot}
          onClose={() => setBookingDialog(null)}
          onChange={setBookingDialog}
          onSubmit={async () => {
            if (!bookingDialog) return;
            try {
              await onSaveBooking(bookingDialog);
              setBookingDialog(null);
            } catch (error) {
              onError(error instanceof Error ? error.message : "Booking save failed.");
            }
          }}
        />

        <DocumentDialog
          value={documentDialog}
          onClose={() => setDocumentDialog(null)}
          onChange={setDocumentDialog}
          onSubmit={async () => {
            if (!documentDialog) return;
            try {
              await onSaveDocument(documentDialog);
              setDocumentDialog(null);
            } catch (error) {
              onError(error instanceof Error ? error.message : "Document save failed.");
            }
          }}
        />

        <EmailDialog
          value={emailDialog}
          onClose={() => setEmailDialog(null)}
          onChange={setEmailDialog}
          onSubmit={async () => {
            if (!emailDialog) return;
            try {
              await onSendEmail(emailDialog);
              setEmailDialog(null);
            } catch (error) {
              onError(error instanceof Error ? error.message : "Email send failed.");
            }
          }}
        />
      </Stack>
    </Box>
  );
}
