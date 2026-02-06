import { createVerify } from "crypto";

/**
 * Verify BoomFi webhook signature.
 * @see https://docs.boomfi.xyz/docs/webhook-signatures
 * Message = timestamp + "." + rawBody (string)
 * SHA256(message) then verify RSA signature (base64) with public key.
 */
export function verifyBoomFiSignature(
  rawBody: string,
  timestamp: string,
  signatureBase64: string,
  publicKeyPem: string
): boolean {
  if (!timestamp || !signatureBase64 || !publicKeyPem) return false;
  try {
    const message = `${timestamp}.${rawBody}`;
    const verifier = createVerify("SHA256");
    verifier.update(message, "utf8");
    verifier.end();
    return verifier.verify(publicKeyPem, signatureBase64, "base64");
  } catch {
    return false;
  }
}

/** Replay protection: timestamp should be within last 5 minutes */
export function isTimestampFresh(timestampStr: string, maxAgeSeconds = 300): boolean {
  const t = parseInt(timestampStr, 10);
  if (Number.isNaN(t)) return false;
  return Math.abs(Date.now() / 1000 - t) <= maxAgeSeconds;
}
