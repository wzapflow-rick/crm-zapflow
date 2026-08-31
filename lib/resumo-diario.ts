import "server-only"
import { getTarefas } from "@/lib/tarefas-db"
import { getEventos } from "@/lib/eventos-db"
import { getMembros } from "@/lib/membros-db"
import { getClientes } from "@/lib/clientes-db"
import { TIPOS_EVENTO, calcularDuracao } from "@/lib/eventos-types"

// Data de "hoje" no fuso de São Paulo (o servidor roda em UTC).
// en-CA formata como YYYY-MM-DD.
export function hojeSaoPaulo(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

function dataBonita(iso: string): string {
  const [ano, mes, dia] = iso.split("-")
  return `${dia}/${mes}/${ano}`
}

function labelTipo(tipo: string): string {
  return TIPOS_EVENTO.find((t) => t.id === tipo)?.label ?? "Compromisso"
}

// Monta o texto do resumo diário para o grupo dos sócios (formatação WhatsApp).
export async function montarResumoDiario(): Promise<{ texto: string; temItens: boolean }> {
  const hoje = hojeSaoPaulo()

  const [tarefas, eventos, membros, clientes] = await Promise.all([
    getTarefas(),
    getEventos(),
    getMembros(),
    getClientes().catch(() => [] as Awaited<ReturnType<typeof getClientes>>),
  ])

  const nomeMembro = (id: string) => membros.find((m) => m.id === id)?.nome ?? ""
  const nomeCliente = (id: string) => clientes.find((c) => c.id === id)?.nome ?? ""

  // Ordena um mapa de responsáveis: "Sem responsável" por último, resto alfabético.
  function ordenarChaves<T>(mapa: Map<string, T>): string[] {
    return [...mapa.keys()].sort((a, b) => {
      if (a === "Sem responsável") return 1
      if (b === "Sem responsável") return -1
      return a.localeCompare(b)
    })
  }

  // Tarefas não concluídas: separadas em atrasadas (prazo < hoje) e de hoje.
  const atrasadas = tarefas.filter((t) => t.status !== "concluido" && t.prazo && t.prazo < hoje)
  const deHojeLista = tarefas.filter((t) => t.status !== "concluido" && t.prazo && t.prazo === hoje)

  // Agrupa por responsável (nome).
  const gruposAtrasadas = new Map<string, typeof atrasadas>()
  for (const t of atrasadas) {
    const chave = nomeMembro(t.responsavelId) || "Sem responsável"
    if (!gruposAtrasadas.has(chave)) gruposAtrasadas.set(chave, [])
    gruposAtrasadas.get(chave)!.push(t)
  }
  const gruposHoje = new Map<string, typeof deHojeLista>()
  for (const t of deHojeLista) {
    const chave = nomeMembro(t.responsavelId) || "Sem responsável"
    if (!gruposHoje.has(chave)) gruposHoje.set(chave, [])
    gruposHoje.get(chave)!.push(t)
  }

  // Compromissos da agenda para hoje.
  const compromissosHoje = eventos
    .filter((e) => e.data === hoje)
    .sort((a, b) => (a.hora || "99:99").localeCompare(b.hora || "99:99"))

  const linhas: string[] = []
  linhas.push(`*Bom dia TIME! 💜*`)
  linhas.push(`_Afazeres de ${dataBonita(hoje)}_`)
  linhas.push("")

  let temItens = false

  // Seção destacada de tarefas ATRASADAS (aparece primeiro para chamar atenção).
  if (gruposAtrasadas.size > 0) {
    temItens = true
    linhas.push(`*🚨 TAREFAS ATRASADAS (${atrasadas.length})*`)
    for (const chave of ordenarChaves(gruposAtrasadas)) {
      const lista = gruposAtrasadas.get(chave)!
      linhas.push("")
      linhas.push(`*👤 ${chave}*`)
      for (const t of lista) {
        const cli = nomeCliente(t.clienteId)
        linhas.push(`⚠️ ${t.titulo}${cli ? ` — ${cli}` : ""} _(venceu ${dataBonita(t.prazo)})_`)
      }
    }
    linhas.push("")
  }

  // Seção de tarefas de hoje por responsável.
  if (gruposHoje.size > 0) {
    temItens = true
    linhas.push(`*✅ Tarefas de hoje*`)
    for (const chave of ordenarChaves(gruposHoje)) {
      const lista = gruposHoje.get(chave)!
      linhas.push("")
      linhas.push(`*👤 ${chave}*`)
      for (const t of lista) {
        const cli = nomeCliente(t.clienteId)
        linhas.push(`• ${t.titulo}${cli ? ` — ${cli}` : ""}`)
      }
    }
    linhas.push("")
  }

  // Seção de compromissos (com intervalo e duração quando houver hora final).
  if (compromissosHoje.length > 0) {
    temItens = true
    linhas.push(`*📅 Compromissos de hoje*`)
    for (const e of compromissosHoje) {
      const cli = nomeCliente(e.clienteId)
      const duracao = calcularDuracao(e.hora, e.horaFim)
      const intervalo = e.hora ? (e.horaFim ? `${e.hora}–${e.horaFim}` : e.hora) : ""
      const horaLabel = intervalo ? `${intervalo}${duracao ? ` (${duracao})` : ""} · ` : ""
      linhas.push(`• ${horaLabel}${e.titulo} _(${labelTipo(e.tipo)})_${cli ? ` — ${cli}` : ""}`)
    }
    linhas.push("")
  }

  if (!temItens) {
    linhas.push("🎉 Nenhuma tarefa vencendo hoje, nada atrasado e sem compromissos na agenda. Bom dia tranquilo!")
  }

  linhas.push("—")
  linhas.push("_Enviado automaticamente pelo SIMPLE OS_")

  return { texto: linhas.join("\n"), temItens }
}
