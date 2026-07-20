import { describe, it, expect } from "vitest";
import { bumpByTenth } from "@/scripts/bump-version";

describe("bumpByTenth", () => {
  it("increments the minor version", () => {
    expect(bumpByTenth("0.1.0")).toBe("0.2.0");
    expect(bumpByTenth("0.8.0")).toBe("0.9.0");
  });
  it("rolls over to the next major at .10", () => {
    expect(bumpByTenth("0.9.0")).toBe("1.0.0");
    expect(bumpByTenth("1.9.5")).toBe("2.0.5");
  });
  it("accepts versions without a patch segment", () => {
    expect(bumpByTenth("2.3")).toBe("2.4.0");
  });
  it("trims surrounding whitespace", () => {
    expect(bumpByTenth("  0.5.0\n")).toBe("0.6.0");
  });
  it("throws on invalid input", () => {
    expect(() => bumpByTenth("not-a-version")).toThrow();
  });
});
