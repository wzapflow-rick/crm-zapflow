import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Política de Privacidade — SIMPLE OS",
  description:
    "Como o SIMPLE OS coleta, usa, armazena e exclui dados, incluindo dados obtidos via integração com a API do Instagram/Meta.",
}

const ATUALIZADO_EM = "11 de agosto de 2026"
const CONTATO = "rickbse23@gmail.com"

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-serif text-2xl text-balance text-foreground">{titulo}</h2>
      <div className="flex flex-col gap-3 leading-relaxed text-muted-foreground">{children}</div>
    </section>
  )
}

export default function PoliticaPrivacidadePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-3 border-b border-border pb-8">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">SIMPLE OS</p>
        <h1 className="font-serif text-4xl text-balance text-foreground">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground">Última atualização: {ATUALIZADO_EM}</p>
      </header>

      <div className="flex flex-col gap-10">
        <Secao titulo="Quem somos">
          <p>
            O SIMPLE OS é o sistema operacional interno da agência SIMPLE, usado para gerenciar a operação dos
            nossos clientes — estratégia, marketing, comercial, financeiro e conteúdo. Esta política descreve
            como tratamos os dados processados na plataforma, incluindo os dados obtidos por meio da integração
            com a API do Instagram (Meta Platforms, Inc.).
          </p>
        </Secao>

        <Secao titulo="Dados que coletamos">
          <p>Ao conectar uma conta do Instagram por meio do login oficial da Meta, podemos coletar:</p>
          <ul className="flex list-disc flex-col gap-2 pl-6">
            <li>Dados do perfil profissional: nome de usuário, nome, tipo de conta e foto de perfil.</li>
            <li>Métricas agregadas da conta: número de seguidores, contas seguidas e total de publicações.</li>
            <li>
              Publicações e suas métricas: legenda, tipo de mídia, data, curtidas, comentários, alcance,
              salvamentos, compartilhamentos e visualizações.
            </li>
            <li>Um token de acesso fornecido pela Meta, necessário para sincronizar esses dados.</li>
          </ul>
          <p>
            Não coletamos senhas do Instagram e não temos acesso a mensagens diretas privadas para fins de
            armazenamento.
          </p>
        </Secao>

        <Secao titulo="Como usamos os dados">
          <p>
            Utilizamos os dados exclusivamente para exibir métricas de desempenho e apoiar a estratégia de
            marketing do cliente correspondente dentro do SIMPLE OS. Não vendemos, alugamos nem compartilhamos
            esses dados com terceiros para fins publicitários.
          </p>
        </Secao>

        <Secao titulo="Armazenamento e segurança">
          <p>
            Os dados são armazenados em banco de dados PostgreSQL com acesso restrito. O token de acesso da Meta
            é armazenado de forma criptografada (AES-256-GCM) e usado apenas para sincronizar os dados da conta
            conectada. O acesso à plataforma é restrito à equipe da SIMPLE.
          </p>
        </Secao>

        <Secao titulo="Retenção">
          <p>
            Mantemos os dados enquanto a conta permanecer conectada e a relação com o cliente estiver ativa. Ao
            desconectar a conta na plataforma, ou ao remover o app pelo Instagram, os dados associados são
            excluídos do nosso banco.
          </p>
        </Secao>

        <Secao titulo="Exclusão de dados">
          <p>Você pode solicitar a exclusão dos seus dados a qualquer momento de três formas:</p>
          <ul className="flex list-disc flex-col gap-2 pl-6">
            <li>
              Clicando em <strong className="text-foreground">Desconectar</strong> na aba Instagram do cliente
              dentro do SIMPLE OS, o que remove imediatamente a conexão e todas as mídias sincronizadas.
            </li>
            <li>
              Removendo o app <strong className="text-foreground">SimpleOS-IG</strong> em{" "}
              <em>Instagram → Configurações → Apps e sites</em>. Nesse caso, a Meta nos notifica automaticamente
              e apagamos os dados vinculados àquela conta.
            </li>
            <li>
              Enviando um e-mail para{" "}
              <a className="text-primary underline underline-offset-4" href={`mailto:${CONTATO}`}>
                {CONTATO}
              </a>{" "}
              com o assunto &quot;Exclusão de dados&quot;.
            </li>
          </ul>
        </Secao>

        <Secao titulo="Contato">
          <p>
            Em caso de dúvidas sobre esta política ou sobre o tratamento dos seus dados, entre em contato pelo
            e-mail{" "}
            <a className="text-primary underline underline-offset-4" href={`mailto:${CONTATO}`}>
              {CONTATO}
            </a>
            .
          </p>
        </Secao>
      </div>

      <footer className="border-t border-border pt-8 text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} SIMPLE. Todos os direitos reservados.</p>
      </footer>
    </main>
  )
}
