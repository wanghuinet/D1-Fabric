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
