// Utilitários para agrupar itens (conteúdos) por mês de competência (YYYY-MM).
// Usado tanto no sistema quanto no portal do cliente.

const SEM_DATA = "sem-data"

// Extrai a competência (YYYY-MM) de uma data ISO (YYYY-MM-DD).
// Sem data válida, cai no balde "sem-data".
export function competenciaDeISO(dataISO?: string | null): string {
  return dataISO && /^\d{4}-\d{2}/.test(dataISO) ? dataISO.slice(0, 7) : SEM_DATA
}

// "2026-03" -> "Março de 2026"
export function rotuloCompetencia(competencia: string): string {
  if (competencia === SEM_DATA) return "Sem data"
  const [ano, mes] = competencia.split("-").map(Number)
  if (!ano || !mes) return competencia
  const data = new Date(ano, mes - 1, 1)
  const texto = data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

// Competências únicas, das mais recentes para as mais antigas; "sem-data" sempre por último.
export function mesesOrdenados(competencias: string[]): string[] {
  const unicas = Array.from(new Set(competencias))
  const comData = unicas.filter((c) => c !== SEM_DATA).sort((a, b) => (a < b ? 1 : -1))
  return unicas.includes(SEM_DATA) ? [...comData, SEM_DATA] : comData
}
