import { describe, it, expect } from "vitest";
import {
  sanitizeInputText,
  validateBase64Payload,
  isValidAudioMimeType
} from "./securityHelpers";

describe("Security & Sanitization Helpers", () => {
  describe("sanitizeInputText", () => {
    it("should strip HTML tags from input string", () => {
      const dirty = "<script>alert('hack')</script> Hello <b>World</b>!";
      expect(sanitizeInputText(dirty)).toBe("alert('hack') Hello World!");
    });

    it("should trim surrounding whitespace", () => {
      const padded = "   FIFA 2026   ";
      expect(sanitizeInputText(padded)).toBe("FIFA 2026");
    });

    it("should truncate inputs that exceed maximum length limit", () => {
      const longInput = "a".repeat(110);
      const output = sanitizeInputText(longInput, 50);
      expect(output).toHaveLength(50);
      expect(output).toBe("a".repeat(50));
    });
  });

  describe("validateBase64Payload", () => {
    it("should return false for empty or non-base64 input strings", () => {
      expect(validateBase64Payload("")).toBe(false);
      expect(validateBase64Payload("not-base64-content!@#")).toBe(false);
    });

    it("should validate sound base64 structures", () => {
      // "RklGQQ==" is base64 for "FIFA"
      expect(validateBase64Payload("RklGQQ==")).toBe(true);
    });

    it("should enforce maximum payload byte size limits", () => {
      // 1000 characters of base64 represents about 750 bytes. Let's set max size to 10 bytes and verify it fails.
      const testBase64 = "RklGQQ=="; // 4 bytes of data
      expect(validateBase64Payload(testBase64, 10)).toBe(true);
      expect(validateBase64Payload(testBase64, 2)).toBe(false);
    });
  });

  describe("isValidAudioMimeType", () => {
    it("should authorize correct audio formats", () => {
      expect(isValidAudioMimeType("audio/webm")).toBe(true);
      expect(isValidAudioMimeType("audio/wav")).toBe(true);
      expect(isValidAudioMimeType("audio/pcm;rate=16000")).toBe(true);
    });

    it("should block incorrect format types like executables or docs", () => {
      expect(isValidAudioMimeType("application/x-sh")).toBe(false);
      expect(isValidAudioMimeType("image/png")).toBe(false);
    });
  });
});
