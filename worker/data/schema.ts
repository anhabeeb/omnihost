import initialSchemaSql from "../../migrations/0001_initial.sql?raw";

import { AppError } from "../lib/errors";
import type { Env } from "../lib/env";

let schemaReady = false;
let schemaReadyPromise: Promise<void> | null = null;

function splitSqlStatements(sql: string): string[] {
  return sql
    .replace(/^\uFEFF/, "")
    .split(/;\s*(?:\r?\n)+/g)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

export async function ensureSchema(env: Env) {
  if (!env.DB || typeof env.DB.prepare !== "function") {
    throw new AppError(
      500,
      "D1 database binding `DB` is missing. Check your Wrangler D1 configuration and restart the Worker.",
      "db_binding_missing"
    );
  }

  if (schemaReady) {
    return;
  }

  if (schemaReadyPromise) {
    return schemaReadyPromise;
  }

  schemaReadyPromise = (async () => {
    try {
      const table = await env.DB.prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'companies' LIMIT 1"
      ).first<{ name: string }>();

      if (!table) {
        const statements = splitSqlStatements(initialSchemaSql);
        await env.DB.batch(statements.map((statement) => env.DB.prepare(statement)));
      }

      schemaReady = true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown D1 schema bootstrap failure.";
      throw new AppError(
        500,
        `Database bootstrap failed: ${message}`,
        "db_bootstrap_failed"
      );
    }
  })();

  try {
    await schemaReadyPromise;
  } finally {
    schemaReadyPromise = null;
  }
}
