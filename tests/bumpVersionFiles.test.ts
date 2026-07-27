import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { bumpVersionFiles } from "@/scripts/bump-version";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "bump-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function write(name: string, contents: string) {
  writeFileSync(path.join(dir, name), contents);
}

describe("bumpVersionFiles", () => {
  it("bumps package.json, package-lock.json and VERSION together", () => {
    write("package.json", JSON.stringify({ name: "app", version: "0.9.0" }, null, 2));
    write(
      "package-lock.json",
      JSON.stringify({ version: "0.9.0", packages: { "": { version: "0.9.0" } } }, null, 2)
    );
    write("VERSION", "0.9.0\n");

    const { prev, next } = bumpVersionFiles(dir);
    expect(prev).toBe("0.9.0");
    expect(next).toBe("1.0.0");

    const pkg = JSON.parse(readFileSync(path.join(dir, "package.json"), "utf8"));
    const lock = JSON.parse(readFileSync(path.join(dir, "package-lock.json"), "utf8"));
    expect(pkg.version).toBe("1.0.0");
    expect(lock.version).toBe("1.0.0");
    expect(lock.packages[""].version).toBe("1.0.0");
    expect(readFileSync(path.join(dir, "VERSION"), "utf8").trim()).toBe("1.0.0");
  });

  it("works when no lockfile is present", () => {
    write("package.json", JSON.stringify({ name: "app", version: "1.2.0" }, null, 2));
    write("VERSION", "1.2.0\n");

    const { next } = bumpVersionFiles(dir);
    expect(next).toBe("1.3.0");
    expect(readFileSync(path.join(dir, "VERSION"), "utf8").trim()).toBe("1.3.0");
  });
});
