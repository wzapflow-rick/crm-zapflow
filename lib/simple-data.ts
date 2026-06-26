// Dados de exemplo (mock) do SIMPLE OS.
// Quando ligarmos no PostgreSQL, estes tipos viram o shape das tabelas/respostas
// reais. Mantidos aqui para o protótipo de UI.

export type Fundador = {
  id: string
  nome: string
  papel: string
  iniciais: string
  cor: string // classe de cor de fundo do avatar
}

export const fundadores: Fundador[] = [
  { id: "u1", nome: "Rick", papel: "CEO & Estratégia", iniciais: "RK", cor: "bg-primary" },
  { id: "u2", nome: "Lara", papel: "Head de Conteúdo", iniciais: "LR", cor: "bg-chart-3" },
  { id: "u3", nome: "Téo", papel: "Comercial & Growth", iniciais: "TO", cor: "bg-chart-4" },
]

// ── Dashboard ────────────────────────────────────────────────────────────────

export type StatusCliente = "ativo" | "onboarding" | "pausado"

export type Cliente = {
  id: string
  nome: string
  segmento: string
  status: StatusCliente
  responsavelId: string
  mrr: number
  iniciais: string
  cor: string
}

export const clientes: Cliente[] = [
  { id: "c1", nome: "Studio Verde", segmento: "Arquitetura", status: "ativo", responsavelId: "u2", mrr: 4800, iniciais: "SV", cor: "bg-chart-4" },
  { id: "c2", nome: "Clínica Aurora", segmento: "Saúde", status: "ativo", responsavelId: "u1", mrr: 6200, iniciais: "CA", cor: "bg-primary" },
  { id: "c3", nome: "Café Norte", segmento: "Alimentação", status: "ativo", responsavelId: "u3", mrr: 3500, iniciais: "CN", cor: "bg-chart-3" },
  { id: "c4", nome: "Lumen Joias", segmento: "Varejo", status: "onboarding", responsavelId: "u2", mrr: 5400, iniciais: "LJ", cor: "bg-chart-5" },
  { id: "c5", nome: "Forte Academia", segmento: "Fitness", status: "ativo", responsavelId: "u3", mrr: 2900, iniciais: "FA", cor: "bg-chart-4" },
  { id: "c6", nome: "Vale Imóveis", segmento: "Imobiliário", status: "pausado", responsavelId: "u1", mrr: 0, iniciais: "VI", cor: "bg-chart-5" },
]

export const metaMensal = 35000
export const receitaAtual = clientes.reduce((acc, c) => acc + c.mrr, 0)
export const clientesAtivos = clientes.filter((c) => c.status === "ativo").length

// Receita mês a mês (MRR) — últimos 7 meses
export const receitaMensal = [
  { mes: "Dez", valor: 14200 },
  { mes: "Jan", valor: 16800 },
  { mes: "Fev", valor: 18500 },
  { mes: "Mar", valor: 19900 },
  { mes: "Abr", valor: 22400 },
  { mes: "Mai", valor: 24100 },
  { mes: "Jun", valor: receitaAtual },
]

export type Gravacao = {
  id: string
  clienteId: string
  titulo: string
  data: string // dd/mm
  hora: string
}

export const proximasGravacoes: Gravacao[] = [
  { id: "g1", clienteId: "c2", titulo: "Série de reels — bastidores", data: "27/06", hora: "09:00" },
  { id: "g2", clienteId: "c1", titulo: "Institucional do escritório", data: "28/06", hora: "14:00" },
  { id: "g3", clienteId: "c3", titulo: "Lançamento do novo blend", data: "01/07", hora: "10:30" },
]

export type Prioridade = "alta" | "media" | "baixa"

export type Tarefa = {
  id: string
  titulo: string
  clienteId: string | null
  responsavelId: string
  prazo: string
  prioridade: Prioridade
}

export const tarefasUrgentes: Tarefa[] = [
  { id: "t1", titulo: "Aprovar roteiro do reel institucional", clienteId: "c1", responsavelId: "u2", prazo: "Hoje", prioridade: "alta" },
  { id: "t2", titulo: "Enviar proposta — Lumen Joias", clienteId: "c4", responsavelId: "u3", prazo: "Hoje", prioridade: "alta" },
  { id: "t3", titulo: "Finalizar calendário de julho", clienteId: "c2", responsavelId: "u1", prazo: "Amanhã", prioridade: "media" },
  { id: "t4", titulo: "Revisar edição — Café Norte", clienteId: "c3", responsavelId: "u2", prazo: "28/06", prioridade: "media" },
]

export type StatusLead = "novo" | "contato" | "reuniao" | "proposta" | "negociacao"

export type Lead = {
  id: string
  nome: string
  empresa: string
  valor: number
  status: StatusLead
  responsavelId: string
}

export const leadsAbertos: Lead[] = [
  { id: "l1", nome: "Marina Reis", empresa: "Doce Vida Confeitaria", valor: 3200, status: "proposta", responsavelId: "u3" },
  { id: "l2", nome: "Paulo Tavares", empresa: "PT Advocacia", valor: 4500, status: "reuniao", responsavelId: "u3" },
  { id: "l3", nome: "Bianca Lopes", empresa: "Estúdio Pilates", valor: 2800, status: "contato", responsavelId: "u1" },
]

export const insightsSemana = [
  "Café Norte cresceu 38% em alcance após a série de bastidores.",
  "Taxa de aprovação de roteiros subiu para 92% este mês.",
  "Lumen Joias está pronta para sair do onboarding na próxima semana.",
]

// ── Brand Book ────────────────────────────────────────────────────────────────

export type Valor = {
  titulo: string
  descricao: string
}

export const valores: Valor[] = [
  { titulo: "Simplicidade radical", descricao: "Removemos o ruído. O que importa fica óbvio. O resto, fora." },
  { titulo: "Resultado é o que conta", descricao: "Nada existe na SIMPLE sem gerar crescimento para um cliente ou para a empresa." },
  { titulo: "Tudo tem dono", descricao: "Cada entrega pertence a alguém. Clareza de responsabilidade em tudo." },
  { titulo: "Verdade sem rodeios", descricao: "Comunicação direta, honesta e respeitosa. Sempre." },
  { titulo: "Obsessão por padrão", descricao: "Toda entrega nasce do Método SIMPLE. Consistência é nossa assinatura." },
  { titulo: "Crescer junto", descricao: "Quando o cliente cresce, a SIMPLE cresce. Estamos no mesmo barco." },
]

export const visao = [
  { horizonte: "3 anos", texto: "Ser a referência regional em conteúdo que gera clientes para negócios locais." },
  { horizonte: "5 anos", texto: "Operar com um método tão sólido que escala sem perder a alma." },
  { horizonte: "10 anos", texto: "Transformar a forma como pequenas empresas crescem através de conteúdo no Brasil." },
]

export const somosNaoSomos = {
  somos: [
    "Parceiros de crescimento",
    "Diretos e estratégicos",
    "Obcecados por resultado",
    "Criativos com método",
  ],
  naoSomos: [
    "Apenas mais uma agência",
    "Vendedores de seguidores",
    "Reféns de tendências vazias",
    "Improvisadores sem processo",
  ],
}

export const metodoSimple = [
  { letra: "S", titulo: "Sentir", descricao: "Onboarding, briefing e análise inicial." },
  { letra: "I", titulo: "Investigar", descricao: "Concorrentes, mercado e público." },
  { letra: "M", titulo: "Mapear", descricao: "Estratégia, planejamento e calendário." },
  { letra: "P", titulo: "Produzir", descricao: "Gravação, edição, design e copy." },
  { letra: "L", titulo: "Lançar", descricao: "Publicação e ativação no momento certo." },
  { letra: "E", titulo: "Evoluir", descricao: "Análise, otimização e próximo ciclo." },
]
