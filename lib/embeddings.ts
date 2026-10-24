import "server-only"

// Embeddings via API REST oficial da OpenAI, usando OPENAI_API_KEY.
//
// Motivo de não usar o AI SDK (embedMany) aqui: a combinação de versões
// instalada (ai + @ai-sdk/openai) quebra na etapa de embeddings com
// "a.data.slice is not a function". O AI Gateway também não é uma opção neste
// projeto (exige cartão de crédito). A chamada direta ao endpoint retorna o
// formato previsível { data: [{ index, embedding }] } e é mais robusta.

const MODELO_EMBEDDING = "text-embedding-3-small"
const ENDPOINT = "https://api.openai.com/v1/embeddings"
// A OpenAI aceita até 2048 entradas por chamada; usamos um lote conservador
// para manter payloads pequenos e previsíveis.
const MAX_POR_CHAMADA = 96

export async function gerarEmbeddings(textos: string[]): Promise<number[][]> {
  if (textos.length === 0) return []

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY ausente: não é possível gerar embeddings.")
  }

  const resultado: number[][] = []

  for (let inicio = 0; inicio < textos.length; inicio += MAX_POR_CHAMADA) {
    const lote = textos.slice(inicio, inicio + MAX_POR_CHAMADA)

    const resposta = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODELO_EMBEDDING,
        input: lote,
        encoding_format: "float",
      }),
    })

    if (!resposta.ok) {
      const detalhe = await resposta.text().catch(() => "")
      throw new Error(`OpenAI embeddings ${resposta.status}: ${detalhe.slice(0, 300)}`)
    }

    const json = (await resposta.json()) as { data?: { index?: number; embedding: number[] }[] }
    const dados = Array.isArray(json.data) ? [...json.data] : []
    // Garante a ordem por index para casar 1:1 com o lote enviado.
    dados.sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    for (const item of dados) resultado.push(item.embedding)
  }

  return resultado
}
