// Conteúdo estático do módulo Comercial da SIMPLE.
// Material prático para a equipe de vendas: scripts, objeções, propostas e preços.
// Edite os textos livremente; quando quiser, migramos para o banco.

export type ComercialSecao = {
  id: string
  titulo: string
  descricao: string
  // Nome do ícone do lucide-react (resolvido na view).
  icone: "MessageSquare" | "ShieldQuestion" | "FileText" | "DollarSign"
  itens: ComercialItem[]
}

export type ComercialItem = {
  // Para objeções: a frase do cliente. Para scripts: o contexto/etapa.
  titulo: string
  // Texto pronto para copiar e usar.
  conteudo: string
  // Etiquetas opcionais (ex.: canal, momento).
  tags?: string[]
}

export const comercialSecoes: ComercialSecao[] = [
  {
    id: "scripts",
    titulo: "Scripts de abordagem",
    descricao: "Mensagens prontas para iniciar e conduzir a conversa com o lead.",
    icone: "MessageSquare",
    itens: [
      {
        titulo: "Primeiro contato — lead que pediu orçamento",
        tags: ["WhatsApp", "Topo de funil"],
        conteudo:
          "Oi, [NOME]! Aqui é o [SEU NOME], da SIMPLE. Vi que você se interessou pelo nosso trabalho de social media — que ótimo!\n\nPra eu te mostrar exatamente como podemos ajudar o seu negócio a crescer, me conta rapidinho: qual é o seu maior desafio hoje no Instagram? (atrair seguidores, gerar vendas, falta de tempo pra postar, etc.)",
      },
      {
        titulo: "Follow-up — lead que não respondeu",
        tags: ["WhatsApp", "Reativação"],
        conteudo:
          "Oi, [NOME]! Passando aqui pra não te deixar sem retorno.\n\nSei que a rotina é corrida, então vou facilitar: consigo te mostrar em 15 minutos como estruturaríamos o conteúdo do seu perfil pra gerar mais clientes. Prefere hoje à tarde ou amanhã de manhã?",
      },
      {
        titulo: "Convite para reunião de diagnóstico",
        tags: ["Agendamento"],
        conteudo:
          "Perfeito, [NOME]! O próximo passo é uma conversa rápida (uns 30 min) onde eu faço um diagnóstico do seu perfil e já te mostro 2 ou 3 oportunidades claras de crescimento — sem compromisso.\n\nTe envio o link da agenda: [LINK]. Qual horário fica melhor pra você?",
      },
    ],
  },
  {
    id: "objecoes",
    titulo: "Quebra de objeções",
    descricao: "Respostas prontas para as objeções mais comuns. Adapte o tom ao cliente.",
    icone: "ShieldQuestion",
    itens: [
      {
        titulo: "“Está caro / fora do meu orçamento”",
        conteudo:
          "Entendo, [NOME]. Mas deixa eu te fazer uma pergunta: quanto vale pra você fechar 2 ou 3 clientes novos por mês? Nosso trabalho não é um custo, é um investimento que se paga. A maioria dos nossos clientes recupera o valor já nos primeiros meses, porque a gente foca em conteúdo que gera venda — não só curtida.",
      },
      {
        titulo: "“Preciso pensar / falar com meu sócio”",
        conteudo:
          "Claro, decisão importante a gente pensa mesmo. Pra te ajudar nessa conversa, qual é a principal dúvida que ainda ficou? Assim eu te dou os argumentos certos pra alinhar com seu sócio e vocês decidirem com clareza.",
      },
      {
        titulo: "“Já tentei agência antes e não funcionou”",
        conteudo:
          "Faz total sentido o receio, e sinceramente isso é comum. A diferença da SIMPLE é o método: a gente parte do objetivo de negócio, não de postar por postar. Posso te mostrar exatamente como medimos resultado e o que faríamos diferente no seu caso?",
      },
      {
        titulo: "“Não tenho tempo pra gravar conteúdo”",
        conteudo:
          "Essa é justamente uma das dores que a gente resolve. Estruturamos tudo pra que você grave o máximo de conteúdo no menor tempo possível — geralmente um dia de gravação rende semanas de posts. Você só aparece; o resto é com a gente.",
      },
    ],
  },
  {
    id: "propostas",
    titulo: "Modelos de proposta",
    descricao: "Estruturas padrão para montar propostas comerciais rápidas e claras.",
    icone: "FileText",
    itens: [
      {
        titulo: "Estrutura de proposta — Gestão de Social Media",
        tags: ["Recorrente"],
        conteudo:
          "1. Diagnóstico do cenário atual (onde o perfil está hoje)\n2. Objetivo do projeto (onde queremos chegar e em quanto tempo)\n3. Escopo de entregas (qtd. de posts, reels, stories, etc.)\n4. Método de trabalho (gravação, edição, aprovação, publicação)\n5. Cronograma e fluxo de aprovação\n6. Investimento e formas de pagamento\n7. Próximos passos",
      },
      {
        titulo: "Resumo de valor (para o topo da proposta)",
        conteudo:
          "A SIMPLE não entrega apenas posts — entregamos crescimento. Cada conteúdo é pensado pra aproximar [CLIENTE] de uma meta real de negócio: mais autoridade, mais clientes e uma marca memorável. Este projeto foi desenhado especificamente para [OBJETIVO PRINCIPAL].",
      },
    ],
  },
  {
    id: "precificacao",
    titulo: "Tabela de precificação",
    descricao: "Faixas de referência interna. Ajuste conforme escopo e porte do cliente.",
    icone: "DollarSign",
    itens: [
      {
        titulo: "Plano Essencial",
        tags: ["Entrada"],
        conteudo:
          "Ideal para negócios começando no digital.\n• 8 posts/mês (feed + stories)\n• 2 reels/mês\n• 1 dia de gravação mensal\n• Relatório mensal simples\nFaixa de referência: R$ 1.500 a R$ 2.500/mês",
      },
      {
        titulo: "Plano Crescimento",
        tags: ["Mais vendido"],
        conteudo:
          "Para quem quer escalar presença e vendas.\n• 12 posts/mês (feed + stories)\n• 4 reels/mês\n• 2 dias de gravação mensal\n• Gestão de tráfego básica\n• Relatório mensal completo\nFaixa de referência: R$ 3.000 a R$ 5.000/mês",
      },
      {
        titulo: "Plano Premium",
        tags: ["Alto valor"],
        conteudo:
          "Operação completa de conteúdo e estratégia.\n• Conteúdo sob demanda (feed, reels, stories)\n• Gravações quinzenais\n• Estratégia de tráfego e funil\n• Acompanhamento estratégico semanal\n• Relatórios e reuniões de resultado\nFaixa de referência: a partir de R$ 6.000/mês",
      },
    ],
  },
]
