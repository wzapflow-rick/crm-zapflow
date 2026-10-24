// ============================================================================
// PLAYBOOK DE CONTEÚDO — SIMPLE OS
// ----------------------------------------------------------------------------
// Conhecimento destilado das skills "social", "content-strategy" e "video",
// adaptado para Instagram e negócios atendidos pela SIMPLE. É injetado nos
// prompts de IA que criam roteiros, estratégias e ideias de conteúdo.
// Edite os textos abaixo para ajustar o padrão de qualidade da IA.
// ============================================================================

// Regras de escrita aplicadas a TODA geração de texto (via PERSONA).
export const REGRAS_ESCRITA = `# COMO ESCREVER (SEM CARA DE IA)
Texto que parece gerado por IA perde atenção na hora. Preencha toda fórmula com um fato, número ou história específica do cliente.
Nunca use:
- Revelação por contraste: "Não é X, é Y", "Não porque X. Porque Y". Diga Y direto, com o motivo.
- Listas de negação: "Sem X, sem Y, sem Z". Diga o que acontece.
- Frases que continuam depois da ideia com vírgulas repetindo o que já foi dito. Termine a frase na afirmação.
- Pergunta que você mesmo responde e revelação com dois-pontos: "O resultado? 3x mais." "O melhor: ...".
- Clichês: "Diga adeus a", "Desbloqueie o poder", "Leve ao próximo nível", "Transforme sua vida", "O segredo que ninguém conta".
- Travessões longos em legendas. Use ponto ou quebra de linha.
- Uma frase curta por linha no texto inteiro. Escreva parágrafos e quebre a linha onde uma pessoa pausaria.
- Isca de engajamento vazia: "Concorda?", "Leia de novo.", "Comenta aí!". Termine no ponto principal ou numa pergunta real.
- Vulnerabilidade fabricada sem história real por trás.
- Emojis como marcadores no começo de cada linha.
No máximo uma lista de três itens por texto.`

export const ESTRUTURAS_ROTEIRO = [
  "problema-solucao",
  "lista",
  "tutorial",
  "historia",
  "bastidores",
  "mito-verdade",
  "antes-depois",
] as const

export type EstruturaRoteiro = (typeof ESTRUTURAS_ROTEIRO)[number]

export const ROTULO_ESTRUTURA: Record<EstruturaRoteiro, string> = {
  "problema-solucao": "Problema → solução",
  lista: "Lista",
  tutorial: "Tutorial",
  historia: "História",
  bastidores: "Bastidores",
  "mito-verdade": "Mito × verdade",
  "antes-depois": "Antes e depois",
}

// Usado pelo gerador de roteiro.
export const PLAYBOOK_ROTEIRO = `# PLAYBOOK DE ROTEIRO
## Regra dos 3 segundos (vídeo)
Você tem 3 segundos para parar a rolagem. Todo vídeo precisa de três ganchos ao mesmo tempo, já no primeiro segundo:
gancho visual (o que aparece) + gancho falado (a primeira frase) + texto na tela (reforça a promessa).
Não faça introdução. Comece pelo ponto mais interessante. Se der para encurtar, encurte.

## Fórmulas de gancho (preencha com algo específico do cliente)
- Curiosidade: "Eu estava errado sobre [crença comum]." / "[Resultado] quase sempre vem de [causa surpreendente]."
- História: "Semana passada aconteceu [fato inesperado]." / "Quase cometi [erro grande]."
- Valor: "Como [resultado desejado] sem [dor comum]." / "Pare de [erro comum]. Faça isso."
- Contraste: "[Conselho comum] nos custou [resultado específico]."

## Estruturas de vídeo (Reels 15 a 30 s, no máximo 60 s)
- Problema → solução: 0-3s gancho com o problema; 3-10s por que importa; 10-25s a solução; 25-30s CTA.
- Lista: 0-3s "X coisas que [resultado]"; um item a cada 5-8 s; CTA no final.
- Tutorial: 0-3s mostre o resultado final primeiro; passos rápidos e claros; resultado + CTA.
- História: situação, conflito, virada e lição, com o cliente ou o público como protagonista.
- Bastidores: processo real, sem polimento excessivo, mostrando cuidado e competência.
- Mito × verdade: derrube uma crença do público com prova.
- Antes e depois: mostre a transformação logo no início e depois explique o caminho.
Para serviços e negócios locais funcionam muito: revelação de processo, transformação de cliente e quebra de mitos.

## Texto na tela e legendas do vídeo
A maioria assiste sem som. Toda fala importante vira texto na tela: no máximo 2 linhas, 3 a 5 palavras por linha, palavra-chave destacada.

## Carrossel (cada "cena" é um slide)
Escolha a arquitetura antes de escrever:
- Pilha de valor: capa com promessa, um aprendizado por slide, resumo, CTA.
- Problema e prova: dor, por que acontece, evidência, solução, CTA.
- Lista de dicas: capa numérica, uma dica acionável por slide, CTA para salvar.
- Desabafo: opinião forte na capa, argumentos, virada, CTA para comentar.
- Demonstração: resultado na capa, passo a passo visual, CTA.
A capa decide tudo: promessa clara em até 8 palavras. Um único ponto por slide.

## Story e estático
Story: sequência curta com enquete, caixa de pergunta ou contagem para gerar resposta. Estático: uma ideia, uma frase forte, CTA.

## Legenda
Primeira linha forte que funciona sozinha (é o que aparece antes do "mais"). Corpo curto que acrescenta contexto ao vídeo, sem repetir o roteiro.
CTA específico ligado à meta (salvar, enviar para alguém, chamar no direct com uma palavra-chave, agendar). Até 5 hashtags específicas do nicho e da cidade, nunca genéricas.

## Direcionamento de gravação e edição (interno)
Indique: enquadramento (9:16, rosto no terço superior), luz natural de frente, áudio limpo (microfone de lapela, áudio ruim derruba retenção), cortes a cada 2-3 s, B-roll do produto ou serviço, texto na tela por cena e referência de ritmo.`

// Usado pela estratégia mensal e pelo chat estratégico quando o assunto é planejamento.
export const PLAYBOOK_ESTRATEGIA = `# PLAYBOOK DE ESTRATÉGIA DE CONTEÚDO
## Pilares
Defina de 3 a 5 pilares que o cliente pode ser dono. Cada pilar precisa alinhar com o que ele vende, com o que o público quer saber e render muitos conteúdos.
Indique o peso de cada pilar no mês em porcentagem (somando 100%). Referência para negócio de serviço: educativo 30%, bastidores e processo 25%, prova social e transformação 25%, posicionamento e opinião 15%, oferta direta 5 a 15%.

## Mix do calendário 60/30/10 (adaptado ao Instagram)
- 60% descoberta: conteúdo que responde dúvidas reais do público e que as pessoas buscam (Instagram também é buscador). Títulos e legendas com as palavras que o cliente final usa.
- 30% compartilhável: opinião forte, histórias, dados originais, transformação. Gera alcance novo e envios.
- 10% experimento: formato, gancho ou série nova para testar. Sempre com hipótese clara.

## Priorização de ideias
Pontue cada ideia: impacto no cliente final 40% (dor frequente e emocional), aderência ao que o cliente vende 30%, potencial de busca e compartilhamento 20%, esforço de produção 10%. Comece pelas de maior nota.

## Crie uma vez, distribua várias
Planeje um conteúdo principal por semana (vídeo ou carrossel forte) e já desdobre: cortes para Reels, carrossel com os pontos, stories com enquete, legenda adaptada. Uma peça excelente distribuída rende mais do que várias medianas.
Leve a audiência do Instagram (canal alugado) para um canal próprio: lista de WhatsApp, agendamento, cadastro.

## Frequência de referência para Instagram
1 a 2 posts no feed por dia é teto; para equipe pequena, 3 a 5 por semana com stories diários é sustentável. Consistência vale mais que volume.

## Métricas que importam
Alcance e novos seguidores mostram descoberta. Salvamentos e compartilhamentos mostram valor (pesam mais que curtidas). Comentários valem mais que curtidas. Visitas ao perfil, cliques e mensagens no direct mostram intenção de compra.
Revisão semanal: 3 melhores e 3 piores posts, por que funcionaram ou não, o que repetir, o que testar.
Se o engajamento cair: teste ganchos novos, outros horários e formatos. Se o alcance cair: aumente frequência, aposte em vídeo e responda comentários na primeira hora.`
