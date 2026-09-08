// Shared response envelope for all D1-Fabric workers.
// Envelope contract (Security & Compatibility Contract §35, §39):
//   success: { ok:true, data:T, error:null, request_id:string }
//   failure: { ok:false, data:null, error:{code,message,retryable}, request_id:string }
// Error codes are stable machine-readable strings; retryable tells the caller
// whether a retry with the same idempotency key is safe.

export type D1FError = {
  code: string;
  message?: string;
  retryable?: boolean;
};

export type D1FResponse<T = unknown> = {
  ok: boolean;
  data: T | null;
  error: D1FError | null;
  request_id: string;
};

export function ok<T>(data: T, requestId: string, status = 200): Response {
  return respond({ ok: true, data, error: null, request_id: requestId }, status, requestId);
}

export function fail(
  code: string,
  requestId: string,
  status = 400,
  message?: string,
  retryable = false,
): Response {
  const error: D1FError = { code, retryable };
  if (message) error.message = message;
  return respond({ ok: false, data: null, error, request_id: requestId }, status, requestId);
}

export function respond(body: D1FResponse, status: number, requestId: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'x-request-id': requestId,
    },
  });
}

// Extract request id from header (truncated to 128 chars) or generate one.
export function requestId(request: Request): string {
  const supplied = request.headers.get('x-request-id');
  return supplied && supplied.length <= 128 ? supplied : crypto.randomUUID();
}
