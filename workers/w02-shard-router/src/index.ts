type ShardState = 'CREATING' | 'ACTIVE' | 'SPLITTING' | 'MERGING' | 'MIGRATING' | 'DRAINING' | 'RETIRED' | 'FAILED';
interface ShardMeta { shardId: number; physical: string; owner: string; epoch: number; state: ShardState; }
interface Env { SHARD_MAP_JSON?: string; }
const LOGICAL_SHARD_COUNT = 64;
const PHYSICAL_SHARD_COUNT = 8;
const json = (body: unknown, status = 200, requestId: string = crypto.randomUUID()) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'x-request-id': requestId } });
function canonical(tenant: string, namespace: string, key: string): string { const part = (v: string) => `${v.length}:${v}`; return `${part(tenant)}|${part(namespace)}|${part(key)}`; }
function fnv1a(input: string): number { let h = 0x811c9dc5; for (let i = 0; i < input.length; i++) { h ^= input.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; }

// Logical -> physical binding is authoritative in W02 only.
// The deterministic 64 -> 8 seed mirrors the control-plane seed exactly:
//   workers/w06-control-recovery/migrations/0001_control_schema.sql (fabric_shards).
// Downstream workers (W03/W04) MUST NOT recompute this binding; they resolve it here.
function physicalFor(shardId: number): { physical: string; owner: string } {
  const label = String((shardId % PHYSICAL_SHARD_COUNT) + 1).padStart(2, '0');
  return { physical: `d1-fabric-shard-${label}`, owner: `shard-${label}` };
}

function loadShards(env: Env): ShardMeta[] {
  if (env.SHARD_MAP_JSON) {
    const parsed = JSON.parse(env.SHARD_MAP_JSON) as ShardMeta[];
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('INVALID_SHARD_MAP');
    return parsed;
  }
  const shards: ShardMeta[] = [];
  for (let shardId = 0; shardId < LOGICAL_SHARD_COUNT; shardId++) {
    const { physical, owner } = physicalFor(shardId);
    shards.push({ shardId, physical, owner, epoch: 1, state: 'ACTIVE' });
  }
  return shards;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const rid = request.headers.get('x-request-id')?.slice(0, 128) || crypto.randomUUID();
    try {
      const url = new URL(request.url);
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type,x-request-id,x-routing-epoch', 'x-request-id': rid } });
      if (url.pathname === '/health' && request.method === 'GET') return json({ status: 'READY', service: 'd1-fabric-w02-shard-router', version: '0.2.0', logical_shard_count: LOGICAL_SHARD_COUNT, physical_shard_count: PHYSICAL_SHARD_COUNT }, 200, rid);

      if (url.pathname === '/v1/route' && request.method === 'POST') {
        // routing_key IS the affinity_key. Routing input = tenant_id + affinity_key.
        const body = await request.json() as { tenant_id?: string; namespace?: string; routing_key?: string; expected_epoch?: number };
        if (!body.tenant_id || !body.namespace || !body.routing_key) return json({ code: 'INVALID_ARGUMENT' }, 400, rid);
        const shards = loadShards(env);
        const identity = canonical(body.tenant_id, body.namespace, body.routing_key);
        const shard = shards[fnv1a(identity) % shards.length];
        if (!shard || shard.state === 'RETIRED' || shard.state === 'FAILED') return json({ code: 'SHARD_UNAVAILABLE' }, 503, rid);
        if (body.expected_epoch !== undefined && body.expected_epoch !== shard.epoch) return json({ code: 'STALE_ROUTING_EPOCH', shard_id: shard.shardId, epoch: shard.epoch }, 409, rid);
        return json({ shard_id: shard.shardId, physical: shard.physical, owner: shard.owner, epoch: shard.epoch, state: shard.state, canonical_routing_identity: identity }, 200, rid);
      }

      // Authoritative logical shard -> physical binding resolution for downstream
      // data-path workers. W03/W04 map the returned `physical` to their local
      // SHARD_XX binding; they never derive physical placement themselves.
      if (url.pathname === '/v1/resolve' && request.method === 'POST') {
        const body = await request.json() as { shard_id?: number; expected_epoch?: number };
        if (!Number.isInteger(body.shard_id) || body.shard_id! < 0 || body.shard_id! >= LOGICAL_SHARD_COUNT) return json({ code: 'INVALID_SHARD_ID' }, 400, rid);
        const shards = loadShards(env);
        const shard = shards[body.shard_id!];
        if (!shard || shard.state === 'RETIRED' || shard.state === 'FAILED') return json({ code: 'SHARD_UNAVAILABLE', shard_id: body.shard_id }, 503, rid);
        if (body.expected_epoch !== undefined && body.expected_epoch !== shard.epoch) return json({ code: 'STALE_ROUTING_EPOCH', shard_id: shard.shardId, epoch: shard.epoch }, 409, rid);
        return json({ shard_id: shard.shardId, physical: shard.physical, owner: shard.owner, epoch: shard.epoch, state: shard.state }, 200, rid);
      }

      return json({ code: 'NOT_FOUND' }, 404, rid);
    } catch (e) { return json({ code: e instanceof Error ? e.message : 'INTERNAL_ERROR' }, 500, rid); }
  },
};