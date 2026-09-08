// Shared shard-routing helper. W03/W04 call W02 Shard Router via service binding
// instead of accepting a client-supplied shard_id (which would bypass routing,
// epoch fencing, and tenant isolation).
//
// Service binding name: "ROUTER" → d1-fabric-w02-shard-router

export interface RouteResult {
  shard_id: number;
  physical: string;
  owner: string;
  epoch: number;
  state: string;
  canonical_routing_identity: string;
}

// Map a W02 route result's `physical` shard identifier (e.g. "shard-01" or
// "d1-fabric-shard-01") to the local D1 binding name (e.g. "SHARD_01").
//
// This is the single source of truth for physical-binding resolution. Workers
// MUST NOT derive the physical shard from the logical shard id (e.g. shardId % 8);
// they MUST resolve the binding from the `physical` field returned by W02.
export function physicalBinding(physical: string): string | null {
  const m = /(\d{1,2})\s*$/.exec((physical ?? '').trim());
  if (!m) return null;
  return `SHARD_${m[1].padStart(2, '0')}`;
}

// Resolve the physical D1 binding for a W02 route result's `physical` field.
export function dbForPhysical(env: unknown, physical: string): D1Database | null {
  const binding = physicalBinding(physical);
  if (!binding) return null;
  return ((env as { [key: string]: unknown })[binding] as D1Database | undefined) ?? null;
}

export async function resolveShard(
  router: Fetcher,
  tenantId: string,
  namespace: string,
  routingKey: string,
  expectedEpoch?: number,
): Promise<RouteResult> {
  const res = await router.fetch('http://router/v1/route', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      tenant_id: tenantId,
      namespace,
      routing_key: routingKey,
      ...(expectedEpoch !== undefined ? { expected_epoch: expectedEpoch } : {}),
    }),
  });
  const body = (await res.json()) as RouteResult | { code: string };
  if (res.status !== 200) {
    const err = body as { code: string };
    throw new Error(err.code || `ROUTER_HTTP_${res.status}`);
  }
  return body as RouteResult;
}
