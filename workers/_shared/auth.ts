// Shared authentication helper.
// Token format: base64url(header).base64url(payload).base64url(signature)
// Header: { alg: 'HS256', typ: 'JWT' }
// Payload: { user_id, tenant_id, session_id, exp }
// Signature: HMAC-SHA256 over header.payload using JWT_SECRET from env.
//
// This lets any worker verify a token locally without a round-trip to W08.
// The secret MUST be supplied via env secret binding, never source code
// (Security Contract §7, §53).

export interface AuthPayload {
  user_id: string;
  tenant_id: string;
  session_id: string;
  exp: number; // epoch seconds
}

function b64url(data: Uint8Array | ArrayBuffer): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice((str.length + 3) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function importKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signToken(payload: AuthPayload, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encoder = new TextEncoder();
  const headerB64 = b64url(encoder.encode(JSON.stringify(header)));
  const payloadB64 = b64url(encoder.encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(signingInput));
  return `${signingInput}.${b64url(sig)}`;
}

export async function verifyToken(token: string, secret: string): Promise<AuthPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;
  const signingInput = `${headerB64}.${payloadB64}`;
  const key = await importKey(secret);
  const sigBytes = b64urlDecode(sigB64);
  const valid = await crypto.subtle.verify('HMAC', key, sigBytes as unknown as ArrayBuffer, new TextEncoder().encode(signingInput));
  if (!valid) return null;
  let payload: AuthPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(b64urlDecode(payloadB64))) as AuthPayload;
  } catch {
    return null;
  }
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

// Extract bearer token from Authorization header.
export function extractBearer(request: Request): string | null {
  const auth = request.headers.get('authorization');
  if (!auth) return null;
  const match = /^Bearer\s+(.+)$/i.exec(auth.trim());
  return match ? match[1] : null;
}

// Password hashing with PBKDF2-SHA256.
export async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: encoder.encode(salt), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256,
  );
  return b64url(bits);
}

export async function verifyPassword(password: string, salt: string, hash: string): Promise<boolean> {
  const derived = await hashPassword(password, salt);
  return derived === hash;
}
