"use server"

import { carregarSugestoesAtivos } from "@/lib/sugestoes-ia"
import type { AlertaCliente } from "@/lib/clientes-db"

export type EstadoSugestoes =
  | { ok: true; sugestoes: AlertaCliente[] }
  | { ok: false; erro: string; sugestoes: AlertaCliente[] }

// Carrega as sugestões da Central de Atenção enriquecidas por IA.
// `forcar` ignora o cache e regenera para todos os clientes ativos.
export async function carregarSugestoesAction(forcar = false): Promise<EstadoSugestoes> {
  try {
    const sugestoes = await carregarSugestoesAtivos({ forcar })
    return { ok: true, sugestoes }
  } catch (e) {
    console.log("[v0] Erro ao carregar sugestões da Central de Atenção:", e instanceof Error ? e.message : e)
    return {
      ok: false,
      erro: e instanceof Error ? e.message : "Falha ao carregar sugestões.",
      sugestoes: [],
    }
  }
}
