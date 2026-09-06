import { Check, X } from "lucide-react"
import { metodoSimple, somosNaoSomos, valores, visao } from "@/lib/simple-data"

export function BrandBook() {
  return (
    <main className="flex-1 overflow-y-auto bg-background">
      {/* Capa */}
      <section className="flex min-h-[80vh] flex-col items-center justify-center px-6 py-24 text-center">
        <span className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
          Brand Book
        </span>
        <h1 className="mt-6 font-serif text-6xl font-light leading-[0.95] tracking-tight text-foreground text-balance md:text-8xl">
          SIMPLE
        </h1>
        <p className="mt-8 max-w-xl text-pretty font-serif text-xl italic leading-relaxed text-muted-foreground md:text-2xl">
          Entramos no seu negócio para que mais clientes entrem na sua empresa.
        </p>
      </section>

      {/* Manifesto */}
      <Secao tom="escuro">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-primary">
          Manifesto
        </p>
        <h2 className="mt-6 max-w-4xl font-serif text-3xl font-light leading-snug tracking-tight text-balance md:text-5xl">
          O mundo é barulhento. Nós escolhemos o oposto. Acreditamos que
          comunicação que vende é{" "}
          <span className="italic text-primary">clara, honesta e simples</span>.
        </h2>
        <p className="mt-8 max-w-2xl text-pretty text-lg leading-relaxed opacity-70">
          Não vendemos seguidores. Não corremos atrás de tendências vazias.
          Construímos presença que gera clientes reais para negócios reais —
          com método, consistência e verdade.
        </p>
      </Secao>

      {/* Quem somos */}
      <Secao>
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
              Quem somos
            </p>
            <h2 className="mt-6 font-serif text-4xl font-light leading-tight tracking-tight text-foreground text-balance md:text-5xl">
              Uma agência de crescimento disfarçada de produtora de conteúdo.
            </h2>
          </div>
          <div className="space-y-5 text-pretty text-lg leading-relaxed text-muted-foreground">
            <p>
              Nascemos da inquietação de ver bons negócios invisíveis. Empresas
              incríveis que ninguém conhecia simplesmente porque não sabiam se
              comunicar.
            </p>
            <p>
              A SIMPLE existe para mudar isso. Entramos no negócio do cliente
              como sócios do resultado — não como fornecedores de posts.
            </p>
          </div>
        </div>
      </Secao>

      {/* Missão / Promessa em destaque */}
      <Secao tom="acento">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-primary-foreground/70">
          Nossa missão
        </p>
        <h2 className="mt-6 max-w-4xl font-serif text-4xl font-light leading-tight tracking-tight text-balance md:text-6xl">
          Fazer pequenos negócios crescerem grande através de conteúdo com
          propósito.
        </h2>
      </Secao>

      {/* Visão */}
      <Secao>
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
          Visão
        </p>
        <h2 className="mt-6 font-serif text-4xl font-light tracking-tight text-foreground md:text-5xl">
          Onde estamos indo.
        </h2>
        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-3">
          {visao.map((v) => (
            <div key={v.horizonte} className="bg-card p-8">
              <p className="font-serif text-3xl font-light text-primary">
                {v.horizonte}
              </p>
              <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
                {v.texto}
              </p>
            </div>
          ))}
        </div>
      </Secao>

      {/* Valores */}
      <Secao tom="suave">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
          Valores
        </p>
        <h2 className="mt-6 font-serif text-4xl font-light tracking-tight text-foreground md:text-5xl">
          O que nos move.
        </h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {valores.map((v, i) => (
            <div key={v.titulo}>
              <span className="font-serif text-2xl font-light text-primary/40">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3 text-lg font-semibold text-foreground">
                {v.titulo}
              </h3>
              <p className="mt-2 text-pretty leading-relaxed text-muted-foreground">
                {v.descricao}
              </p>
            </div>
          ))}
        </div>
      </Secao>

      {/* O que somos / não somos */}
      <Secao>
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
          Personalidade
        </p>
        <h2 className="mt-6 font-serif text-4xl font-light tracking-tight text-foreground md:text-5xl">
          O que somos. O que não somos.
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-8">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">
              Somos
            </h3>
            <ul className="mt-5 space-y-3">
              {somosNaoSomos.somos.map((s) => (
                <li key={s} className="flex items-center gap-3 text-foreground">
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                  <span className="text-lg">{s}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-card p-8">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Não somos
            </h3>
            <ul className="mt-5 space-y-3">
              {somosNaoSomos.naoSomos.map((s) => (
                <li key={s} className="flex items-center gap-3 text-muted-foreground">
                  <X className="h-4 w-4 shrink-0" />
                  <span className="text-lg line-through decoration-border">{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Secao>

      {/* Método como assinatura */}
      <Secao tom="escuro">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-primary">
          Nossa assinatura
        </p>
        <h2 className="mt-6 font-serif text-4xl font-light tracking-tight md:text-5xl">
          Toda entrega nasce do Método SIMPLE.
        </h2>
        <div className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-3 lg:grid-cols-6">
          {metodoSimple.map((m) => (
            <div key={m.titulo} className="bg-sidebar p-6">
              <span className="font-serif text-4xl font-light text-primary">
                {m.letra}
              </span>
              <h3 className="mt-3 text-sm font-semibold text-sidebar-foreground">
                {m.titulo}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-sidebar-foreground/60">
                {m.descricao}
              </p>
            </div>
          ))}
        </div>
      </Secao>

      {/* Princípio final */}
      <section className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-24 text-center">
        <p className="max-w-4xl font-serif text-3xl font-light leading-snug tracking-tight text-foreground text-balance md:text-5xl">
          “Nada existe no SIMPLE OS sem gerar crescimento para um cliente ou
          para a empresa.”
        </p>
        <span className="mt-10 text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
          Cultura SIMPLE
        </span>
      </section>
    </main>
  )
}

function Secao({
  children,
  tom = "claro",
}: {
  children: React.ReactNode
  tom?: "claro" | "suave" | "escuro" | "acento"
}) {
  const estilos: Record<string, string> = {
    claro: "bg-background text-foreground",
    suave: "bg-secondary text-foreground",
    escuro: "bg-sidebar text-sidebar-foreground",
    acento: "bg-primary text-primary-foreground",
  }
  return (
    <section className={estilos[tom]}>
      <div className="mx-auto max-w-5xl px-6 py-24 md:py-32">{children}</div>
    </section>
  )
}
