import MailRoundedIcon from "@mui/icons-material/MailRounded";
import {
  Button,
  Card,
  CardContent,
  Chip,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from "@mui/material";

import type { BookingDocument, GuesthouseSnapshot } from "../../../shared/domain";
import { formatMoney } from "../../../shared/utils";
import { buildFinanceSnapshot } from "../dashboardData";
import { StatCard } from "./StatCard";

interface FinancePanelProps {
  snapshot: GuesthouseSnapshot;
  onEditDocument: (document: BookingDocument) => void;
  onSendDocument: (document: BookingDocument) => void;
}

export function FinancePanel({ onEditDocument, onSendDocument, snapshot }: FinancePanelProps) {
  const finance = buildFinanceSnapshot(snapshot);

  return (
    <Stack spacing={3}>
      <Stack
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 1fr))" },
          gap: 2
        }}
      >
        <StatCard label="Invoices Raised" value={formatMoney(finance.invoicesRaised, snapshot.profile.currency)} helper="Native OmniHost invoices" />
        <StatCard label="Outstanding" value={formatMoney(finance.outstanding, snapshot.profile.currency)} helper="Awaiting settlement" />
        <StatCard label="Open Quotations" value={String(finance.quotationsOpen)} helper="Still in negotiation" />
        <StatCard label="Email Sends" value={String(finance.sentEmails)} helper="Transactional communication" />
      </Stack>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h4">Documents</Typography>
          <Table sx={{ mt: 2 }}>
            <TableHead>
              <TableRow>
                <TableCell>Number</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Recipient</TableCell>
                <TableCell>Total</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {snapshot.documents.map((document) => (
                <TableRow key={document.id}>
                  <TableCell>{document.documentNumber}</TableCell>
                  <TableCell>{document.kind}</TableCell>
                  <TableCell><Chip label={document.status} size="small" /></TableCell>
                  <TableCell>{document.recipientEmail}</TableCell>
                  <TableCell>{formatMoney(document.totalAmount, document.currency)}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
                      <Button size="small" onClick={() => onEditDocument(document)}>Edit</Button>
                      <Link href={`/api/documents/${document.id}/render`} target="_blank" rel="noreferrer" underline="hover">
                        Preview
                      </Link>
                      <Button size="small" startIcon={<MailRoundedIcon />} onClick={() => onSendDocument(document)}>
                        Send
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Stack>
  );
}
