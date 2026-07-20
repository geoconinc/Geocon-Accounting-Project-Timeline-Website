import { describe, it, expect } from "vitest";
import {
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
  fileTooLargeMessage
} from "@/lib/config/fileUpload";

describe("file upload limits", () => {
  it("limit is 25 MB", () => {
    expect(MAX_FILE_SIZE_MB).toBe(25);
    expect(MAX_FILE_SIZE_BYTES).toBe(25 * 1024 * 1024);
  });

  it("builds a message with the filename", () => {
    expect(fileTooLargeMessage("plans.kmz")).toBe('"plans.kmz" exceeds the 25 MB upload limit.');
  });

  it("builds a generic message without a filename", () => {
    expect(fileTooLargeMessage()).toBe("exceeds the 25 MB upload limit.");
  });
});
