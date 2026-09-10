export interface Env {}

export default {
  async fetch(request: Request, _env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method !== "GET") {
      return new Response("method not allowed", { status: 405 });
    }
    if (url.pathname === "/health") {
      return new Response("ok", { status: 200 });
    }
    if (url.pathname === "/ready") {
      return new Response("ready", { status: 200 });
    }
    return new Response("not found", { status: 404 });
  },
};
