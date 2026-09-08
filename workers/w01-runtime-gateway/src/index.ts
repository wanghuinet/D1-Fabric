import { ok, fail, requestId as genRequestId } from '../../_shared/response';
import { verifyToken, extractBearer } from '../../_shared/auth';

interface Env {
  VERSION?: string;
  JWT_SECRET: string;
  DEFAULT_TENANT_ID?: string;
  W02_ROUTER: Fetcher;
  W03_QUERY: Fetcher;
  W04_WRITE: Fetcher;
  W05_CACHE: Fetcher;
  W06_CONTROL: Fetcher;
  W07_MEDIA: Fetcher;
  W08_AUTH: Fetcher;
  W09_CONTENT: Fetcher;
  W10_SOCIAL: Fetcher;
}

const PUBLIC_PATHS = new Set(['/health', '/v1/runtime', '/v1/auth/login', '/v1/auth/register', '/v1/auth/verify']);

// Path → downstream worker binding. First match wins.
const ROUTES: Array<{ prefix: string; binding: keyof Env }> = [
  { prefix: '/v1/auth', binding: 'W08_AUTH' },
  { prefix: '/v1/route', binding: 'W02_ROUTER' },
  { prefix: '/v1/query', binding: 'W03_QUERY' },
  { prefix: '/v1/write', binding: 'W04_WRITE' },
  { prefix: '/v1/publish', binding: 'W04_WRITE' },
  { prefix: '/v1/integrity', binding: 'W04_WRITE' },
  { prefix: '/v1/cache', binding: 'W05_CACHE' },
  { prefix: '/v1/recovery', binding: 'W06_CONTROL' },
  { prefix: '/v1/migration', binding: 'W06_CONTROL' },
  { prefix: '/v1/shards', binding: 'W06_CONTROL' },
  { prefix: '/v1/media', binding: 'W07_MEDIA' },
  { prefix: '/v1/content', binding: 'W09_CONTENT' },
  { prefix: '/v1/comments', binding: 'W10_SOCIAL' },
  { prefix: '/v1/reactions', binding: 'W10_SOCIAL' },
  { prefix: '/v1/follows', binding: 'W10_SOCIAL' },
];

function routeTarget(path: string): keyof Env | null {
  for (const r of ROUTES) if (path.startsWith(r.prefix)) return r.binding;
  return null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const rid = genRequestId(request);
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
          'access-control-allow-headers': 'content-type,authorization,x-request-id',
          'x-request-id': rid,
        },
      });
    }

    if (request.method === 'GET' && url.pathname === '/health') {
      return ok({ status: 'READY', service: 'd1-fabric-w01-runtime-gateway', version: env.VERSION ?? '0.2.0' }, rid);
    }

    if (request.method === 'GET' && url.pathname === '/v1/runtime') {
      return ok({ version: env.VERSION ?? '0.2.0', capabilities: { auth: true, routing: true, query: true, write: true, media: true, content: true, social: true } }, rid);
    }

    // Auth: public paths skip; everything else requires a valid token.
    const isPublic = PUBLIC_PATHS.has(url.pathname);
    let authTenant: string | null = env.DEFAULT_TENANT_ID ?? null;
    let authUser: string | null = null;

    if (!isPublic) {
      const token = extractBearer(request);
      if (!token) return fail('UNAUTHORIZED', rid, 401);
      const payload = await verifyToken(token, env.JWT_SECRET);
      if (!payload) return fail('INVALID_TOKEN', rid, 401);
      authTenant = payload.tenant_id;
      authUser = payload.user_id;
    }

    const target = routeTarget(url.pathname);
    if (!target) return fail('NOT_FOUND', rid, 404);
    const fetcher = env[target] as Fetcher;

    // For write operations, rebuild the body with the authenticated tenant_id
    // injected (overriding any client-supplied tenant_id).
    const method = request.method;
    const isWrite = method === 'POST' || method === 'PATCH' || method === 'DELETE';
    if (isWrite && authTenant) {
      const ct = request.headers.get('content-type') ?? '';
      if (ct.includes('application/json')) {
        const body = await request.json().catch(() => ({}));
        if (body && typeof body === 'object') {
          (body as Record<string, unknown>).tenant_id = authTenant;
          if (authUser && 'user_id' in (body as Record<string, unknown>)) {
            (body as Record<string, unknown>).user_id = authUser;
          }
          // Forward to downstream with injected identity.
          const newReq = new Request(request, { body: JSON.stringify(body) });
          newReq.headers.set('x-request-id', rid);
          newReq.headers.set('x-auth-tenant', authTenant);
          if (authUser) newReq.headers.set('x-auth-user', authUser);
          return fetcher.fetch(newReq);
        }
      }
      // Non-JSON body (e.g. media upload): pass through, tenant in query string handled.
      const newReq = new Request(request);
      newReq.headers.set('x-request-id', rid);
      newReq.headers.set('x-auth-tenant', authTenant);
      return fetcher.fetch(newReq);
    }

    // Read operations: forward as-is but inject request id.
    const newReq = new Request(request);
    newReq.headers.set('x-request-id', rid);
    if (authTenant) newReq.headers.set('x-auth-tenant', authTenant);
    return fetcher.fetch(newReq);
  },
};
