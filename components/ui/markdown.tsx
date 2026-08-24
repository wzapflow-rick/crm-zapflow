"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"

/**
 * Renderiza texto em markdown de forma limpa dentro das bolhas de chat.
 * Trata títulos (#, ##, ###), negrito (**), listas, links, código e tabelas.
 */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("space-y-2.5 text-sm leading-relaxed", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="mt-1 text-base font-semibold text-foreground">{children}</h1>,
          h2: ({ children }) => <h2 className="mt-1 text-[15px] font-semibold text-foreground">{children}</h2>,
          h3: ({ children }) => (
            <h3 className="mt-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{children}</h3>
          ),
          h4: ({ children }) => <h4 className="mt-1 text-sm font-semibold text-foreground">{children}</h4>,
          p: ({ children }) => <p className="leading-relaxed">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => <ul className="ml-1 grid gap-1.5">{children}</ul>,
          ol: ({ children }) => <ol className="ml-4 grid list-decimal gap-1.5">{children}</ol>,
          li: ({ children }) => (
            <li className="flex gap-2">
              <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-primary" />
              <span className="min-w-0 flex-1">{children}</span>
            </li>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline underline-offset-2"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[13px]">{children}</code>
          ),
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-[13px]">{children}</pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-primary/40 pl-3 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="border-border" />,
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-border px-2 py-1 text-left font-medium">{children}</th>
          ),
          td: ({ children }) => <td className="border border-border px-2 py-1">{children}</td>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
