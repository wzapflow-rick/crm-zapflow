import "server-only"
import { createHmac, timingSafeEqual } from "node:crypto"

// A Meta envia um parâmetro `signed_request` nos callbacks de desautorização e
// de exclusão de dados. Ele tem o formato `<assinatura>.<payload>`, ambos em
// base64url. A assinatura é um HMAC-SHA256 do payload usando o App Secret.
// Docs: developers.facebook.com/docs/facebook-login/data-deletion-request

export type SignedRequestPayload = {
  user_id?: string
  algorithm?: string
  issued_at?: number
  [key: string]: unknown
}

function base64UrlDecode(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64")
}

// Valida a assinatura e devolve o payload, ou null se inválido.
export function parseSignedRequest(signedRequest: string): SignedRequestPayload | null {
  const secret = process.env.INSTAGRAM_APP_SECRET
  if (!secret || !signedRequest || !signedRequest.includes(".")) return null

  const [encodedSig, encodedPayload] = signedRequest.split(".")
  if (!encodedSig || !encodedPayload) return null

  let payload: SignedRequestPayload
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload).toString("utf8")) as SignedRequestPayload
  } catch {
    return null
  }

  if (payload.algorithm && payload.algorithm.toUpperCase() !== "HMAC-SHA256") return null

  const expected = createHmac("sha256", secret).update(encodedPayload).digest()
  const received = base64UrlDecode(encodedSig)
  if (expected.length !== received.length) return null
  if (!timingSafeEqual(expected, received)) return null

  return payload
}
