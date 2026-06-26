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
  objetivo: string
  contato: string
  telefone: string
  desde: string // mês/ano de início (exibição)
  desdeISO?: string // YYYY-MM-DD (para edição)
  resumoEstrategico?: string
}

export type Meta = {
  id: string
  rotulo: string
  atual: number
  alvo: number
  unidade?: string
}

export const clientes: Cliente[] = [
  { id: "c1", nome: "Studio Verde", segmento: "Arquitetura", status: "ativo", responsavelId: "u2", mrr: 4800, iniciais: "SV", cor: "bg-chart-4", objetivo: "Posicionar como referência em arquitetura sustentável e gerar 8 reuniões qualificadas por mês.", contato: "Renata Vidal", telefone: "(11) 98812-4410", desde: "Fev 2025" },
  { id: "c2", nome: "Clínica Aurora", segmento: "Saúde", status: "ativo", responsavelId: "u1", mrr: 6200, iniciais: "CA", cor: "bg-primary", objetivo: "Aumentar agendamentos de consultas estéticas em 30% via conteúdo educativo.", contato: "Dr. André Mota", telefone: "(11) 99731-2200", desde: "Nov 2024" },
  { id: "c3", nome: "Café Norte", segmento: "Alimentação", status: "ativo", responsavelId: "u3", mrr: 3500, iniciais: "CN", cor: "bg-chart-3", objetivo: "Lotar o salão nos fins de semana e lançar o novo blend com bastidores.", contato: "Júlia Prado", telefone: "(11) 98140-7765", desde: "Jan 2025" },
  { id: "c4", nome: "Lumen Joias", segmento: "Varejo", status: "onboarding", responsavelId: "u2", mrr: 5400, iniciais: "LJ", cor: "bg-chart-5", objetivo: "Construir desejo de marca e preparar a campanha de Dia das Mães.", contato: "Sofia Lemos", telefone: "(11) 99002-8841", desde: "Jun 2025" },
  { id: "c5", nome: "Forte Academia", segmento: "Fitness", status: "ativo", responsavelId: "u3", mrr: 2900, iniciais: "FA", cor: "bg-chart-4", objetivo: "Captar matrículas com prova social e desafios mensais.", contato: "Bruno Sales", telefone: "(11) 98455-1190", desde: "Mar 2025" },
  { id: "c6", nome: "Vale Imóveis", segmento: "Imobiliário", status: "pausado", responsavelId: "u1", mrr: 0, iniciais: "VI", cor: "bg-chart-5", objetivo: "Retomada planejada para o 2º semestre com foco em lançamentos.", contato: "Carlos Vale", telefone: "(11) 99680-3321", desde: "Set 2024" },
]

export const clientePorId = (id: string) => clientes.find((c) => c.id === id)

// ── Detalhe do cliente (submódulos) ──────────────────────────────────────────

export type StatusConteudo = "ideia" | "roteiro" | "gravacao" | "edicao" | "aprovacao" | "publicado"

export type ConteudoItem = {
  id: string
  clienteId: string
  titulo: string
  formato: "Reels" | "Carrossel" | "Story" | "Vídeo" | "Estático"
  status: StatusConteudo
  data: string
  dataISO?: string // YYYY-MM-DD (para edição)
}

export type EventoCliente = {
  id: string
  clienteId: string
  titulo: string
  tipo: "gravacao" | "post" | "entrega" | "reuniao"
  data: string
  hora: string
  dataISO?: string // YYYY-MM-DD (para edição)
}

export type Mensagem = {
  id: string
  clienteId: string
  autorId: string
  data: string
  texto: string
}

export type Arquivo = {
  id: string
  clienteId: string
  nome: string
  tipo: "Branding" | "Material" | "Drive" | "Contrato"
  tamanho: string
}

export type MetricaResultado = {
  rotulo: string
  valor: string
  variacao: number // % vs mês anterior
}

export type DetalheCliente = {
  resumoEstrategico: string
  metas: { rotulo: string; atual: number; alvo: number; unidade: string }[]
  estrategiaAtual: string[]
  insights: string[]
  concorrentes: string[]
  resultados: MetricaResultado[]
}

export const detalhesCliente: Record<string, DetalheCliente> = {
  c1: {
    resumoEstrategico:
      "Studio Verde tem autoridade técnica, mas comunica pouco. A estratégia é transformar projetos reais em conteúdo de bastidor e prova de valor, aproximando o público de alto padrão.",
    metas: [
      { rotulo: "Reuniões qualificadas / mês", atual: 6, alvo: 8, unidade: "" },
      { rotulo: "Alcance mensal", atual: 84000, alvo: 120000, unidade: "" },
      { rotulo: "Posts publicados / mês", atual: 12, alvo: 16, unidade: "" },
    ],
    estrategiaAtual: [
      "Série mensal de bastidores de obra em reels.",
      "Carrosséis educativos sobre arquitetura sustentável.",
      "Depoimentos de clientes em vídeo curto.",
    ],
    insights: [
      "Conteúdo de bastidor teve 2,3x mais salvamentos que institucional.",
      "Melhor horário de publicação: terças e quintas, 19h.",
    ],
    concorrentes: ["Atelier Mata", "Forma & Função", "Casa Linha"],
    resultados: [
      { rotulo: "Alcance", valor: "84,2 mil", variacao: 18 },
      { rotulo: "Seguidores", valor: "12,4 mil", variacao: 6 },
      { rotulo: "Reuniões", valor: "6", variacao: 20 },
      { rotulo: "Engajamento", valor: "5,1%", variacao: 12 },
    ],
  },
  c2: {
    resumoEstrategico:
      "Clínica Aurora vende confiança. O foco é educar sobre procedimentos com leveza e autoridade médica, convertendo dúvidas em agendamentos.",
    metas: [
      { rotulo: "Agendamentos / mês", atual: 42, alvo: 55, unidade: "" },
      { rotulo: "Alcance mensal", atual: 156000, alvo: 180000, unidade: "" },
      { rotulo: "Posts publicados / mês", atual: 18, alvo: 20, unidade: "" },
    ],
    estrategiaAtual: [
      "Vídeos 'mitos e verdades' com o Dr. André.",
      "Stories de bastidor de atendimento humanizado.",
      "Antes e depois com consentimento e enquadramento ético.",
    ],
    insights: [
      "Vídeos com o médico falando geram 40% mais comentários.",
      "Taxa de conversão de story para WhatsApp subiu para 9%.",
    ],
    concorrentes: ["Espaço Lumina", "Clínica Belle", "Derma Center"],
    resultados: [
      { rotulo: "Alcance", valor: "156 mil", variacao: 22 },
      { rotulo: "Agendamentos", valor: "42", variacao: 31 },
      { rotulo: "Seguidores", valor: "28,9 mil", variacao: 9 },
      { rotulo: "Engajamento", valor: "6,8%", variacao: 15 },
    ],
  },
  c3: {
    resumoEstrategico:
      "Café Norte é experiência. A estratégia explora o sensorial e a comunidade local, com bastidores do preparo e lançamentos sazonais.",
    metas: [
      { rotulo: "Fluxo fim de semana", atual: 70, alvo: 100, unidade: "%" },
      { rotulo: "Alcance mensal", atual: 62000, alvo: 90000, unidade: "" },
      { rotulo: "Posts publicados / mês", atual: 14, alvo: 16, unidade: "" },
    ],
    estrategiaAtual: [
      "Bastidores do novo blend em série de reels.",
      "Conteúdo de comunidade: clientes e história do café.",
      "Parcerias com criadores locais.",
    ],
    insights: [
      "Série de bastidores cresceu o alcance em 38%.",
      "Posts publicados pela manhã performam melhor.",
    ],
    concorrentes: ["Grão Vivo", "Café da Esquina", "Torra Lenta"],
    resultados: [
      { rotulo: "Alcance", valor: "62,1 mil", variacao: 38 },
      { rotulo: "Seguidores", valor: "8,7 mil", variacao: 11 },
      { rotulo: "Visitas / fim de semana", valor: "+34%", variacao: 34 },
      { rotulo: "Engajamento", valor: "7,2%", variacao: 19 },
    ],
  },
}

const detalhePadrao: DetalheCliente = {
  resumoEstrategico:
    "Cliente em fase inicial. Estratégia em definição junto ao time da SIMPLE durante o onboarding.",
  metas: [
    { rotulo: "Posts publicados / mês", atual: 0, alvo: 12, unidade: "" },
    { rotulo: "Alcance mensal", atual: 0, alvo: 60000, unidade: "" },
  ],
  estrategiaAtual: ["Definição de posicionamento em andamento.", "Coleta de materiais e briefing inicial."],
  insights: ["Aguardando primeiros dados de publicação."],
  concorrentes: ["A mapear"],
  resultados: [
    { rotulo: "Alcance", valor: "—", variacao: 0 },
    { rotulo: "Seguidores", valor: "—", variacao: 0 },
  ],
}

export const detalheClientePorId = (id: string) => detalhesCliente[id] ?? detalhePadrao

export const eventosCliente: EventoCliente[] = [
  { id: "ec1", clienteId: "c2", titulo: "Gravação — mitos e verdades", tipo: "gravacao", data: "27/06", hora: "09:00" },
  { id: "ec2", clienteId: "c2", titulo: "Post — carrossel skincare", tipo: "post", data: "29/06", hora: "12:00" },
  { id: "ec3", clienteId: "c2", titulo: "Entrega — edição de junho", tipo: "entrega", data: "30/06", hora: "18:00" },
  { id: "ec4", clienteId: "c1", titulo: "Gravação — institucional", tipo: "gravacao", data: "28/06", hora: "14:00" },
  { id: "ec5", clienteId: "c1", titulo: "Reunião de alinhamento", tipo: "reuniao", data: "02/07", hora: "10:00" },
  { id: "ec6", clienteId: "c3", titulo: "Gravação — novo blend", tipo: "gravacao", data: "01/07", hora: "10:30" },
  { id: "ec7", clienteId: "c3", titulo: "Post — bastidores", tipo: "post", data: "03/07", hora: "08:00" },
]

export const conteudosCliente: ConteudoItem[] = [
  { id: "cn1", clienteId: "c2", titulo: "Mitos e verdades sobre botox", formato: "Reels", status: "aprovacao", data: "27/06" },
  { id: "cn2", clienteId: "c2", titulo: "Skincare: por onde começar", formato: "Carrossel", status: "edicao", data: "29/06" },
  { id: "cn3", clienteId: "c2", titulo: "Bastidores do atendimento", formato: "Story", status: "publicado", data: "24/06" },
  { id: "cn4", clienteId: "c1", titulo: "Institucional do escritório", formato: "Vídeo", status: "gravacao", data: "28/06" },
  { id: "cn5", clienteId: "c1", titulo: "3 erros ao reformar", formato: "Carrossel", status: "roteiro", data: "30/06" },
  { id: "cn6", clienteId: "c3", titulo: "Nascimento do novo blend", formato: "Reels", status: "ideia", data: "01/07" },
  { id: "cn7", clienteId: "c3", titulo: "Clientes que viram amigos", formato: "Reels", status: "publicado", data: "23/06" },
]

export const mensagensCliente: Mensagem[] = [
  { id: "m1", clienteId: "c2", autorId: "u1", data: "Hoje, 09:12", texto: "Dr. André aprovou os 3 roteiros da semana. Seguimos para gravação." },
  { id: "m2", clienteId: "c2", autorId: "u2", data: "Ontem, 16:40", texto: "Subi a edição do carrossel de skincare na pasta de aprovação." },
  { id: "m3", clienteId: "c1", autorId: "u2", data: "Hoje, 11:02", texto: "Renata pediu para destacar o projeto da casa de praia no institucional." },
  { id: "m4", clienteId: "c3", autorId: "u3", data: "Ontem, 18:25", texto: "Júlia confirmou a gravação do blend para dia 01/07 às 10h30." },
]

export const arquivosCliente: Arquivo[] = [
  { id: "a1", clienteId: "c2", nome: "Manual de marca — Aurora", tipo: "Branding", tamanho: "8,2 MB" },
  { id: "a2", clienteId: "c2", nome: "Contrato 2025", tipo: "Contrato", tamanho: "1,1 MB" },
  { id: "a3", clienteId: "c2", nome: "Fotos do espaço", tipo: "Material", tamanho: "124 MB" },
  { id: "a4", clienteId: "c1", nome: "Logo + identidade", tipo: "Branding", tamanho: "12 MB" },
  { id: "a5", clienteId: "c1", nome: "Drive de projetos", tipo: "Drive", tamanho: "—" },
  { id: "a6", clienteId: "c3", nome: "Manual de marca — Café Norte", tipo: "Branding", tamanho: "6,4 MB" },
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
