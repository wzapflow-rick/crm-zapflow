import { notFound } from "next/navigation"
import { Topbar } from "@/components/simple/topbar"
import { ClienteDetalhe } from "@/components/clientes/cliente-detalhe"
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

  let cliente: Cliente | null = null
  let membros: Membro[] = []
  let metas: Meta[] = []
  try {
    ;[cliente, membros, metas] = await Promise.all([getClientePorId(id), getMembros(), getMetas(id)])
  } catch {
    cliente = null
  }

  if (!cliente) {
    notFound()
  }

  // Eventos e conteúdos em try/catch próprio: se a tabela ainda não existir, a página não quebra.
  let eventos: EventoCliente[] = []
  try {
    eventos = await getEventos(id)
  } catch {
    eventos = []
  }

  let conteudos: ConteudoItem[] = []
  try {
    conteudos = await getConteudos(id)
  } catch {
    conteudos = []
  }

  let estrategia: Estrategia = { estrategiaAtual: [], insights: [], concorrentes: [] }
  try {
    estrategia = await getEstrategia(id)
  } catch {
    estrategia = { estrategiaAtual: [], insights: [], concorrentes: [] }
  }

  let arquivos: Arquivo[] = []
  try {
    arquivos = await getArquivos(id)
  } catch {
    arquivos = []
  }

  let mensagens: Mensagem[] = []
  try {
    mensagens = await getMensagens(id)
  } catch {
    mensagens = []
  }

  let resultados: MetricaResultado[] = []
  try {
    resultados = await getResultados(id)
  } catch {
    resultados = []
  }

  let historico: RegistroHistorico[] = []
  try {
    historico = await getHistorico(id)
  } catch {
    historico = []
  }

  let memoria: MemoriaCliente = {}
  try {
    memoria = await getMemoria(id)
  } catch {
    memoria = {}
  }

  let reunioes: Reuniao[] = []
  try {
    reunioes = await getReunioes(id)
  } catch {
    reunioes = []
  }

  let performance: ConteudoPerformance[] = []
  try {
    performance = await getPerformance(id)
  } catch {
    performance = []
  }

  let experimentos: Experimento[] = []
  try {
    experimentos = await getExperimentos(id)
  } catch {
    experimentos = []
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
      />
    </>
  )
}
