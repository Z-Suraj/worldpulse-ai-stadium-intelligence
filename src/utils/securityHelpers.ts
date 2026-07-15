/**
 * Security & Sanitization Helpers
 */

/**
 * Sanitizes user prompts or text input before passing them to the AI model or displaying them in the UI.
 * Strips HTML tags, script nodes, and limits length to avoid prompt injection bloating.
 */
export function sanitizeInputText(input: string, maxLength: number = 1000): string {
  if (!input) return "";
  let sanitized = input.trim();
  
  // Basic HTML and script tags extraction
  sanitized = sanitized.replace(/<[^>]*>/g, "");
  
  // Truncate length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

/**
 * Validates base64 string structure and size limits (max 10MB by default).
 */
export function validateBase64Payload(base64Str: string, maxBytes: number = 10 * 1024 * 1024): boolean {
  if (!base64Str) return false;
  
  // Basic validation pattern for base64
  const cleaned = base64Str.replace(/^data:image\/\w+;base64,/, "");
  const base64Regex = /^[A-Za-z0-9+/=]+$/;
  if (!base64Regex.test(cleaned)) {
    return false;
  }
  
  // Calculate size in bytes
  const paddingChars = (cleaned.match(/=/g) || []).length;
  const sizeBytes = (cleaned.length * 3) / 4 - paddingChars;
  
  return sizeBytes <= maxBytes;
}

/**
 * Validates audio file upload mime types specifically for the Walkie-Talkie speech dispatcher.
 */
export function isValidAudioMimeType(mimeType: string): boolean {
  const allowedMimes = [
    "audio/webm",
    "audio/wav",
    "audio/ogg",
    "audio/mp3",
    "audio/mpeg",
    "audio/x-wav",
    "audio/pcm;rate=16000",
    "audio/pcm"
  ];
  return allowedMimes.includes(mimeType.toLowerCase());
}
