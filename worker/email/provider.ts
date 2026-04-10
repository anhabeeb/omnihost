import { AppError } from "../lib/errors";
import type { Env } from "../lib/env";

export interface OutboundEmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendTransactionalEmail(
  env: Env,
  payload: OutboundEmailPayload
): Promise<{ providerMessageId: string }> {
  if (env.EMAIL_PROVIDER === "resend") {
    if (!env.RESEND_API_KEY) {
      throw new AppError(500, "Missing RESEND_API_KEY for email delivery.", "missing_email_key");
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: env.DEFAULT_FROM_EMAIL,
        reply_to: env.DEFAULT_REPLY_TO_EMAIL,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text
      })
    });

    if (!response.ok) {
      throw new AppError(
        502,
        `Email provider rejected the request: ${await response.text()}`,
        "email_provider_failed"
      );
    }

    const data = (await response.json()) as { id?: string };

    return {
      providerMessageId: data.id ?? crypto.randomUUID()
    };
  }

  return {
    providerMessageId: `mock-${crypto.randomUUID()}`
  };
}

