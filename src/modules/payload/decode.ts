// Payload decoding utilities

export function isLikelyJson(bytes: Uint8Array): boolean {
  if (bytes.length === 0) return false;
  const first = bytes[0];
  const last = bytes[bytes.length - 1];
  // Check if starts with { or [ and ends with } or ]
  return (
    (first === 0x7b && last === 0x7d) || // { }
    (first === 0x5b && last === 0x5d) // [ ]
  );
}

export function tryParseJson(text: string): unknown | undefined {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export function toUtf8(bytes: Uint8Array): string | undefined {
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true });
    return decoder.decode(bytes);
  } catch {
    return undefined;
  }
}

export function isPrintable(text: string): boolean {
  // Check if the string contains mostly printable characters
  const printableCount = text
    .split('')
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code >= 32 || code === 9 || code === 10 || code === 13;
    }).length;
  return printableCount / text.length > 0.95;
}

export type DecodedPayload = {
  text?: string;
  json?: unknown;
  isJson: boolean;
  isText: boolean;
  size: number;
};

export function decodePreview(
  bytes: Uint8Array,
  contentType?: string
): DecodedPayload {
  const size = bytes.length;

  // Try UTF-8 first
  const text = toUtf8(bytes);

  // Check content type hint
  const isJsonContentType = contentType?.includes('json');

  // Try JSON if content type suggests it or if it looks like JSON
  let json: unknown | undefined;
  let isJson = false;

  if (text && (isJsonContentType || isLikelyJson(bytes))) {
    json = tryParseJson(text);
    isJson = json !== undefined;
  }

  const isText = text !== undefined && isPrintable(text);

  return {
    text: isText ? text : undefined,
    json,
    isJson,
    isText,
    size,
  };
}
