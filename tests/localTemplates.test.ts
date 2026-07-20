import { describe, it, expect } from "vitest";
import { joinTemplateFolderPath, localPathToFileUrl } from "@/lib/config/localTemplates";

describe("joinTemplateFolderPath", () => {
  it("appends a category with a forward slash when base uses /", () => {
    expect(joinTemplateFolderPath("C:/Templates", "DAS Forms")).toBe("C:/Templates/DAS Forms");
  });

  it("uses a backslash when the base path is Windows-style", () => {
    expect(joinTemplateFolderPath("C:\\Templates", "DAS Forms")).toBe("C:\\Templates\\DAS Forms");
  });

  it("strips trailing separators from the base", () => {
    expect(joinTemplateFolderPath("C:/Templates/", "Misc")).toBe("C:/Templates/Misc");
  });

  it("sanitizes illegal path characters in the category", () => {
    // Consecutive illegal characters collapse into a single underscore.
    expect(joinTemplateFolderPath("/tmp", 'a/b:c*?"<>|d')).toBe("/tmp/a_b_c_d");
  });

  it("falls back to General for empty or dot-only categories", () => {
    expect(joinTemplateFolderPath("/tmp", "")).toBe("/tmp/General");
    expect(joinTemplateFolderPath("/tmp", "...")).toBe("/tmp/General");
  });
});

describe("localPathToFileUrl", () => {
  it("returns empty string for blank input", () => {
    expect(localPathToFileUrl("")).toBe("");
    expect(localPathToFileUrl("   ")).toBe("");
  });

  it("converts a Windows drive path", () => {
    expect(localPathToFileUrl("C:\\Geocon\\Templates")).toBe("file:///C:/Geocon/Templates");
  });

  it("converts a UNC path", () => {
    expect(localPathToFileUrl("\\\\fileserver\\share\\folder")).toBe(
      "file:////fileserver/share/folder"
    );
  });

  it("converts a Unix absolute path", () => {
    expect(localPathToFileUrl("/var/templates")).toBe("file:///var/templates");
  });
});
