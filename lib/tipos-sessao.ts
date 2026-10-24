// Tipo compartilhado entre servidor (lib/sessao.ts) e cliente (providers.tsx).
// Mantido em arquivo neutro (sem "server-only") para poder ser importado dos dois lados.
export type UsuarioSessao = {
  id: string
  nome: string
  iniciais: string
  cor: string
  cargo: string
}
