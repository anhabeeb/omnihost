import initialSchemaSql from "../../migrations/0001_initial.sql?raw";

import type { Env } from "../lib/env";

let schemaReady = false;
let schemaReadyPromise: Promise<void> | null = null;

export async function ensureSchema(env: Env) {
  if (schemaReady) {
    return;
  }

  if (schemaReadyPromise) {
    return schemaReadyPromise;
  }

  schemaReadyPromise = (async () => {
    const table = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'companies' LIMIT 1"
    ).first<{ name: string }>();

    if (!table) {
      await env.DB.exec(initialSchemaSql);
    }

    schemaReady = true;
  })();

  try {
    await schemaReadyPromise;
  } finally {
    schemaReadyPromise = null;
  }
}

