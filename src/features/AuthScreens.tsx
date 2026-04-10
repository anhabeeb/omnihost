import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  TextField,
  Typography
} from "@mui/material";

import type { InitializeSystemInput, LoginInput } from "../../shared/domain";

interface LoadingScreenProps {
  title: string;
  subtitle: string;
}

export function LoadingScreen({ title, subtitle }: LoadingScreenProps) {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        p: 3
      }}
    >
      <Card sx={{ maxWidth: 680, width: "100%" }}>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={2}>
            <Chip label="OmniHost" color="secondary" sx={{ alignSelf: "flex-start" }} />
            <Typography variant="h2">{title}</Typography>
            <Typography color="text.secondary">{subtitle}</Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

interface SetupScreenProps {
  value: InitializeSystemInput;
  busy: boolean;
  error: string;
  onChange: (next: InitializeSystemInput) => void;
  onSubmit: () => void;
}

export function SetupScreen({
  busy,
  error,
  onChange,
  onSubmit,
  value
}: SetupScreenProps) {
  const updateField = <K extends keyof InitializeSystemInput>(
    key: K,
    nextValue: InitializeSystemInput[K]
  ) => {
    onChange({ ...value, [key]: nextValue });
  };

  return (
    <Box sx={{ minHeight: "100vh", p: { xs: 2, md: 4 }, display: "grid", placeItems: "center" }}>
      <Card sx={{ maxWidth: 1080, width: "100%", overflow: "hidden" }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1.15fr 0.85fr" }
          }}
        >
          <Box sx={{ p: { xs: 3, md: 5 } }}>
            <Stack spacing={2} sx={{ mb: 4 }}>
              <Chip label="First Run Setup" color="secondary" sx={{ alignSelf: "flex-start" }} />
              <Typography variant="h2">Launch OmniHost for your guesthouse.</Typography>
              <Typography color="text.secondary">
                If no company is detected, OmniHost starts with a secure initialization flow so
                you can create the property profile, owner account, invoice numbering, and system
                credentials in one step.
              </Typography>
            </Stack>

            {error ? <Alert severity="error">{error}</Alert> : null}

            <Box
              sx={{
                mt: 3,
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
                gap: 2
              }}
            >
              <TextField
                label="Company Name"
                value={value.companyName}
                onChange={(event) => updateField("companyName", event.target.value)}
              />
              <TextField
                label="Guesthouse Name"
                value={value.guesthouseName}
                onChange={(event) => updateField("guesthouseName", event.target.value)}
              />
              <TextField
                label="Tagline"
                value={value.tagline}
                onChange={(event) => updateField("tagline", event.target.value)}
              />
              <TextField
                label="Currency"
                value={value.currency}
                onChange={(event) => updateField("currency", event.target.value.toUpperCase())}
              />
              <TextField
                label="Email"
                value={value.email}
                onChange={(event) => updateField("email", event.target.value)}
              />
              <TextField
                label="Phone"
                value={value.phone}
                onChange={(event) => updateField("phone", event.target.value)}
              />
              <TextField
                label="Quote Prefix"
                value={value.quotePrefix}
                onChange={(event) => updateField("quotePrefix", event.target.value.toUpperCase())}
              />
              <TextField
                label="Invoice Prefix"
                value={value.invoicePrefix}
                onChange={(event) =>
                  updateField("invoicePrefix", event.target.value.toUpperCase())
                }
              />
              <TextField
                label="Admin Name"
                value={value.adminName}
                onChange={(event) => updateField("adminName", event.target.value)}
              />
              <TextField
                label="Username"
                value={value.username}
                onChange={(event) => updateField("username", event.target.value)}
              />
              <TextField
                label="Password"
                type="password"
                value={value.password}
                onChange={(event) => updateField("password", event.target.value)}
              />
              <TextField
                label="Address"
                value={value.address}
                onChange={(event) => updateField("address", event.target.value)}
                multiline
                minRows={2}
              />
            </Box>

            <Button
              variant="contained"
              color="primary"
              size="large"
              sx={{ mt: 3 }}
              disabled={busy}
              onClick={onSubmit}
            >
              {busy ? "Setting Up OmniHost..." : "Initialize OmniHost"}
            </Button>
          </Box>

          <Box
            sx={{
              p: { xs: 3, md: 5 },
              color: "common.white",
              background:
                "linear-gradient(180deg, rgba(15,53,87,1) 0%, rgba(45,106,142,1) 58%, rgba(210,103,73,1) 100%)"
            }}
          >
            <Stack spacing={2}>
              <Typography variant="h3">What comes online immediately</Typography>
              <Typography sx={{ opacity: 0.88 }}>
                Offline-first bookings, availability search, room packages, quotations, invoices,
                booking confirmations, realtime sync, and the professional operating modules you
                asked for.
              </Typography>
              {[
                "Secure password hashing for owner logins",
                "Cloudflare Worker API with websocket heartbeat sync",
                "Room package pricing for full board, half board, and custom offers",
                "Finance, housekeeping, CRM, reporting, and compliance views"
              ].map((feature) => (
                <Card key={feature} sx={{ backgroundColor: "rgba(255,255,255,0.14)", color: "inherit" }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Typography sx={{ fontWeight: 700 }}>{feature}</Typography>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Box>
        </Box>
      </Card>
    </Box>
  );
}

interface LoginScreenProps {
  value: LoginInput;
  busy: boolean;
  error: string;
  onChange: (next: LoginInput) => void;
  onSubmit: () => void;
}

export function LoginScreen({ busy, error, onChange, onSubmit, value }: LoginScreenProps) {
  const updateField = <K extends keyof LoginInput>(key: K, nextValue: LoginInput[K]) => {
    onChange({ ...value, [key]: nextValue });
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 3 }}>
      <Card sx={{ maxWidth: 520, width: "100%" }}>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={2}>
            <Chip label="OmniHost Access" color="secondary" sx={{ alignSelf: "flex-start" }} />
            <Typography variant="h2">Welcome back.</Typography>
            <Typography color="text.secondary">
              Log in with your secured OmniHost account to access operations, finance,
              housekeeping, CRM, and realtime bookings.
            </Typography>
            {error ? <Alert severity="error">{error}</Alert> : null}
            <TextField
              label="Username"
              value={value.username}
              onChange={(event) => updateField("username", event.target.value)}
            />
            <TextField
              label="Password"
              type="password"
              value={value.password}
              onChange={(event) => updateField("password", event.target.value)}
            />
            <Button variant="contained" size="large" disabled={busy} onClick={onSubmit}>
              {busy ? "Signing In..." : "Log In"}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
