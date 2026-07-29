import { notFound } from "next/navigation"
import { Topbar } from "@/components/simple/topbar"
import { ClienteDetalhe } from "@/components/clientes/cliente-detalhe"
import { seguro } from "@/lib/db"
import {
  getClientePorId,
  getMetas,
  getEventos,
  getConteudos,
  getEstrategia,
  getArquivos,
  getMensagens,
  getResultados,
} from "@/lib/clientes-db"
import { getMembros, type Membro } from "@/lib/membros-db"
import { getHistorico, type RegistroHistorico } from "@/lib/historico-db"
import { getMemoria, type MemoriaCliente } from "@/lib/memoria-db"
import { getReunioes, type Reuniao } from "@/lib/reunioes-db"
import { getPerformance, type ConteudoPerformance } from "@/lib/performance-db"
import { getExperimentos, type Experimento } from "@/lib/experimentos-db"
import { getPadroes, getUltimaAnalise, type Padrao } from "@/lib/padroes-db"
import { getEnvios, type EnvioCliente } from "@/lib/envios-db"
import type {
  Arquivo,
  Cliente,
  ConteudoItem,
  Estrategia,
  EventoCliente,
  Mensagem,
  MetricaResultado,
  Meta,
} from "@/lib/simple-data"

export const dynamic = "force-dynamic"

export default async function ClientePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // Todas as buscas disparam EM PARALELO (uma ida ao banco em vez de ~16 em série).
  // Cada uma tem fallback próprio via `seguro`: se uma tabela não existir, a página não quebra.
  const [
    cliente,
    membros,
    metas,
    eventos,
    conteudos,
    estrategia,
    arquivos,
    mensagens,
    resultados,
    historico,
    memoria,
    reunioes,
    performance,
    experimentos,
    padroes,
    ultimaAnalisePadroes,
    envios,
  ] = await Promise.all([
    seguro<Cliente | null>(getClientePorId(id), null),
    seguro<Membro[]>(getMembros(), []),
    seguro<Meta[]>(getMetas(id), []),
    seguro<EventoCliente[]>(getEventos(id), []),
    seguro<ConteudoItem[]>(getConteudos(id), []),
    seguro<Estrategia>(getEstrategia(id), { estrategiaAtual: [], insights: [], concorrentes: [] }),
    seguro<Arquivo[]>(getArquivos(id), []),
    seguro<Mensagem[]>(getMensagens(id), []),
    seguro<MetricaResultado[]>(getResultados(id), []),
    seguro<RegistroHistorico[]>(getHistorico(id), []),
    seguro<MemoriaCliente>(getMemoria(id), {}),
    seguro<Reuniao[]>(getReunioes(id), []),
    seguro<ConteudoPerformance[]>(getPerformance(id), []),
    seguro<Experimento[]>(getExperimentos(id), []),
    seguro<Padrao[]>(getPadroes(id), []),
    seguro<string | null>(getUltimaAnalise(id), null),
    seguro<EnvioCliente[]>(getEnvios(id), []),
  ])

  if (!cliente) {
    notFound()
  }

  return (
    <>
      <Topbar titulo={cliente.nome} />
      <ClienteDetalhe
        cliente={cliente}
        membros={membros}
        metas={metas}
        eventos={eventos}
        conteudos={conteudos}
        estrategia={estrategia}
        arquivos={arquivos}
        mensagens={mensagens}
        resultados={resultados}
        historico={historico}
        memoria={memoria}
        reunioes={reunioes}
        performance={performance}
        experimentos={experimentos}
        padroes={padroes}
        ultimaAnalisePadroes={ultimaAnalisePadroes}
        envios={envios}
      />
    </>
  )
}
