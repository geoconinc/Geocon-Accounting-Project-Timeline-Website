// In-process pub/sub for Server-Sent Events. Single-instance only — for multi-instance
// scale-out on Azure, swap this for Azure SignalR or Redis pub/sub.

export type BusEvent =
  | { type: "project.upsert"; payload: { id: string } }
  | { type: "project.delete"; payload: { id: string } }
  | { type: "subitem.upsert"; payload: { id: string; projectId: string } }
  | { type: "subitem.delete"; payload: { id: string; projectId: string } }
  | { type: "subitem.reorder"; payload: { projectId: string } }
  | { type: "file.added"; payload: { parentType: "project" | "subitem"; parentId: string } }
  | { type: "file.deleted"; payload: { id: string; parentType: "project" | "subitem"; parentId: string } }
  | { type: "notification.new"; payload: { userId: string; message: string; projectId?: string } };

type Listener = (e: BusEvent) => void;

const g = globalThis as unknown as { __geoconBus?: Set<Listener> };
if (!g.__geoconBus) g.__geoconBus = new Set();
const listeners = g.__geoconBus;

export const bus = {
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  publish(e: BusEvent) {
    for (const l of listeners) {
      try {
        l(e);
      } catch {
        // ignore listener errors
      }
    }
  }
};
