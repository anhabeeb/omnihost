import { guesthouseProfile } from "../../shared/defaults";
import type {
  AuthUser,
  GuesthouseProfile,
  InitializeSystemInput,
  SystemStatus
} from "../../shared/domain";

import { AppError } from "../lib/errors";
import type { Env } from "../lib/env";
import {
  type CompanyRow,
  type SessionLookupRow,
  type UserRow,
  mapCompanyRow,
  mapUserRow,
  nowIso
} from "./helpers";

async function getCompanyRow(env: Env): Promise<CompanyRow | null> {
  return env.DB.prepare("SELECT * FROM companies ORDER BY created_at ASC LIMIT 1").first<CompanyRow>();
}

export async function getSystemStatus(env: Env): Promise<SystemStatus> {
  const company = await getCompanyRow(env);

  if (!company) {
    return { isInitialized: false };
  }

  return {
    isInitialized: true,
    companyName: company.company_name
  };
}

export async function getProfile(env: Env): Promise<GuesthouseProfile> {
  const company = await getCompanyRow(env);
  return company ? mapCompanyRow(company) : guesthouseProfile;
}

export async function createCompany(env: Env, input: InitializeSystemInput) {
  const timestamp = nowIso();

  await env.DB.prepare(
    `
      INSERT INTO companies (
        id,
        company_name,
        guesthouse_name,
        tagline,
        address,
        phone,
        email,
        currency,
        quote_prefix,
        invoice_prefix,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  )
    .bind(
      "company-main",
      input.companyName,
      input.guesthouseName,
      input.tagline,
      input.address,
      input.phone,
      input.email,
      input.currency.toUpperCase(),
      input.quotePrefix.toUpperCase(),
      input.invoicePrefix.toUpperCase(),
      timestamp,
      timestamp
    )
    .run();

  const company = await getCompanyRow(env);

  if (!company) {
    throw new AppError(500, "Company bootstrap failed.", "company_bootstrap_failed");
  }

  return mapCompanyRow(company);
}

export async function createUser(
  env: Env,
  input: {
    fullName: string;
    username: string;
    email: string;
    passwordHash: string;
    passwordSalt: string;
    passwordIterations: number;
  }
): Promise<AuthUser> {
  const id = crypto.randomUUID();
  const timestamp = nowIso();

  await env.DB.prepare(
    `
      INSERT INTO users (
        id,
        full_name,
        username,
        email,
        role,
        password_hash,
        password_salt,
        password_iterations,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  )
    .bind(
      id,
      input.fullName,
      input.username.toLowerCase(),
      input.email,
      "owner",
      input.passwordHash,
      input.passwordSalt,
      input.passwordIterations,
      timestamp,
      timestamp
    )
    .run();

  const row = await env.DB.prepare(
    "SELECT id, full_name, username, email, role FROM users WHERE id = ? LIMIT 1"
  )
    .bind(id)
    .first<Pick<UserRow, "id" | "full_name" | "username" | "email" | "role">>();

  if (!row) {
    throw new AppError(500, "Admin bootstrap failed.", "admin_bootstrap_failed");
  }

  return mapUserRow(row);
}

export async function findUserCredentials(env: Env, username: string) {
  return env.DB.prepare("SELECT * FROM users WHERE username = ? LIMIT 1")
    .bind(username.toLowerCase())
    .first<UserRow>();
}

export async function persistSession(
  env: Env,
  userId: string,
  tokenHash: string,
  expiresAt: string
) {
  const timestamp = nowIso();

  await env.DB.prepare(
    `
      INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at, last_seen_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `
  )
    .bind(crypto.randomUUID(), userId, tokenHash, expiresAt, timestamp, timestamp)
    .run();
}

export async function getSessionByTokenHash(env: Env, tokenHash: string) {
  const row = await env.DB.prepare(
    `
      SELECT
        sessions.expires_at,
        users.id AS user_id,
        users.full_name,
        users.username,
        users.email,
        users.role
      FROM sessions
      INNER JOIN users ON users.id = sessions.user_id
      WHERE sessions.token_hash = ?
      LIMIT 1
    `
  )
    .bind(tokenHash)
    .first<SessionLookupRow>();

  if (!row) {
    return null;
  }

  return {
    expiresAt: row.expires_at,
    user: {
      id: row.user_id,
      fullName: row.full_name,
      username: row.username,
      email: row.email,
      role: row.role
    }
  };
}

export async function touchSession(env: Env, tokenHash: string) {
  await env.DB.prepare("UPDATE sessions SET last_seen_at = ? WHERE token_hash = ?")
    .bind(nowIso(), tokenHash)
    .run();
}

export async function deleteSession(env: Env, tokenHash: string) {
  await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
}

export async function getLastSyncAt(env: Env) {
  const row = await env.DB.prepare(
    `
      SELECT MAX(updated_at) AS last_sync_at
      FROM (
        SELECT updated_at FROM companies
        UNION ALL
        SELECT updated_at FROM rooms
        UNION ALL
        SELECT updated_at FROM bookings
        UNION ALL
        SELECT updated_at FROM documents
        UNION ALL
        SELECT updated_at FROM email_logs
      )
    `
  ).first<{ last_sync_at: string | null }>();

  return row?.last_sync_at ?? nowIso();
}

