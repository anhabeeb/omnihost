import { Box, Card, CardContent, Divider, Stack, Typography } from "@mui/material";

import type { GuesthouseSnapshot, QueueMutation } from "../../../shared/domain";
import { buildControlSummary, buildReporting } from "../dashboardData";

interface ControlPanelProps {
  snapshot: GuesthouseSnapshot;
  queue: QueueMutation[];
}

export function ControlPanel({ queue, snapshot }: ControlPanelProps) {
  const controlSummary = buildControlSummary(snapshot, queue.length, snapshot.emails);
  const reporting = buildReporting(snapshot);

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 2 }}>
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h4">Compliance & Security</Typography>
          <Stack spacing={1.5} sx={{ mt: 2 }}>
            <Typography>Authentication: {controlSummary.authMode}</Typography>
            <Typography>Audit surface: {controlSummary.auditEvents} tracked events</Typography>
            <Typography>Offline queue: {controlSummary.queueDepth} pending mutations</Typography>
            <Typography>Password storage: Worker-side PBKDF2 hashing</Typography>
            <Typography>Realtime sync: websocket heartbeats with REST resync</Typography>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h4">Integrations & Reporting</Typography>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Typography>Provider status: {controlSummary.providerStatus}</Typography>
            <Typography>
              Booking sources: {reporting.bookingSources.map(([source, count]) => `${source} (${count})`).join(", ") || "Direct only"}
            </Typography>
            <Typography>Package uptake count: {reporting.packageUptake}</Typography>
            <Divider />
            {[
              "Payments: provider-ready settlement flow",
              "Channels: OTA sync module placeholder",
              "Observability: Cloudflare Worker logs + alerts",
              "Finance exports: invoice ledger ready for accounting integration"
            ].map((item) => (
              <Typography key={item}>{item}</Typography>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

