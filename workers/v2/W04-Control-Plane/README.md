# W04 Control Plane

W04 is the authoritative control boundary for generic placement metadata, versioned control snapshots, capacity policy, publication, recovery, LKG selection, and epoch fencing.

It contains no business/domain semantics.

## Runtime boundary

```text
W01 Gateway → W02 Execution / W03 Write
                     ↑
                     │ consumes approved control epoch
                     │
                W04 Control Plane
```

## Persistent state

Apply `migrations/0001_control_plane.sql` to the deployment-specific D1 database, then configure the Wrangler `CONTROL_DB` binding for that environment. The checked-in config deliberately contains no invented database ID.

Without `CONTROL_DB`, the Worker fails closed with `CONTROL_PLANE_NOT_CONFIGURED` and cannot authorize control operations.

Mutating operations also require the deployment secret `CONTROL_PLANE_ADMIN_TOKEN`, supplied as a Worker secret and never committed to source control. In production, W04 should be reached through a Cloudflare Service Binding; the mutation credential remains defense in depth.

## Recovery invariant

LKG is a recovery source, not a stale-epoch bypass. If the active head is revoked or otherwise invalid, W04 may identify the newest valid LKG, but normal writes remain blocked until a new monotonically increasing control version/epoch is published and becomes the active head.

## API

`POST /v1/control/publish` publishes a validated, monotonically newer snapshot. Requires `Authorization: Bearer <CONTROL_PLANE_ADMIN_TOKEN>`.

`GET /v1/control/lkg` returns the newest active validated non-revoked, non-expired snapshot.

`GET /v1/control/epoch?epoch=N` confirms that `N` is the currently active admissible write epoch.

`POST /v1/control/revoke` persistently fences a snapshot. Requires `Authorization: Bearer <CONTROL_PLANE_ADMIN_TOKEN>`.

Public responses do not expose physical D1 identifiers, SQL topology, or the internal Worker graph.
