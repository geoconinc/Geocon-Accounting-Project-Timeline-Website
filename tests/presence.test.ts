import { describe, it, expect, beforeEach } from "vitest";
import {
  addConnection,
  removeConnection,
  getActiveCount,
  isUserActive
} from "@/lib/events/presence";

// The presence registry lives on globalThis; reset it before each test for isolation.
beforeEach(() => {
  const g = globalThis as unknown as { __geoconPresence?: Map<string, number> };
  g.__geoconPresence?.clear();
});

describe("presence registry", () => {
  it("counts a single user with one connection", () => {
    expect(addConnection("u1")).toBe(1);
    expect(getActiveCount()).toBe(1);
    expect(isUserActive("u1")).toBe(true);
  });

  it("treats multiple tabs from one user as a single active user", () => {
    addConnection("u1");
    expect(addConnection("u1")).toBe(1);
    expect(getActiveCount()).toBe(1);
  });

  it("stays active until the last connection closes", () => {
    addConnection("u1");
    addConnection("u1");
    expect(removeConnection("u1")).toBe(1);
    expect(isUserActive("u1")).toBe(true);
    expect(removeConnection("u1")).toBe(0);
    expect(isUserActive("u1")).toBe(false);
  });

  it("counts distinct users independently", () => {
    addConnection("u1");
    addConnection("u2");
    expect(getActiveCount()).toBe(2);
    removeConnection("u1");
    expect(getActiveCount()).toBe(1);
    expect(isUserActive("u2")).toBe(true);
  });

  it("never drops below zero when removing an unknown connection", () => {
    expect(removeConnection("ghost")).toBe(0);
    expect(getActiveCount()).toBe(0);
    expect(isUserActive("ghost")).toBe(false);
  });
});
