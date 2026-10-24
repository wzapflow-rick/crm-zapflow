import { ROTULO_ESTRUTURA, type EstruturaRoteiro } from "@/lib/playbook-conteudo"

export type CenaRoteiro = {
  descricao: string
  tempo?: string
  textoTela?: string
}

export type RoteiroGerado = {
  estrutura?: EstruturaRoteiro
  gancho: string
  ganchoVisual?: string
  textoTelaGancho?: string
  cenas: CenaRoteiro[]
  cta: string
  legenda: string
  direcionamento: string
  variacoesGancho: string[]
}

// Monta o texto final do roteiro (estrutura + gancho + cenas com tempo e texto na tela + CTA)
// para gravar no campo "roteiro" do conteúdo ou editar no textarea do pipeline.
export function montarTextoRoteiro(r: RoteiroGerado): string {
  const linhas: string[] = []
  if (r.estrutura) linhas.push(`ESTRUTURA: ${ROTULO_ESTRUTURA[r.estrutura]}`, "")
  linhas.push(`GANCHO: ${r.gancho}`)
  if (r.ganchoVisual) linhas.push(`Visual: ${r.ganchoVisual}`)
  if (r.textoTelaGancho) linhas.push(`Texto na tela: ${r.textoTelaGancho}`)
  linhas.push("")
  r.cenas.forEach((c, i) => {
    const tempo = c.tempo ? ` [${c.tempo}]` : ""
    linhas.push(`${i + 1}.${tempo} ${c.descricao}`)
    if (c.textoTela) linhas.push(`   Texto na tela: ${c.textoTela}`)
  })
  if (r.cta) linhas.push("", `CTA: ${r.cta}`)
  return linhas.join("\n")
}
