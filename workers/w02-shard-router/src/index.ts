type ShardState = 'CREATING' | 'ACTIVE' | 'SPLITTING' | 'MERGING' | 'MIGRATING' | 'DRAINING' | 'RETIRED' | 'FAILED';
interface ShardMeta { shardId: number; physical: string; owner: string; epoch: number; state: ShardState; }
interface Env { SHARD_COUNT?: string; SHARD_MAP_JSON?: string; }
const json = (body: unknown, status = 200, requestId = crypto.randomUUID()) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'x-request-id': requestId } });
function canonical(tenant: string, namespace: string, key: string): string { const part = (v: string) => `${v.length}:${v}`; return `${part(tenant)}|${part(namespace)}|${part(key)}`; }
function fnv1a(input: string): number { let h = 0x811c9dc5; for (let i = 0; i < input.length; i++) { h ^= input.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; }
function loadShards(env: Env): ShardMeta[] {
  if (env.SHARD_MAP_JSON) { const parsed = JSON.parse(env.SHARD_MAP_JSON) as ShardMeta[]; if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('INVALID_SHARD_MAP'); return parsed; }
  const count = Math.max(1, Math.min(4096, Number(env.SHARD_COUNT ?? 16)));
  return Array.from({ length: count }, (_, shardId) => ({ shardId, physical: `D1-${shardId}`, owner: 'unassigned', epoch: 1, state: 'ACTIVE' }));
}
export default { async fetch(request: Request, env: Env): Promise<Response> {
  const rid = request.headers.get('x-request-id')?.slice(0, 128) || crypto.randomUUID();
  try {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type,x-request-id,x-routing-epoch', 'x-request-id': rid } });
    if (url.pathname === '/health' && request.method === 'GET') return json({ status: 'READY', service: 'd1-fabric-w02-shard-router', version: '0.1.0' }, 200, rid);
    if (url.pathname === '/v1/route' && request.method === 'POST') {
      const body = await request.json() as { tenant_id?: string; namespace?: string; routing_key?: string; expected_epoch?: number };
      if (!body.tenant_id || !body.namespace || !body.routing_key) return json({ code: 'INVALID_ARGUMENT' }, 400, rid);
      const shards = loadShards(env); const identity = canonical(body.tenant_id, body.namespace, body.routing_key); const shard = shards[fnv1a(identity) % shards.length];
      if (!shard || shard.state === 'RETIRED' || shard.state === 'FAILED') return json({ code: 'SHARD_UNAVAILABLE' }, 503, rid);
      if (body.expected_epoch !== undefined && body.expected_epoch !== shard.epoch) return json({ code: 'STALE_ROUTING_EPOCH', shard_id: shard.shardId, epoch: shard.epoch }, 409, rid);
      return json({ shard_id: shard.shardId, physical: shard.physical, owner: shard.owner, epoch: shard.epoch, state: shard.state, canonical_routing_identity: identity }, 200, rid);
    }
    return json({ code: 'NOT_FOUND' }, 404, rid);
  } catch (e) { return json({ code: e instanceof Error ? e.message : 'INTERNAL_ERROR' }, 500, rid); }
} };
