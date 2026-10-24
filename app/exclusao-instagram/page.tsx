import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Status da exclusão de dados — SIMPLE OS",
  description: "Confirmação da solicitação de exclusão de dados do Instagram no SIMPLE OS.",
}

export default async function ExclusaoInstagramPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  const { code } = await searchParams

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center gap-6 px-6 py-16">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-8">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">SIMPLE OS</p>
        <h1 className="font-serif text-3xl text-balance text-foreground">
          Solicitação de exclusão recebida
        </h1>
        <p className="leading-relaxed text-muted-foreground">
          Os dados associados à sua conta do Instagram foram removidos do SIMPLE OS. Isso inclui o perfil, as
          métricas agregadas, as publicações sincronizadas e o token de acesso.
        </p>
        {code ? (
          <div className="flex flex-col gap-1 rounded-lg border border-border bg-muted p-4">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Código de confirmação</span>
            <span className="font-mono text-sm text-foreground">{code}</span>
          </div>
        ) : null}
        <p className="text-sm text-muted-foreground">
          Em caso de dúvidas, consulte nossa{" "}
          <a className="text-primary underline underline-offset-4" href="/privacidade">
            Política de Privacidade
          </a>
          .
        </p>
      </div>
    </main>
  )
}
