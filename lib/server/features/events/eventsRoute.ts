import { bus } from "@/lib/events/bus";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("unauthorized", { status: 401 });

  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let unsubscribe: (() => void) | null = null;
  let closed = false;

  function cleanup() {
    if (closed) return;
    closed = true;
    if (heartbeat) clearInterval(heartbeat);
    if (unsubscribe) unsubscribe();
  }

  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();

      function safeSend(data: string) {
        if (closed) return;
        try {
          controller.enqueue(enc.encode(data));
        } catch {
          cleanup();
        }
      }

      safeSend(`: connected\n\n`);
      heartbeat = setInterval(() => safeSend(`: ping\n\n`), 25000);

      unsubscribe = bus.subscribe((e) => {
        safeSend(`event: ${e.type}\ndata: ${JSON.stringify(e.payload)}\n\n`);
      });
    },
    cancel() {
      cleanup();
    }
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive"
    }
  });
}
