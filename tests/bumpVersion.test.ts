import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { bumpByTenth } from "@/scripts/bump-version";
import { formatAppVersion, formatAppVersionLabel } from "@/lib/config/appVersion";

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

describe("version file consistency", () => {
  it("package.json and VERSION agree", () => {
    const root = process.cwd();
    const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as {
      version: string;
    };
    const fileVersion = readFileSync(path.join(root, "VERSION"), "utf8").trim();
    expect(fileVersion).toBe(pkg.version);
  });
});

describe("UI version formatting", () => {
  it("formats the package version the same way the website does", () => {
    const pkg = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8")) as {
      version: string;
    };
    expect(formatAppVersion(pkg.version)).toBe(`v${pkg.version}`);
    expect(formatAppVersionLabel(pkg.version)).toBe(`Geocon · v${pkg.version}`);
  });
});
