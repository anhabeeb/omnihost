import { Card, CardContent, Stack, Typography } from "@mui/material";

interface StatCardProps {
  label: string;
  value: string;
  helper: string;
}

export function StatCard({ helper, label, value }: StatCardProps) {
  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={1}>
          <Typography variant="overline" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="h3">{value}</Typography>
          <Typography color="text.secondary">{helper}</Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

