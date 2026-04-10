import type { AuthUser } from "../../shared/domain";

export interface D1QueryMeta {
  last_row_id?: number | null;
  changes?: number | null;
}

export interface D1QueryResult<T = unknown> {
  results: T[];
  success?: boolean;
  meta?: D1QueryMeta;
}

export interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1QueryResult<T>>;
  run(): Promise<{ success: boolean; meta?: D1QueryMeta }>;
}

export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatementLike;
  batch<T = unknown>(statements: D1PreparedStatementLike[]): Promise<Array<D1QueryResult<T>>>;
}

export interface DurableObjectStubLike {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

export interface DurableObjectNamespaceLike {
  idFromName(name: string): unknown;
  get(id: unknown): DurableObjectStubLike;
}

export interface Env {
  DB: D1DatabaseLike;
  BOOKING_SYNC: DurableObjectNamespaceLike;
  APP_NAME: string;
  APP_TAGLINE: string;
  APP_CURRENCY: string;
  APP_BASE_URL: string;
  EMAIL_PROVIDER?: "mock" | "resend";
  DEFAULT_FROM_EMAIL: string;
  DEFAULT_REPLY_TO_EMAIL: string;
  QUOTE_PREFIX: string;
  INVOICE_PREFIX: string;
  RESEND_API_KEY?: string;
}

export interface AuthorizedSession {
  token: string;
  user: AuthUser;
}

