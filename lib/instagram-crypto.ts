import "server-only"
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"

// Criptografa o access token do Instagram em repouso (AES-256-GCM).
// A chave vem de INSTAGRAM_TOKEN_SECRET (qualquer string forte); derivamos
// 32 bytes com SHA-256 para não depender do tamanho exato do segredo.
// Formato armazenado: base64(iv).base64(authTag).base64(ciphertext)

function getKey(): Buffer {
  const segredo = process.env.INSTAGRAM_TOKEN_SECRET
  if (!segredo) {
    throw new Error(
      "INSTAGRAM_TOKEN_SECRET não configurada. Necessária para guardar o token do Instagram com segurança.",
    )
  }
  return createHash("sha256").update(segredo).digest()
}

export function tokenSecretConfigurado(): boolean {
  return Boolean(process.env.INSTAGRAM_TOKEN_SECRET)
}

export function criptografarToken(texto: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv)
  const enc = Buffer.concat([cipher.update(texto, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString("base64")}.${tag.toString("base64")}.${enc.toString("base64")}`
}

export function descriptografarToken(armazenado: string): string {
  const [ivB64, tagB64, dataB64] = armazenado.split(".")
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Token do Instagram em formato inválido.")
  }
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64, "base64"))
  decipher.setAuthTag(Buffer.from(tagB64, "base64"))
  const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()])
  return dec.toString("utf8")
}
