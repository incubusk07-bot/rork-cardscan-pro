const B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Byte length of a base64 string without decoding it. */
export function base64ByteLength(b64: string): number {
  const clean = b64.replace(/[\r\n=]/g, "");
  return Math.floor((clean.length * 3) / 4);
}

/** Decode base64 into bytes (for Supabase Storage uploads — no Buffer in Expo Go). */
export function base64ToUint8Array(b64: string): Uint8Array {
  const clean = b64.replace(/[\r\n]/g, "").replace(/=+$/, "");
  const output = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let outIndex = 0;
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < clean.length; i++) {
    const value = B64_CHARS.indexOf(clean[i]);
    if (value < 0) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output[outIndex++] = (buffer >> bits) & 0xff;
    }
  }
  return output.slice(0, outIndex);
}
