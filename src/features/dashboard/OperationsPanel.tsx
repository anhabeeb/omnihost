import {
  Box,
  Card,
  CardContent,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from "@mui/material";

import type { GuesthouseSnapshot } from "../../../shared/domain";
import { formatMoney } from "../../../shared/utils";
import { buildGuestProfiles, buildHousekeeping } from "../dashboardData";

interface OperationsPanelProps {
  snapshot: GuesthouseSnapshot;
}

export function OperationsPanel({ snapshot }: OperationsPanelProps) {
  const housekeeping = buildHousekeeping(snapshot);
  const guestProfiles = buildGuestProfiles(snapshot.bookings);

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 2 }}>
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h4">Housekeeping</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Arrival prep, turnover, and departure follow-up based on live bookings.
          </Typography>
          <Stack spacing={1.5}>
            {housekeeping.map((entry) => (
              <Box key={entry.booking.id}>
                <Typography sx={{ fontWeight: 700 }}>{entry.task} · {entry.room?.name ?? "Room"}</Typography>
                <Typography color="text.secondary">
                  {entry.booking.guestName} · {entry.booking.checkIn} to {entry.booking.checkOut}
                </Typography>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h4">Guest CRM</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Repeat-stay profiles generated from booking history.
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Guest</TableCell>
                <TableCell>Stays</TableCell>
                <TableCell>Revenue</TableCell>
                <TableCell>Last Stay</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {guestProfiles.slice(0, 8).map((guest) => (
                <TableRow key={guest.email}>
                  <TableCell>
                    <Typography sx={{ fontWeight: 700 }}>{guest.name}</Typography>
                    <Typography color="text.secondary">{guest.email}</Typography>
                  </TableCell>
                  <TableCell>{guest.stays}</TableCell>
                  <TableCell>{formatMoney(guest.revenue, snapshot.profile.currency)}</TableCell>
                  <TableCell>{guest.lastStay}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Box>
  );
}
