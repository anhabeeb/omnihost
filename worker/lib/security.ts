const encoder = new TextEncoder();

function bytesToBase64(bytes: Uint8Array): string {
  let output = "";

  for (const byte of bytes) {
    output += String.fromCharCode(byte);
  }

  return btoa(output);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let mismatch = 0;

  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
}

async function derivePasswordHash(
  password: string,
  salt: string,
  iterations: number
): Promise<string> {
  const saltBuffer = base64ToBytes(salt) as unknown as BufferSource;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: saltBuffer,
      iterations
    },
    key,
    256
  );

  return bytesToBase64(new Uint8Array(bits));
}

export async function hashPassword(password: string) {
  const salt = bytesToBase64(crypto.getRandomValues(new Uint8Array(16)));
  const iterations = 310_000;
  const hash = await derivePasswordHash(password, salt, iterations);

  return { hash, salt, iterations };
}

export async function verifyPassword(
  password: string,
  storedHash: string,
  storedSalt: string,
  storedIterations: number
) {
  const computed = await derivePasswordHash(password, storedSalt, storedIterations);
  return timingSafeEqual(computed, storedHash);
}

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return bytesToBase64(new Uint8Array(digest));
}

export async function createSessionToken() {
  const token = bytesToBase64(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash = await sha256(token);

  return { token, tokenHash };
}
