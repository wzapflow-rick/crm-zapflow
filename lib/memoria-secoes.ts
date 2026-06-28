// Seções da Client Memory (Marketing Intelligence — Fase 1).
// Para adicionar uma nova seção, basta incluir um item aqui. Nenhuma mudança
// de banco é necessária (a tabela cliente_memoria é chave-valor por seção).

export type SecaoMemoria = {
  id: string
  titulo: string
  descricao: string
  placeholder: string
}

export const SECOES_MEMORIA: SecaoMemoria[] = [
  {
    id: "posicionamento",
    titulo: "Posicionamento",
    descricao: "Como a marca quer ser percebida e o que a diferencia no mercado.",
    placeholder:
      "Ex.: Clínica premium de estética avançada, focada em resultados naturais. Diferencial: protocolos exclusivos e atendimento humanizado.",
  },
  {
    id: "publico",
    titulo: "Público-alvo",
    descricao: "Quem é o cliente ideal: perfil, dores, desejos e contexto.",
    placeholder:
      "Ex.: Mulheres de 30 a 50 anos, classe A/B, que valorizam autocuidado e buscam procedimentos seguros e discretos.",
  },
  {
    id: "tom_de_voz",
    titulo: "Tom de voz",
    descricao: "Como a marca se comunica: estilo, palavras que usa e que evita.",
    placeholder:
      "Ex.: Acolhedor e sofisticado. Usa linguagem clara, evita termos técnicos demais. Nunca apela para medo ou pressão.",
  },
  {
    id: "arquetipos",
    titulo: "Arquétipos da marca",
    descricao: "Os arquétipos que guiam a personalidade da marca.",
    placeholder: "Ex.: Prestativo (cuidado) + Sábio (autoridade técnica). Um por linha, se preferir.",
  },
  {
    id: "concorrentes",
    titulo: "Concorrentes e referências",
    descricao: "Quem são os concorrentes diretos e marcas de referência.",
    placeholder: "Ex.: @clinica_x (concorrente direto), @marca_inspiracao (referência de conteúdo). Um por linha.",
  },
  {
    id: "objecoes",
    titulo: "Objeções comuns",
    descricao: "As principais resistências que o público levanta antes de comprar.",
    placeholder: "Ex.: 'É caro', 'Tenho medo de não ficar natural', 'Será que dói?'. Uma por linha.",
  },
  {
    id: "aprendizados",
    titulo: "Aprendizados",
    descricao: "O que já funcionou e o que não funcionou com este cliente.",
    placeholder:
      "Ex.: Bastidores de procedimentos geram muitos salvamentos. Posts só com preço performam mal. Uma por linha.",
  },
  {
    id: "preferencias",
    titulo: "Preferências e restrições",
    descricao: "Regras do cliente: o que pode e o que não pode ser feito.",
    placeholder:
      "Ex.: Não aparecer em vídeos. Não usar antes/depois explícito. Aprovar toda legenda antes de publicar. Uma por linha.",
  },
]
