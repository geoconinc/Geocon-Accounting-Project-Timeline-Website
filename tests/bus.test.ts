import { describe, it, expect } from "vitest";
import { bus, type BusEvent } from "@/lib/events/bus";

describe("event bus", () => {
  it("delivers published events to subscribers", () => {
    const received: BusEvent[] = [];
    const unsub = bus.subscribe((e) => received.push(e));
    const event: BusEvent = { type: "project.delete", payload: { id: "p1" } };
    bus.publish(event);
    expect(received).toEqual([event]);
    unsub();
  });

  it("stops delivering after unsubscribe", () => {
    const received: BusEvent[] = [];
    const unsub = bus.subscribe((e) => received.push(e));
    unsub();
    bus.publish({ type: "file.deleted", payload: { id: "f1", parentType: "project", parentId: "p1" } });
    expect(received).toHaveLength(0);
  });

  it("isolates listener errors so other listeners still run", () => {
    const good: BusEvent[] = [];
    const unsubBad = bus.subscribe(() => {
      throw new Error("listener boom");
    });
    const unsubGood = bus.subscribe((e) => good.push(e));
    bus.publish({ type: "project.upsert", payload: { id: "p9" } });
    expect(good).toHaveLength(1);
    unsubBad();
    unsubGood();
  });
});
