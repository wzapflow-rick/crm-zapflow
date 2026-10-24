import { getUltimaAtividade, tempoRelativo } from "@/lib/atividades-db"
import { cn } from "@/lib/utils"

/**
 * Carimbo inline "editado por Fulano há X". Server component: busca a última
 * atividade registrada para a entidade e a exibe de forma discreta.
 * Se não houver registro (ou a tabela ainda não existir), não renderiza nada.
 */
export async function CarimboAutor({
  entidadeTipo,
  entidadeId,
  className,
}: {
  entidadeTipo: string
  entidadeId: string
  className?: string
}) {
  const atividade = await getUltimaAtividade(entidadeTipo, entidadeId)
  if (!atividade) return null

  const verbo =
    atividade.acao === "criar" ? "criado" : atividade.acao === "excluir" ? "removido" : "editado"

  return (
    <span
      className={cn("text-[11px] text-muted-foreground/70", className)}
      title={new Date(atividade.criadoEm).toLocaleString("pt-BR")}
    >
      {verbo} por {atividade.membroNome} · {tempoRelativo(atividade.criadoEm)}
    </span>
  )
}
