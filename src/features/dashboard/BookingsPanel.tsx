import AddRoundedIcon from "@mui/icons-material/AddRounded";
import MailRoundedIcon from "@mui/icons-material/MailRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import RequestQuoteRoundedIcon from "@mui/icons-material/RequestQuoteRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from "@mui/material";
import { useDeferredValue, useMemo, useState } from "react";

import type { Booking, GuesthouseSnapshot, Room } from "../../../shared/domain";
import { formatMoney } from "../../../shared/utils";

interface BookingsPanelProps {
  snapshot: GuesthouseSnapshot;
  onCreateBooking: (room: Room) => void;
  onEditBooking: (booking: Booking) => void;
  onEditRoom: (room: Room) => void;
  onOpenDocument: (booking: Booking, kind: "quotation" | "invoice") => void;
  onOpenEmail: (booking: Booking, kind: "confirmation" | "quotation" | "invoice") => void;
}

export function BookingsPanel({
  onCreateBooking,
  onEditBooking,
  onEditRoom,
  onOpenDocument,
  onOpenEmail,
  snapshot
}: BookingsPanelProps) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const filteredBookings = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    if (!query) {
      return snapshot.bookings;
    }

    return snapshot.bookings.filter((booking) =>
      [booking.guestName, booking.guestEmail, booking.status, booking.source].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [deferredSearch, snapshot.bookings]);

  return (
    <Stack spacing={3}>
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ justifyContent: "space-between" }}>
            <Stack spacing={0.5}>
              <Typography variant="h4">Bookings Board</Typography>
              <Typography color="text.secondary">
                Manage reservations, confirmations, quotations, and invoices.
              </Typography>
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                label="Search bookings"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <Button
                variant="contained"
                startIcon={<AddRoundedIcon />}
                onClick={() => onCreateBooking(snapshot.rooms[0])}
              >
                New Booking
              </Button>
            </Stack>
          </Stack>
          <Table sx={{ mt: 2 }}>
            <TableHead>
              <TableRow>
                <TableCell>Guest</TableCell>
                <TableCell>Room</TableCell>
                <TableCell>Stay</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Total</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredBookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell>
                    <Typography sx={{ fontWeight: 700 }}>{booking.guestName}</Typography>
                    <Typography color="text.secondary">{booking.guestEmail}</Typography>
                  </TableCell>
                  <TableCell>{snapshot.rooms.find((room) => room.id === booking.roomId)?.name}</TableCell>
                  <TableCell>{booking.checkIn} to {booking.checkOut}</TableCell>
                  <TableCell><Chip label={booking.status} size="small" /></TableCell>
                  <TableCell>{formatMoney(booking.totalAmount, snapshot.profile.currency)}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
                      <Button size="small" onClick={() => onEditBooking(booking)}>Edit</Button>
                      <Button size="small" startIcon={<RequestQuoteRoundedIcon />} onClick={() => onOpenDocument(booking, "quotation")}>Quote</Button>
                      <Button size="small" startIcon={<ReceiptLongRoundedIcon />} onClick={() => onOpenDocument(booking, "invoice")}>Invoice</Button>
                      <Button size="small" startIcon={<MailRoundedIcon />} onClick={() => onOpenEmail(booking, "confirmation")}>Email</Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))", xl: "repeat(3, minmax(0, 1fr))" },
          gap: 2
        }}
      >
        {snapshot.rooms.map((room) => (
          <Card key={room.id}>
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={2} sx={{ justifyContent: "space-between" }}>
                  <Box>
                    <Typography variant="h5">{room.name}</Typography>
                    <Typography color="text.secondary">{room.floor}</Typography>
                  </Box>
                  <Chip label={room.status} size="small" />
                </Stack>
                <Typography>{formatMoney(room.rate, snapshot.profile.currency)} per night</Typography>
                <Typography color="text.secondary">
                  Packages: {room.packageOptions.map((option) => option.name).join(", ")}
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<SettingsRoundedIcon />}
                  onClick={() => onEditRoom(room)}
                >
                  Edit Packages
                </Button>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Stack>
  );
}
