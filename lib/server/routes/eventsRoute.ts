import { bus } from "@/lib/events/bus";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("unauthorized", { status: 401 });

  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      const send = (data: string) => controller.enqueue(enc.encode(data));
      send(`: connected\n\n`);
      const heartbeat = setInterval(() => send(`: ping\n\n`), 25000);

      const unsubscribe = bus.subscribe((e) => {
        send(`event: ${e.type}\ndata: ${JSON.stringify(e.payload)}\n\n`);
      });

      const close = () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      // @ts-expect-error custom signal handling
      controller._close = close;
    },
    cancel() {
      // controller.cancel triggered when client disconnects
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
