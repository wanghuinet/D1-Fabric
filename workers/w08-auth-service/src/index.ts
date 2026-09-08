import { ok, fail, requestId } from '../../_shared/response';
import { resolveShard } from '../../_shared/router';
import { signToken, verifyToken, extractBearer, hashPassword, verifyPassword } from '../../_shared/auth';

interface Env {
  SHARD_01?: D1Database;
  SHARD_02?: D1Database;
  SHARD_03?: D1Database;
  SHARD_04?: D1Database;
  SHARD_05?: D1Database;
  SHARD_06?: D1Database;
  SHARD_07?: D1Database;
  SHARD_08?: D1Database;
  ROUTER: Fetcher;
  JWT_SECRET: string;
  DEFAULT_TENANT_ID?: string;
}

function dbForShard(env: Env, shardId: number): D1Database | null {
  if (!Number.isInteger(shardId) || shardId < 0 || shardId > 63) return null;
  const physical = (shardId % 8) + 1;
  return env[`SHARD_${String(physical).padStart(2, '0')}` as keyof Env] as D1Database | undefined ?? null;
}

function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  return crypto.subtle.digest('SHA-256', encoder.encode(input)).then((d) =>
    Array.from(new Uint8Array(d), (x) => x.toString(16).padStart(2, '0')).join(''),
  );
}

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export default {
  async fetch(request: Request, env: Env) {
    const rid = requestId(request);
    try {
      const url = new URL(request.url);

      if (request.method === 'GET' && url.pathname === '/health') {
        return ok({ status: 'READY', service: 'd1-fabric-w08-auth-service', version: '0.1.0' }, rid);
      }

      // Register a new user (and corresponding author profile).
      if (request.method === 'POST' && url.pathname === '/v1/auth/register') {
        const body = await request.json() as {
          tenant_id?: string; phone?: string; email?: string; password?: string;
          display_name?: string;
        };
        const tenantId = body.tenant_id ?? env.DEFAULT_TENANT_ID;
        if (!tenantId) return fail('INVALID_ARGUMENT', rid, 400, 'tenant_id is required');
        if (!body.phone && !body.email) return fail('INVALID_ARGUMENT', rid, 400, 'phone or email is required');
        if (!body.password || body.password.length < 8) return fail('INVALID_ARGUMENT', rid, 400, 'password must be >= 8 chars');

        const phoneHash = body.phone ? await sha256Hex(body.phone) : null;
        const emailHash = body.email ? await sha256Hex(body.email) : null;
        const salt = crypto.randomUUID();
        const passwordHash = await hashPassword(body.password, salt);

        const userId = crypto.randomUUID();
        // Users routed by user_id. Authors colocated with users.
        let shardId: number;
        try {
          const route = await resolveShard(env.ROUTER, tenantId, 'users', userId);
          shardId = route.shard_id;
        } catch (e) { return fail(e instanceof Error ? e.message : 'ROUTER_ERROR', rid, 503, undefined, true); }
        const db = dbForShard(env, shardId);
        if (!db) return fail('SHARD_NOT_READY', rid, 503);

        try {
          await db.batch([
            db.prepare('INSERT INTO platform_users(tenant_id,user_id,display_name,phone_hash,email_hash,password_hash,status) VALUES(?1,?2,?3,?4,?5,?6,"active")')
              .bind(tenantId, userId, body.display_name ?? 'User', phoneHash, emailHash, `${salt}:${passwordHash}`),
            db.prepare('INSERT INTO platform_authors(tenant_id,author_id,user_id,author_name,status) VALUES(?1,?2,?3,?4,"active")')
              .bind(tenantId, userId, userId, body.display_name ?? 'User'),
          ]);
        } catch (error) {
          const msg = error instanceof Error ? error.message : '';
          if (msg.includes('UNIQUE constraint failed: platform_users.phone')) return fail('PHONE_ALREADY_EXISTS', rid, 409);
          if (msg.includes('UNIQUE constraint failed: platform_users.email')) return fail('EMAIL_ALREADY_EXISTS', rid, 409);
          return fail('REGISTER_FAILED', rid, 500);
        }
        return ok({ user_id: userId, tenant_id: tenantId }, rid, 201);
      }

      // Login with phone/email + password; returns a signed token + session.
      if (request.method === 'POST' && url.pathname === '/v1/auth/login') {
        const body = await request.json() as {
          tenant_id?: string; phone?: string; email?: string; password?: string; device_id?: string;
        };
        const tenantId = body.tenant_id ?? env.DEFAULT_TENANT_ID;
        if (!tenantId) return fail('INVALID_ARGUMENT', rid, 400);
        if ((!body.phone && !body.email) || !body.password) return fail('INVALID_ARGUMENT', rid, 400);

        const phoneHash = body.phone ? await sha256Hex(body.phone) : null;
        const emailHash = body.email ? await sha256Hex(body.email) : null;

        // To find the user we need their shard. Without knowing user_id, we
        // must scan shards. For P0, scan all 8 physical shards (bounded).
        const dbs = [1, 2, 3, 4, 5, 6, 7, 8]
          .map((n) => env[`SHARD_${String(n).padStart(2, '0')}` as keyof Env] as D1Database | undefined)
          .filter((db): db is D1Database => !!db);

        let userRow: { user_id: string; password_hash: string; display_name: string } | null = null;
        let userShardId = 0;
        for (let i = 0; i < dbs.length; i++) {
          const db = dbs[i];
          const where = phoneHash ? 'phone_hash=?2' : 'email_hash=?2';
          const param = phoneHash ?? emailHash;
          const row = await db.prepare(`SELECT user_id,password_hash,display_name FROM platform_users WHERE tenant_id=?1 AND ${where} LIMIT 1`).bind(tenantId, param).first<{ user_id: string; password_hash: string; display_name: string }>();
          if (row) { userRow = row; userShardId = i + 1; break; }
        }
        if (!userRow) return fail('INVALID_CREDENTIALS', rid, 401);

        const [salt, expectedHash] = userRow.password_hash.split(':');
        const valid = await verifyPassword(body.password, salt, expectedHash);
        if (!valid) return fail('INVALID_CREDENTIALS', rid, 401);

        // Create session on the user's shard.
        const sessionId = crypto.randomUUID();
        const tokenRaw = crypto.randomUUID();
        const tokenHash = await sha256Hex(tokenRaw);
        const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
        const db = dbForShard(env, userShardId);
        if (!db) return fail('SHARD_NOT_READY', rid, 503);
        await db.prepare('INSERT INTO platform_user_sessions(tenant_id,session_id,user_id,device_id,token_hash,expires_at) VALUES(?1,?2,?3,?4,?5,?6)')
          .bind(tenantId, sessionId, userRow.user_id, body.device_id ?? 'unknown', tokenHash, expiresAt)
          .run();

        // Sign a JWT-style token with HMAC.
        const token = await signToken(
          { user_id: userRow.user_id, tenant_id: tenantId, session_id: sessionId, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS },
          env.JWT_SECRET,
        );
        return ok({ token, user_id: userRow.user_id, display_name: userRow.display_name, expires_at: expiresAt }, rid);
      }

      // Verify token (used by other workers or clients).
      if (request.method === 'POST' && url.pathname === '/v1/auth/verify') {
        const token = extractBearer(request);
        if (!token) return fail('UNAUTHORIZED', rid, 401);
        const payload = await verifyToken(token, env.JWT_SECRET);
        if (!payload) return fail('INVALID_TOKEN', rid, 401);
        return ok({ user_id: payload.user_id, tenant_id: payload.tenant_id, session_id: payload.session_id, exp: payload.exp }, rid);
      }

      // Logout: revoke the session.
      if (request.method === 'POST' && url.pathname === '/v1/auth/logout') {
        const token = extractBearer(request);
        if (!token) return fail('UNAUTHORIZED', rid, 401);
        const payload = await verifyToken(token, env.JWT_SECRET);
        if (!payload) return fail('INVALID_TOKEN', rid, 401);
        let shardId: number;
        try {
          const route = await resolveShard(env.ROUTER, payload.tenant_id, 'users', payload.user_id);
          shardId = route.shard_id;
        } catch (e) { return fail(e instanceof Error ? e.message : 'ROUTER_ERROR', rid, 503, undefined, true); }
        const db = dbForShard(env, shardId);
        if (!db) return fail('SHARD_NOT_READY', rid, 503);
        await db.prepare('UPDATE platform_user_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE tenant_id=?1 AND session_id=?2').bind(payload.tenant_id, payload.session_id).run();
        return ok({ logged_out: true }, rid);
      }

      return fail('NOT_FOUND', rid, 404);
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'INTERNAL_ERROR', rid, 500);
    }
  },
};
