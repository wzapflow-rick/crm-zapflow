// Constante client-safe (sem dependência de 'pg'/server-only).
// Mantida separada de performance-db.ts para poder ser importada por Client Components.
export const FORMATOS_PERFORMANCE = ["Reels", "Carrossel", "Story", "Vídeo", "Estático"] as const
