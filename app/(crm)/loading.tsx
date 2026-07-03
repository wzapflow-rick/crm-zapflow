// Skeleton genérico exibido INSTANTANEAMENTE em qualquer navegação dentro do app,
// enquanto o servidor busca os dados no banco. Sem ele, a tela fica "travada"
// na página anterior até o servidor terminar tudo.
export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Carregando">
      {/* Topbar */}
      <div className="flex h-14 items-center gap-3 border-b border-border px-4 md:px-6">
        <div className="h-5 w-36 rounded bg-muted" />
      </div>

      <div className="flex flex-col gap-4 p-4 md:p-6">
        {/* Cards de resumo */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex h-24 flex-col justify-between rounded-xl border border-border bg-card p-4">
              <div className="h-3 w-20 rounded bg-muted" />
              <div className="h-6 w-16 rounded bg-muted" />
            </div>
          ))}
        </div>

        {/* Blocos de conteúdo */}
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-5/6 rounded bg-muted" />
              <div className="h-3 w-2/3 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Carregando conteúdo…</span>
    </div>
  )
}
