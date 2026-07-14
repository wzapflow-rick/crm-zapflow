import "server-only"
import { getTarefas } from "@/lib/tarefas-db"
import { getEventos } from "@/lib/eventos-db"
import { getMembros } from "@/lib/membros-db"
import { getClientes } from "@/lib/clientes-db"
import { TIPOS_EVENTO } from "@/lib/eventos-types"

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

  // Tarefas não concluídas com prazo até hoje (hoje + atrasadas).
  const relevantes = tarefas.filter(
    (t) => t.status !== "concluido" && t.prazo && t.prazo <= hoje,
  )

  // Agrupa por responsável (nome). Sem responsável vai para um balde próprio.
  const grupos = new Map<string, { hoje: typeof relevantes; atrasadas: typeof relevantes }>()
  for (const t of relevantes) {
    const chave = nomeMembro(t.responsavelId) || "Sem responsável"
    if (!grupos.has(chave)) grupos.set(chave, { hoje: [], atrasadas: [] })
    const balde = grupos.get(chave)!
    if (t.prazo === hoje) balde.hoje.push(t)
    else balde.atrasadas.push(t)
  }

  // Compromissos da agenda para hoje.
  const compromissosHoje = eventos
    .filter((e) => e.data === hoje)
    .sort((a, b) => (a.hora || "99:99").localeCompare(b.hora || "99:99"))

  const linhas: string[] = []
  linhas.push(`*☀️ Bom dia, SIMPLE!*`)
  linhas.push(`_Afazeres de ${dataBonita(hoje)}_`)
  linhas.push("")

  let temItens = false

  // Seção de tarefas por responsável.
  const chavesOrdenadas = [...grupos.keys()].sort((a, b) => {
    // "Sem responsável" por último; o resto em ordem alfabética.
    if (a === "Sem responsável") return 1
    if (b === "Sem responsável") return -1
    return a.localeCompare(b)
  })

  if (chavesOrdenadas.length > 0) {
    temItens = true
    linhas.push(`*✅ Tarefas*`)
    for (const chave of chavesOrdenadas) {
      const { hoje: deHoje, atrasadas } = grupos.get(chave)!
      linhas.push("")
      linhas.push(`*👤 ${chave}*`)
      for (const t of atrasadas) {
        const cli = nomeCliente(t.clienteId)
        linhas.push(`⚠️ ${t.titulo}${cli ? ` — ${cli}` : ""} _(atrasada · ${dataBonita(t.prazo)})_`)
      }
      for (const t of deHoje) {
        const cli = nomeCliente(t.clienteId)
        linhas.push(`• ${t.titulo}${cli ? ` — ${cli}` : ""}`)
      }
    }
    linhas.push("")
  }

  // Seção de compromissos.
  if (compromissosHoje.length > 0) {
    temItens = true
    linhas.push(`*📅 Compromissos de hoje*`)
    for (const e of compromissosHoje) {
      const cli = nomeCliente(e.clienteId)
      const hora = e.hora ? `${e.hora} · ` : ""
      linhas.push(`• ${hora}${e.titulo} _(${labelTipo(e.tipo)})_${cli ? ` — ${cli}` : ""}`)
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
