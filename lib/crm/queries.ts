import "server-only"
import { isDbConfigured, query, queryOne } from "@/lib/db"
import {
  membros as membrosMock,
  conversas as conversasMock,
  eventos as eventosMock,
  tarefas as tarefasMock,
  negocios as negociosMock,
  etapas as etapasMock,
  type Membro,
  type Conversa,
  type Mensagem,
  type Evento,
  type Tarefa,
  type Negocio,
  type Papel,
  type StatusConversa,
  type TipoEvento,
} from "@/lib/zapflow-data"

// ---------------------------------------------------------------------------
// Empresa (tenant) ativa. No protótipo usamos a empresa de slug "zapflow".
// Quando houver login real, troque por: empresa do usuário autenticado.
// ---------------------------------------------------------------------------
export async function getEmpresaAtivaId(): Promise<string | null> {
  if (!isDbConfigured) return "demo"
  const row = await queryOne<{ id: string }>(
    `SELECT id FROM empresas WHERE slug = $1 LIMIT 1`,
    ["zapflow"],
  )
  return row?.id ?? null
}

// ---------------------------------------------------------------------------
// Membros
// ---------------------------------------------------------------------------
export async function getMembros(empresaId: string): Promise<Membro[]> {
  if (!isDbConfigured) return membrosMock

  const rows = await query<{
    id: string
    nome: string
    papel: Papel
    iniciais: string | null
    cor: string | null
    online: boolean
    email: string
    telefone: string | null
    cargo: string | null
    entrou_em: Date | null
    status: Membro["status"]
  }>(
    `SELECT id, nome, papel, iniciais, cor, online, email, telefone, cargo, entrou_em, status
     FROM membros WHERE empresa_id = $1 ORDER BY papel, nome`,
    [empresaId],
  )

  return rows.map((r) => ({
    id: r.id,
    nome: r.nome,
    papel: r.papel,
    iniciais: r.iniciais ?? r.nome.slice(0, 2).toUpperCase(),
    cor: r.cor ?? "bg-chart-1",
    online: r.online,
    email: r.email,
    telefone: r.telefone ?? "",
    cargo: r.cargo ?? "",
    entrouEm: r.entrou_em
      ? r.entrou_em.toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
      : "",
    status: r.status,
  }))
}

// ---------------------------------------------------------------------------
// Conversas + mensagens (inbox)
// ---------------------------------------------------------------------------
const horaBR = (d: Date) =>
  d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })

export async function getConversas(empresaId: string): Promise<Conversa[]> {
  if (!isDbConfigured) return conversasMock

  const convs = await query<{
    id: string
    contato_nome: string
    contato_telefone: string
    iniciais: string | null
    cor: string | null
    status: StatusConversa
    responsavel_id: string | null
    tags: string[]
    nao_lidas: number
    ultima_atividade: Date
  }>(
    `SELECT id, contato_nome, contato_telefone, iniciais, cor, status,
            responsavel_id, tags, nao_lidas, ultima_atividade
     FROM conversas WHERE empresa_id = $1 ORDER BY ultima_atividade DESC`,
    [empresaId],
  )

  const msgs = await query<{
    id: string
    conversa_id: string
    autor: "cliente" | "atendente"
    conteudo: string
    enviada_em: Date
    membro_nome: string | null
  }>(
    `SELECT m.id, m.conversa_id, m.autor, m.conteudo, m.enviada_em, mb.nome AS membro_nome
     FROM mensagens m
     LEFT JOIN membros mb ON mb.id = m.membro_id
     WHERE m.empresa_id = $1
     ORDER BY m.enviada_em ASC`,
    [empresaId],
  )

  const porConversa = new Map<string, Mensagem[]>()
  for (const m of msgs) {
    const lista = porConversa.get(m.conversa_id) ?? []
    lista.push({
      id: m.id,
      conteudo: m.conteudo,
      hora: horaBR(m.enviada_em),
      deMim: m.autor === "atendente",
      autor: m.membro_nome ?? undefined,
    })
    porConversa.set(m.conversa_id, lista)
  }

  return convs.map((c) => {
    const mensagens = porConversa.get(c.id) ?? []
    const ultima = mensagens[mensagens.length - 1]
    return {
      id: c.id,
      contatoNome: c.contato_nome,
      contatoTelefone: c.contato_telefone,
      iniciais: c.iniciais ?? c.contato_nome.slice(0, 2).toUpperCase(),
      cor: c.cor ?? "bg-chart-2",
      ultimaMensagem: ultima?.conteudo ?? "",
      ultimaHora: horaBR(c.ultima_atividade),
      naoLidas: c.nao_lidas,
      status: c.status,
      responsavelId: c.responsavel_id,
      tags: c.tags ?? [],
      mensagens,
    }
  })
}

// ---------------------------------------------------------------------------
// Negócios (pipeline)
// ---------------------------------------------------------------------------
// Mapeia o título da etapa para o id-slug usado pela UI do Kanban.
const tituloParaEtapaId: Record<string, Negocio["etapa"]> = {
  "Novo lead": "novo",
  Qualificação: "qualificacao",
  "Demo enviada": "demo",
  Proposta: "proposta",
  Ganho: "ganho",
  Perdido: "perdido",
}

export async function getNegocios(empresaId: string): Promise<Negocio[]> {
  if (!isDbConfigured) return negociosMock

  const rows = await query<{
    id: string
    nome_lead: string
    contato: string | null
    iniciais: string | null
    cor: string | null
    valor: string
    etapa_titulo: string | null
    responsavel_id: string | null
    origem: Negocio["origem"] | null
    tags: string[]
    updated_at: Date
  }>(
    `SELECT n.id, n.nome_lead, n.contato, n.iniciais, n.cor, n.valor,
            e.titulo AS etapa_titulo, n.responsavel_id, n.origem, n.tags, n.updated_at
     FROM negocios n
     LEFT JOIN etapas e ON e.id = n.etapa_id
     WHERE n.empresa_id = $1
     ORDER BY n.updated_at DESC`,
    [empresaId],
  )

  return rows.map((r) => ({
    id: r.id,
    empresa: r.nome_lead,
    contato: r.contato ?? "",
    iniciais: r.iniciais ?? r.nome_lead.slice(0, 2).toUpperCase(),
    cor: r.cor ?? "bg-chart-2",
    valor: Number(r.valor),
    etapa: (r.etapa_titulo && tituloParaEtapaId[r.etapa_titulo]) || "novo",
    responsavelId: r.responsavel_id ?? "",
    origem: r.origem ?? "WhatsApp",
    atualizadoEm: r.updated_at.toLocaleDateString("pt-BR"),
    tags: r.tags ?? [],
  }))
}

// ---------------------------------------------------------------------------
// Eventos (agenda)
// ---------------------------------------------------------------------------
export async function getEventos(empresaId: string): Promise<Evento[]> {
  if (!isDbConfigured) return eventosMock

  const rows = await query<{
    id: string
    titulo: string
    tipo: TipoEvento
    responsavel_id: string | null
    inicio: Date
    fim: Date | null
  }>(
    `SELECT id, titulo, tipo, responsavel_id, inicio, fim
     FROM eventos WHERE empresa_id = $1 ORDER BY inicio ASC`,
    [empresaId],
  )

  return rows.map((r) => {
    // getDay(): 0=domingo..6=sábado. UI usa 0=segunda..4=sexta.
    const dia = (r.inicio.getDay() + 6) % 7
    return {
      id: r.id,
      titulo: r.titulo,
      tipo: r.tipo,
      inicio: horaBR(r.inicio),
      fim: r.fim ? horaBR(r.fim) : "",
      responsavelId: r.responsavel_id ?? "",
      diaSemana: Math.min(dia, 4),
      concluido: false,
    }
  })
}

// ---------------------------------------------------------------------------
// Tarefas (pendências)
// ---------------------------------------------------------------------------
export async function getTarefas(empresaId: string): Promise<Tarefa[]> {
  if (!isDbConfigured) return tarefasMock

  const rows = await query<{
    id: string
    titulo: string
    responsavel_id: string | null
    prazo: Date | null
    status: Tarefa["status"]
  }>(
    `SELECT id, titulo, responsavel_id, prazo, status
     FROM tarefas WHERE empresa_id = $1 ORDER BY prazo ASC NULLS LAST`,
    [empresaId],
  )

  return rows.map((r) => ({
    id: r.id,
    titulo: r.titulo,
    responsavelId: r.responsavel_id ?? "",
    prazo: r.prazo ? r.prazo.toLocaleDateString("pt-BR") : "",
    prioridade: "media",
    status: r.status,
  }))
}

// Etapas do pipeline (para colunas dinâmicas no futuro).
export function getEtapasMock() {
  return etapasMock
}
