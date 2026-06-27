// Conteúdo estático do Método SIMPLE. Mantido separado de `metodoSimple`
// (usado no Brand Book) para podermos enriquecer sem quebrar aquela página.
// Edite livremente os textos; quando quiser, migramos para o banco.

export type EtapaMetodo = {
  letra: string
  titulo: string
  resumo: string
  objetivo: string
  checklist: string[]
  entregaveis: string[]
  dica: string
}

export const metodoEtapas: EtapaMetodo[] = [
  {
    letra: "S",
    titulo: "Sentir",
    resumo: "Onboarding, briefing e imersão no negócio do cliente.",
    objetivo:
      "Entender profundamente o cliente, seus objetivos e sua realidade antes de qualquer estratégia. É aqui que viramos sócios do resultado.",
    checklist: [
      "Reunião de onboarding agendada e realizada",
      "Briefing preenchido (objetivos, público, produtos)",
      "Acessos recebidos (redes, drive, ferramentas)",
      "Contrato assinado e escopo alinhado",
      "Expectativas e prazos combinados com o cliente",
    ],
    entregaveis: ["Documento de briefing", "Resumo estratégico inicial", "Cronograma macro do projeto"],
    dica: "Ouça mais do que fala. O cliente conhece o negócio dele melhor que ninguém — seu papel é traduzir isso em comunicação.",
  },
  {
    letra: "I",
    titulo: "Investigar",
    resumo: "Concorrentes, mercado e público-alvo.",
    objetivo:
      "Mapear o terreno: o que os concorrentes fazem, onde estão as oportunidades e quem é de verdade o público que queremos alcançar.",
    checklist: [
      "Análise de 3 a 5 concorrentes diretos",
      "Mapeamento das dores e desejos do público",
      "Referências de conteúdo que funcionam no nicho",
      "Levantamento de palavras-chave e tendências",
      "Definição das personas principais",
    ],
    entregaveis: ["Análise competitiva", "Mapa de personas", "Banco de referências"],
    dica: "Inspire-se nos concorrentes, mas nunca copie. O objetivo é encontrar o espaço que ninguém está ocupando.",
  },
  {
    letra: "M",
    titulo: "Mapear",
    resumo: "Estratégia, planejamento e calendário editorial.",
    objetivo:
      "Transformar tudo que aprendemos em um plano claro: pilares de conteúdo, formatos, frequência e calendário do mês.",
    checklist: [
      "Pilares de conteúdo definidos",
      "Linha editorial e tom de voz documentados",
      "Calendário do mês montado",
      "Formatos e frequência por canal definidos",
      "Plano aprovado pelo cliente",
    ],
    entregaveis: ["Estratégia de conteúdo", "Calendário editorial", "Guia de tom de voz"],
    dica: "Um bom mapa evita retrabalho. Aprove a estratégia com o cliente antes de produzir qualquer coisa.",
  },
  {
    letra: "P",
    titulo: "Produzir",
    resumo: "Gravação, edição, design e copywriting.",
    objetivo:
      "Tirar o plano do papel com qualidade e consistência: gravar, editar, desenhar e escrever no padrão SIMPLE.",
    checklist: [
      "Roteiros e copies escritos",
      "Gravações realizadas",
      "Edição de vídeos finalizada",
      "Artes e design aprovados",
      "Revisão de qualidade concluída",
    ],
    entregaveis: ["Vídeos editados", "Artes finais", "Legendas e copies"],
    dica: "Padrão acima de volume. É melhor entregar menos peças impecáveis do que muitas medianas.",
  },
  {
    letra: "L",
    titulo: "Lançar",
    resumo: "Publicação e ativação no momento certo.",
    objetivo:
      "Colocar o conteúdo no ar de forma estratégica, no horário e canal certos, garantindo o máximo de alcance e engajamento.",
    checklist: [
      "Conteúdos agendados nos canais",
      "Legendas, hashtags e CTAs revisados",
      "Horários de pico considerados",
      "Stories e apoios de lançamento prontos",
      "Publicação confirmada com o cliente",
    ],
    entregaveis: ["Posts publicados", "Cronograma de publicação", "Materiais de apoio (stories, anúncios)"],
    dica: "Publicar é só o começo. Acompanhe as primeiras horas para responder comentários e impulsionar o que performa.",
  },
  {
    letra: "E",
    titulo: "Evoluir",
    resumo: "Análise, otimização e próximo ciclo.",
    objetivo:
      "Medir o que funcionou, aprender com os dados e alimentar o próximo ciclo. O método é circular: sempre evoluindo.",
    checklist: [
      "Relatório de métricas do período",
      "Análise do que funcionou e do que não funcionou",
      "Reunião de resultados com o cliente",
      "Ajustes definidos para o próximo ciclo",
      "Aprendizados documentados",
    ],
    entregaveis: ["Relatório de performance", "Plano de otimização", "Ata da reunião de resultados"],
    dica: "Dados sem ação não servem para nada. Toda análise precisa virar uma decisão concreta para o próximo mês.",
  },
]
