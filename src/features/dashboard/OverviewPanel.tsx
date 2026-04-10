import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from "@mui/material";

import type { AvailabilityRequest, AvailabilityResult, GuesthouseSnapshot } from "../../../shared/domain";
import { formatMoney } from "../../../shared/utils";
import { buildRecentActivity, buildReporting } from "../dashboardData";
import { StatCard } from "./StatCard";

interface OverviewPanelProps {
  snapshot: GuesthouseSnapshot;
  availabilityInput: AvailabilityRequest;
  availabilityResults: AvailabilityResult[];
  onAvailabilityChange: (next: AvailabilityRequest) => void;
  onRunAvailability: () => Promise<void>;
}

export function OverviewPanel({
  availabilityInput,
  availabilityResults,
  onAvailabilityChange,
  onRunAvailability,
  snapshot
}: OverviewPanelProps) {
  const reporting = buildReporting(snapshot);
  const recentActivity = buildRecentActivity(snapshot);

  return (
    <Stack spacing={3}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 1fr))" },
          gap: 2
        }}
      >
        <StatCard
          label="Occupancy"
          value={`${Math.round(reporting.occupancy.occupancyRate * 100)}%`}
          helper={`${reporting.occupancy.occupied} rooms occupied`}
        />
        <StatCard
          label="Projected Revenue"
          value={formatMoney(reporting.occupancy.projectedRevenue, snapshot.profile.currency)}
          helper="Active bookings + package pricing"
        />
        <StatCard
          label="Booking Sources"
          value={String(reporting.bookingSources.length || 1)}
          helper="Distribution and direct demand"
        />
        <StatCard
          label="Package Uptake"
          value={String(reporting.packageUptake)}
          helper="Board plans and custom offers"
        />
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1.25fr 0.75fr" },
          gap: 2
        }}
      >
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="h4">Availability Calculator</Typography>
                  <Typography color="text.secondary">
                    Search available rooms and instant package-ready pricing.
                  </Typography>
                </Box>
                <Button variant="contained" onClick={() => void onRunAvailability()}>
                  Refresh Availability
                </Button>
              </Stack>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
                  gap: 2
                }}
              >
                <TextField
                  label="Check In"
                  type="date"
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={availabilityInput.checkIn}
                  onChange={(event) =>
                    onAvailabilityChange({ ...availabilityInput, checkIn: event.target.value })
                  }
                />
                <TextField
                  label="Check Out"
                  type="date"
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={availabilityInput.checkOut}
                  onChange={(event) =>
                    onAvailabilityChange({ ...availabilityInput, checkOut: event.target.value })
                  }
                />
                <TextField
                  label="Guests"
                  type="number"
                  value={availabilityInput.guests}
                  onChange={(event) =>
                    onAvailabilityChange({
                      ...availabilityInput,
                      guests: Number(event.target.value)
                    })
                  }
                />
              </Box>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Room</TableCell>
                    <TableCell>Nights</TableCell>
                    <TableCell>Base Rate</TableCell>
                    <TableCell>Packages From</TableCell>
                    <TableCell>Total From</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {availabilityResults.map((result) => (
                    <TableRow key={result.room.id}>
                      <TableCell>{result.room.name}</TableCell>
                      <TableCell>{result.estimate.nights}</TableCell>
                      <TableCell>{formatMoney(result.estimate.baseRate, snapshot.profile.currency)}</TableCell>
                      <TableCell>{formatMoney(result.estimate.packageStartingAt, snapshot.profile.currency)}</TableCell>
                      <TableCell>{formatMoney(result.estimate.totalFrom, snapshot.profile.currency)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Typography variant="h4">Recent Activity</Typography>
              {recentActivity.map((activity) => (
                <Box key={activity.id}>
                  <Typography sx={{ fontWeight: 700 }}>{activity.label}</Typography>
                  <Typography color="text.secondary">{activity.timestamp}</Typography>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Stack>
  );
}
