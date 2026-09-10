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

## API

`POST /v1/control/publish` publishes a validated, monotonically newer snapshot.

`GET /v1/control/lkg` returns the newest active validated non-revoked, non-expired snapshot.

`GET /v1/control/epoch?epoch=N` confirms that `N` is the currently active admissible write epoch.

`POST /v1/control/revoke` persistently fences a snapshot.

Public responses do not expose physical D1 identifiers, SQL topology, or the internal Worker graph.
