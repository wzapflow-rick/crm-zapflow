// Conteúdo estático da Wiki / Manual interno da SIMPLE.
// Edite livremente os textos; quando quiser, migramos para o banco.

export type WikiArtigo = {
  slug: string
  titulo: string
  resumo: string
  // Tempo estimado de leitura/execução, ex.: "5 min".
  tempo: string
  // Conteúdo em blocos simples (sem markdown) para renderização controlada.
  blocos: WikiBloco[]
}

export type WikiBloco =
  | { tipo: "paragrafo"; texto: string }
  | { tipo: "subtitulo"; texto: string }
  | { tipo: "passos"; itens: string[] }
  | { tipo: "lista"; itens: string[] }
  | { tipo: "dica"; texto: string }

export type WikiCategoria = {
  id: string
  titulo: string
  descricao: string
  // Nome do ícone do lucide-react (resolvido na view).
  icone: "Rocket" | "Video" | "Scissors" | "CheckCircle2" | "Users" | "BookOpen"
  artigos: WikiArtigo[]
}

export const wikiCategorias: WikiCategoria[] = [
  {
    id: "onboarding",
    titulo: "Onboarding de clientes",
    descricao: "Como receber e configurar um novo cliente do zero.",
    icone: "Rocket",
    artigos: [
      {
        slug: "primeira-reuniao",
        titulo: "Como conduzir a primeira reunião",
        resumo: "O roteiro da reunião de boas-vindas e o que precisa sair dela.",
        tempo: "6 min",
        blocos: [
          {
            tipo: "paragrafo",
            texto:
              "A primeira reunião define o tom de toda a parceria. O objetivo é entender o negócio do cliente, alinhar expectativas e sair com tudo que a equipe precisa para começar a etapa Sentir do método.",
          },
          { tipo: "subtitulo", texto: "Antes da reunião" },
          {
            tipo: "lista",
            itens: [
              "Revise o material que o cliente enviou na contratação",
              "Prepare o documento de briefing em branco",
              "Tenha o contrato e o escopo à mão para tirar dúvidas",
            ],
          },
          { tipo: "subtitulo", texto: "Durante a reunião" },
          {
            tipo: "passos",
            itens: [
              "Apresente a equipe e o método SIMPLE em 2 minutos",
              "Pergunte sobre o negócio: produtos, público e diferenciais",
              "Levante os objetivos reais (vendas, autoridade, alcance)",
              "Combine canais de comunicação e prazos de aprovação",
              "Liste os acessos que serão necessários",
            ],
          },
          {
            tipo: "dica",
            texto:
              "Grave a reunião (com permissão). Você vai querer revisitar detalhes que passam despercebidos no calor da conversa.",
          },
        ],
      },
      {
        slug: "acessos-ferramentas",
        titulo: "Coletando acessos e ferramentas",
        resumo: "Checklist dos acessos a pedir e como organizá-los com segurança.",
        tempo: "4 min",
        blocos: [
          {
            tipo: "paragrafo",
            texto:
              "Sem acessos, a produção trava. Recolha tudo logo no início e guarde de forma organizada e segura.",
          },
          { tipo: "subtitulo", texto: "O que pedir" },
          {
            tipo: "lista",
            itens: [
              "Logins das redes sociais (ou acesso via gerenciador)",
              "Acesso ao Google Drive / pasta de materiais",
              "Identidade visual: logos, fontes e cores",
              "Materiais de produtos: fotos, vídeos, catálogos",
            ],
          },
          {
            tipo: "dica",
            texto: "Nunca compartilhe senhas por mensagem solta. Use um gerenciador de senhas da equipe.",
          },
        ],
      },
    ],
  },
  {
    id: "gravacao",
    titulo: "Gravação de clientes",
    descricao: "Padrões para gravar com qualidade e consistência.",
    icone: "Video",
    artigos: [
      {
        slug: "preparar-gravacao",
        titulo: "Preparando o dia de gravação",
        resumo: "Equipamentos, roteiro e ambiente prontos antes de gravar.",
        tempo: "5 min",
        blocos: [
          {
            tipo: "paragrafo",
            texto:
              "Um dia de gravação bem preparado rende o dobro de conteúdo com metade do estresse. Organize tudo na véspera.",
          },
          { tipo: "subtitulo", texto: "Checklist de equipamento" },
          {
            tipo: "lista",
            itens: [
              "Câmera/celular com bateria cheia e armazenamento livre",
              "Microfone de lapela testado",
              "Iluminação (softbox ou luz natural) posicionada",
              "Roteiros impressos ou no teleprompter",
            ],
          },
          { tipo: "subtitulo", texto: "No local" },
          {
            tipo: "passos",
            itens: [
              "Cheque o áudio com uma gravação de teste de 10 segundos",
              "Enquadre seguindo a regra dos terços",
              "Grave uma tomada de segurança de cada bloco",
              "Confirme que os arquivos foram salvos antes de desmontar",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "edicao",
    titulo: "Edição no padrão SIMPLE",
    descricao: "Como editar mantendo a identidade da agência.",
    icone: "Scissors",
    artigos: [
      {
        slug: "padrao-edicao",
        titulo: "O padrão de edição SIMPLE",
        resumo: "Ritmo, legendas, cores e a assinatura visual das entregas.",
        tempo: "7 min",
        blocos: [
          {
            tipo: "paragrafo",
            texto:
              "Toda peça editada pela SIMPLE precisa ser reconhecível. O padrão garante consistência independente de quem editou.",
          },
          { tipo: "subtitulo", texto: "Regras de ouro" },
          {
            tipo: "lista",
            itens: [
              "Primeiros 3 segundos precisam prender a atenção",
              "Legendas sempre presentes e legíveis (a maioria assiste sem som)",
              "Cortes no ritmo da fala, sem tempos mortos",
              "Cores e fontes seguindo o Brand Book do cliente",
            ],
          },
          { tipo: "subtitulo", texto: "Fluxo de edição" },
          {
            tipo: "passos",
            itens: [
              "Selecione as melhores tomadas",
              "Monte o corte bruto seguindo o roteiro",
              "Adicione legendas e revise a sincronia",
              "Aplique identidade visual e trilha",
              "Exporte no formato de cada canal",
            ],
          },
          {
            tipo: "dica",
            texto: "Antes de exportar, assista a peça inteira sem pausar. Você vai perceber cortes que precisam de ajuste.",
          },
        ],
      },
    ],
  },
  {
    id: "aprovacao",
    titulo: "Aprovação de conteúdo",
    descricao: "Como enviar para aprovação e tratar ajustes.",
    icone: "CheckCircle2",
    artigos: [
      {
        slug: "fluxo-aprovacao",
        titulo: "Fluxo de aprovação com o cliente",
        resumo: "Do envio à aprovação final, sem ruído nem retrabalho.",
        tempo: "5 min",
        blocos: [
          {
            tipo: "paragrafo",
            texto:
              "Um fluxo de aprovação claro evita idas e vindas. Centralize tudo e deixe registrado o que foi aprovado.",
          },
          {
            tipo: "passos",
            itens: [
              "Envie as peças pelo portal do cliente ou canal combinado",
              "Estabeleça um prazo de resposta (ex.: 48h)",
              "Reúna todos os ajustes de uma vez, não fragmentados",
              "Aplique as alterações e reenvie marcando o que mudou",
              "Registre a aprovação final antes de publicar",
            ],
          },
          {
            tipo: "dica",
            texto: "Limite as rodadas de ajuste no contrato (ex.: 2 revisões). Isso protege o cronograma e a margem.",
          },
        ],
      },
    ],
  },
  {
    id: "equipe",
    titulo: "Cultura e equipe",
    descricao: "Como trabalhamos e o que esperamos de cada um.",
    icone: "Users",
    artigos: [
      {
        slug: "valores",
        titulo: "Nossos valores na prática",
        resumo: "Os princípios que guiam o dia a dia da SIMPLE.",
        tempo: "3 min",
        blocos: [
          {
            tipo: "paragrafo",
            texto:
              "Mais do que entregar conteúdo, somos sócios do resultado dos nossos clientes. Esses valores guiam cada decisão.",
          },
          {
            tipo: "lista",
            itens: [
              "Padrão acima de volume: qualidade nunca é negociável",
              "Dono do resultado: o problema do cliente é nosso problema",
              "Comunicação clara: sem ruído interno nem com o cliente",
              "Evolução contínua: todo ciclo precisa ser melhor que o anterior",
            ],
          },
        ],
      },
    ],
  },
]
