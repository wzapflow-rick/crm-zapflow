// Skeleton exibido instantaneamente ao clicar no card de um cliente,
// espelhando o layout da página de detalhe (header + abas + conteúdo).
export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Carregando cliente">
      {/* Topbar */}
      <div className="flex h-14 items-center gap-3 border-b border-border px-4 md:px-6">
        <div className="h-5 w-40 rounded bg-muted" />
      </div>

      <div className="flex flex-col gap-4 p-4 md:p-6">
        {/* Header do cliente */}
        <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-5">
          <div className="size-16 shrink-0 rounded-full bg-muted" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-6 w-44 rounded bg-muted" />
            <div className="h-3 w-64 rounded bg-muted" />
            <div className="h-3 w-52 rounded bg-muted" />
          </div>
          <div className="hidden h-10 w-28 rounded bg-muted md:block" />
        </div>

        {/* Abas */}
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-9 w-24 shrink-0 rounded-lg bg-muted" />
          ))}
        </div>

        {/* Conteúdo da aba */}
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-5/6 rounded bg-muted" />
              <div className="h-3 w-2/3 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Carregando dados do cliente…</span>
    </div>
  )
}
