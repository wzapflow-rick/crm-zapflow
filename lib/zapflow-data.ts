// Dados de exemplo (mock) do protótipo do ZapFlow CRM.
// Quando ligarmos no Postgres da VPS + Evolution, estes tipos viram o shape
// das tabelas/respostas reais. Mantidos aqui para o protótipo de UI.

export type Papel = "admin" | "atendente"

export type Membro = {
  id: string
  nome: string
  papel: Papel
  iniciais: string
  cor: string // classe de cor de fundo do avatar
  online: boolean
}

export type StatusConversa = "aberta" | "pendente" | "resolvida"

export type Mensagem = {
  id: string
  conteudo: string
  hora: string
  deMim: boolean // true = enviada pela equipe
  autor?: string // nome do atendente que enviou
}

export type Conversa = {
  id: string
  contatoNome: string
  contatoTelefone: string
  iniciais: string
  cor: string
  ultimaMensagem: string
  ultimaHora: string
  naoLidas: number
  status: StatusConversa
  responsavelId: string | null // membro atribuído
  tags: string[]
  mensagens: Mensagem[]
}

export type TipoEvento = "reuniao" | "tarefa" | "ligacao" | "follow-up"

export type Evento = {
  id: string
  titulo: string
  tipo: TipoEvento
  inicio: string // HH:MM
  fim: string // HH:MM
  responsavelId: string
  diaSemana: number // 0 = segunda ... 4 = sexta (semana útil)
  concluido: boolean
}

export type Tarefa = {
  id: string
  titulo: string
  responsavelId: string
  prazo: string
  prioridade: "alta" | "media" | "baixa"
  status: "pendente" | "em_andamento" | "concluida"
}

export const membros: Membro[] = [
  { id: "u1", nome: "Você (Admin)", papel: "admin", iniciais: "AD", cor: "bg-chart-1", online: true },
  { id: "u2", nome: "Marina Souza", papel: "atendente", iniciais: "MS", cor: "bg-chart-2", online: true },
  { id: "u3", nome: "Rafael Lima", papel: "atendente", iniciais: "RL", cor: "bg-chart-3", online: true },
  { id: "u4", nome: "Bianca Alves", papel: "atendente", iniciais: "BA", cor: "bg-chart-4", online: false },
  { id: "u5", nome: "Diego Martins", papel: "atendente", iniciais: "DM", cor: "bg-chart-5", online: false },
]

export const membroPorId = (id: string | null) =>
  membros.find((m) => m.id === id) ?? null

export const conversas: Conversa[] = [
  {
    id: "c1",
    contatoNome: "Pizzaria do Bairro",
    contatoTelefone: "+55 79 99812-3344",
    iniciais: "PB",
    cor: "bg-chart-4",
    ultimaMensagem: "Beleza, vou querer o plano anual então!",
    ultimaHora: "09:42",
    naoLidas: 2,
    status: "aberta",
    responsavelId: "u2",
    tags: ["lead quente", "delivery"],
    mensagens: [
      { id: "m1", conteudo: "Oi, vi o cardápio digital de vocês. Como funciona?", hora: "09:20", deMim: false },
      { id: "m2", conteudo: "Olá! O ZapFlow monta seu cardápio e recebe pedidos direto no WhatsApp. Posso te enviar uma demo?", hora: "09:22", deMim: true, autor: "Marina Souza" },
      { id: "m3", conteudo: "Pode sim!", hora: "09:25", deMim: false },
      { id: "m4", conteudo: "Aqui está: zapflow.app/menu/pizzaria-do-bairro", hora: "09:26", deMim: true, autor: "Marina Souza" },
      { id: "m5", conteudo: "Ficou ótimo! Quanto custa?", hora: "09:38", deMim: false },
      { id: "m6", conteudo: "Beleza, vou querer o plano anual então!", hora: "09:42", deMim: false },
    ],
  },
  {
    id: "c2",
    contatoNome: "Burger House",
    contatoTelefone: "+55 79 99765-1122",
    iniciais: "BH",
    cor: "bg-chart-1",
    ultimaMensagem: "Consegue me ligar ainda hoje?",
    ultimaHora: "09:15",
    naoLidas: 1,
    status: "pendente",
    responsavelId: "u3",
    tags: ["agendar ligação"],
    mensagens: [
      { id: "m1", conteudo: "Bom dia, queria entender melhor sobre os disparos em massa.", hora: "08:50", deMim: false },
      { id: "m2", conteudo: "Bom dia! Com o ZapFlow você dispara campanhas segmentadas. Posso te explicar por ligação?", hora: "09:05", deMim: true, autor: "Rafael Lima" },
      { id: "m3", conteudo: "Consegue me ligar ainda hoje?", hora: "09:15", deMim: false },
    ],
  },
  {
    id: "c3",
    contatoNome: "Açaí da Praça",
    contatoTelefone: "+55 79 99634-7788",
    iniciais: "AP",
    cor: "bg-chart-3",
    ultimaMensagem: "Obrigado pelo suporte, resolveu!",
    ultimaHora: "Ontem",
    naoLidas: 0,
    status: "resolvida",
    responsavelId: "u4",
    tags: ["suporte", "cliente"],
    mensagens: [
      { id: "m1", conteudo: "Meu cardápio não está atualizando os preços.", hora: "Ontem 16:10", deMim: false },
      { id: "m2", conteudo: "Vou verificar agora. Pode limpar o cache e recarregar?", hora: "Ontem 16:14", deMim: true, autor: "Bianca Alves" },
      { id: "m3", conteudo: "Obrigado pelo suporte, resolveu!", hora: "Ontem 16:20", deMim: false },
    ],
  },
  {
    id: "c4",
    contatoNome: "Mercadinho Central",
    contatoTelefone: "+55 79 99501-9090",
    iniciais: "MC",
    cor: "bg-chart-2",
    ultimaMensagem: "Vou pensar e te retorno.",
    ultimaHora: "Ontem",
    naoLidas: 0,
    status: "aberta",
    responsavelId: null,
    tags: ["lead frio"],
    mensagens: [
      { id: "m1", conteudo: "Recebi a proposta de vocês.", hora: "Ontem 11:00", deMim: false },
      { id: "m2", conteudo: "Vou pensar e te retorno.", hora: "Ontem 11:30", deMim: false },
    ],
  },
  {
    id: "c5",
    contatoNome: "Sushi Express",
    contatoTelefone: "+55 79 99477-3030",
    iniciais: "SE",
    cor: "bg-chart-5",
    ultimaMensagem: "Quero migrar do concorrente, é fácil?",
    ultimaHora: "08:30",
    naoLidas: 3,
    status: "aberta",
    responsavelId: "u2",
    tags: ["lead quente", "migração"],
    mensagens: [
      { id: "m1", conteudo: "Hoje uso outro sistema mas tá caro demais.", hora: "08:25", deMim: false },
      { id: "m2", conteudo: "Quero migrar do concorrente, é fácil?", hora: "08:30", deMim: false },
    ],
  },
]

export const eventos: Evento[] = [
  { id: "e1", titulo: "Reunião de equipe (alinhamento)", tipo: "reuniao", inicio: "09:00", fim: "09:30", responsavelId: "u1", diaSemana: 0, concluido: true },
  { id: "e2", titulo: "Ligar p/ Burger House", tipo: "ligacao", inicio: "10:00", fim: "10:20", responsavelId: "u3", diaSemana: 0, concluido: false },
  { id: "e3", titulo: "Demo cardápio — Pizzaria do Bairro", tipo: "reuniao", inicio: "11:00", fim: "11:30", responsavelId: "u2", diaSemana: 0, concluido: false },
  { id: "e4", titulo: "Follow-up Sushi Express", tipo: "follow-up", inicio: "14:00", fim: "14:15", responsavelId: "u2", diaSemana: 1, concluido: false },
  { id: "e5", titulo: "Onboarding Açaí da Praça", tipo: "tarefa", inicio: "15:00", fim: "16:00", responsavelId: "u4", diaSemana: 1, concluido: false },
  { id: "e6", titulo: "Revisar campanhas de disparo", tipo: "tarefa", inicio: "09:30", fim: "10:30", responsavelId: "u1", diaSemana: 2, concluido: false },
  { id: "e7", titulo: "Ligar p/ leads frios", tipo: "ligacao", inicio: "16:00", fim: "17:00", responsavelId: "u5", diaSemana: 2, concluido: false },
  { id: "e8", titulo: "Treinamento Evolution API", tipo: "reuniao", inicio: "10:00", fim: "11:30", responsavelId: "u1", diaSemana: 3, concluido: false },
  { id: "e9", titulo: "Fechar contrato Mercadinho Central", tipo: "follow-up", inicio: "13:30", fim: "14:00", responsavelId: "u3", diaSemana: 4, concluido: false },
]

export const tarefas: Tarefa[] = [
  { id: "t1", titulo: "Enviar proposta anual p/ Pizzaria do Bairro", responsavelId: "u2", prazo: "Hoje, 12:00", prioridade: "alta", status: "em_andamento" },
  { id: "t2", titulo: "Configurar disparo segmentado — Burger House", responsavelId: "u3", prazo: "Hoje, 17:00", prioridade: "alta", status: "pendente" },
  { id: "t3", titulo: "Atualizar cardápio Açaí da Praça", responsavelId: "u4", prazo: "Amanhã", prioridade: "media", status: "pendente" },
  { id: "t4", titulo: "Responder leads sem atendente atribuído", responsavelId: "u1", prazo: "Hoje", prioridade: "alta", status: "pendente" },
  { id: "t5", titulo: "Documentar fluxo de migração de concorrente", responsavelId: "u5", prazo: "Sexta", prioridade: "baixa", status: "pendente" },
  { id: "t6", titulo: "Revisar métricas da semana", responsavelId: "u1", prazo: "Sexta", prioridade: "media", status: "concluida" },
]

export const diasSemana = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"]
