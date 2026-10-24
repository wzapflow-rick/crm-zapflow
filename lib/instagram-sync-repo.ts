import "server-only"
import { randomUUID } from "node:crypto"
import { getPool, query } from "@/lib/db"
import { criptografarToken } from "@/lib/instagram-crypto"
import { getTokenInstagram } from "@/lib/instagram-db"
import { criarClienteGraph, type CampoMetrica } from "@/lib/instagram-graph"
import type { ConexaoSync, DepsSync, RepoSync } from "@/lib/instagram-sync"

// Colunas de métricas que podem ser atualizadas (lista fechada: nomes de
// coluna nunca vêm de entrada externa).
const COLUNA_DA_METRICA: Record<CampoMetrica, string> = {
  alcance: "alcance",
  salvamentos: "salvamentos",
  compartilhamentos: "compartilhamentos",
  visualizacoes: "visualizacoes",
  curtidas: "curtidas",
  comentarios: "comentarios",
  visitasPerfil: "visitas_perfil",
  seguidores: "seguidores",
  reposts: "reposts",
}

export const repoSyncPostgres: RepoSync = {
  async obterConexao(empresaId) {
    const rows = await query<{ modo: string; status: string; token_expira_em: Date | null; ultima_sync: Date | null }>(
      `select modo, status, token_expira_em, ultima_sync from public.instagram_conexao where empresa_id = $1`,
      [empresaId],
    )
    const r = rows[0]
    if (!r) return null
    return {
      modo: r.modo === "demo" ? "demo" : "real",
      status: (["conectado", "expirado", "erro"].includes(r.status) ? r.status : "conectado") as ConexaoSync["status"],
      tokenExpiraEm: r.token_expira_em ? new Date(r.token_expira_em) : null,
      ultimaSync: r.ultima_sync ? new Date(r.ultima_sync) : null,
    }
  },

  obterToken: (empresaId) => getTokenInstagram(empresaId),

  // Um único UPDATE atômico: só uma execução consegue a trava por vez, e uma
  // trava vencida pode ser retomada sem intervenção.
  async adquirirTrava(empresaId, syncToken, validadeMs) {
    const rows = await query<{ empresa_id: string }>(
      `update public.instagram_conexao
          set sync_token = $2,
              sync_bloqueada_ate = now() + make_interval(secs => $3::double precision / 1000),
              ultima_tentativa = now()
        where empresa_id = $1
          and (sync_bloqueada_ate is null or sync_bloqueada_ate < now())
       returning empresa_id`,
      [empresaId, syncToken, validadeMs],
    )
    return rows.length === 1
  },

  async liberarTrava(empresaId, syncToken) {
    await query(
      `update public.instagram_conexao
          set sync_token = null, sync_bloqueada_ate = null
        where empresa_id = $1 and sync_token = $2`,
      [empresaId, syncToken],
    )
  },

  async salvarTokenRenovado(empresaId, syncToken, token, expiraEm) {
    await query(
      `update public.instagram_conexao
          set access_token = $3, token_expira_em = $4
        where empresa_id = $1 and sync_token = $2`,
      [empresaId, syncToken, criptografarToken(token), expiraEm.toISOString()],
    )
  },

  async atualizarPerfil(empresaId, syncToken, perfil) {
    await query(
      `update public.instagram_conexao
          set username = coalesce(nullif($3, ''), username),
              nome = coalesce($4, nome),
              account_type = coalesce($5, account_type),
              profile_picture_url = coalesce($6, profile_picture_url),
              seguidores = coalesce($7, seguidores),
              segue = coalesce($8, segue),
              midia_count = coalesce($9, midia_count)
        where empresa_id = $1 and sync_token = $2`,
      [
        empresaId,
        syncToken,
        perfil.username,
        perfil.nome,
        perfil.accountType,
        perfil.profilePictureUrl,
        perfil.seguidores,
        perfil.segue,
        perfil.midiaCount,
      ],
    )
  },

  // Upsert só dos dados básicos: nunca sobrescreve métricas, e um id que já
  // pertença a outro cliente não é tomado (isolamento entre clientes).
  async salvarMidiasBase(empresaId, midias) {
    if (midias.length === 0) return
    const valores: unknown[] = []
    const linhas = midias.map((m, i) => {
      const b = i * 10
      valores.push(
        m.id,
        empresaId,
        m.tipo,
        m.legenda,
        m.permalink,
        m.thumbnailUrl,
        m.mediaUrl,
        m.publicadoEm,
        m.curtidas,
        m.comentarios,
      )
      return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8},$${b + 9},$${b + 10}, now())`
    })
    await query(
      `insert into public.instagram_midia
         (id, empresa_id, tipo, legenda, permalink, thumbnail_url, media_url, publicado_em,
          curtidas, comentarios, atualizado_em)
       values ${linhas.join(",")}
       on conflict (id) do update set
         tipo = excluded.tipo,
         legenda = excluded.legenda,
         permalink = excluded.permalink,
         thumbnail_url = excluded.thumbnail_url,
         media_url = excluded.media_url,
         publicado_em = excluded.publicado_em,
         curtidas = coalesce(excluded.curtidas, public.instagram_midia.curtidas),
         comentarios = coalesce(excluded.comentarios, public.instagram_midia.comentarios),
         atualizado_em = now()
       where public.instagram_midia.empresa_id = excluded.empresa_id`,
      valores,
    )
  },

  async listarAlvosJanela(empresaId, desde) {
    return query<{ id: string; tipo: string }>(
      `select id, coalesce(tipo, 'IMAGE') as tipo
         from public.instagram_midia
        where empresa_id = $1 and publicado_em >= $2
        order by metricas_atualizadas_em asc nulls first, publicado_em desc`,
      [empresaId, desde.toISOString()],
    )
  },

  async listarPendentesAntigos(empresaId, antesDe, limite) {
    return query<{ id: string; tipo: string }>(
      `select id, coalesce(tipo, 'IMAGE') as tipo
         from public.instagram_midia
        where empresa_id = $1
          and (publicado_em < $2 or publicado_em is null)
          and (metricas_status is null or metricas_status = 'erro')
        order by publicado_em desc nulls last
        limit $3`,
      [empresaId, antesDe.toISOString(), limite],
    )
  },

  // Cada lote é gravado numa transação curta. Em 'erro' só o status muda
  // (valores anteriores preservados e o post volta primeiro na fila); em
  // 'indisponivel' marca a data sem apagar nada; em 'ok'/'parcial' grava só os
  // campos que a Meta respondeu.
  async salvarMetricas(empresaId, resultados) {
    if (resultados.length === 0) return
    const client = await getPool().connect()
    try {
      await client.query("begin")
      for (const r of resultados) {
        if (r.status === "erro") {
          await client.query(
            `update public.instagram_midia set metricas_status = 'erro' where id = $1 and empresa_id = $2`,
            [r.id, empresaId],
          )
          continue
        }
        const sets = ["metricas_status = $3", "metricas_atualizadas_em = now()"]
        const params: unknown[] = [r.id, empresaId, r.status]
        for (const [campo, valor] of Object.entries(r.valores) as [CampoMetrica, number | null | undefined][]) {
          if (valor === undefined) continue
          params.push(valor)
          sets.push(`${COLUNA_DA_METRICA[campo]} = $${params.length}`)
        }
        await client.query(
          `update public.instagram_midia set ${sets.join(", ")} where id = $1 and empresa_id = $2`,
          params,
        )
      }
      await client.query("commit")
    } catch (e) {
      await client.query("rollback").catch(() => {})
      throw e
    } finally {
      client.release()
    }
  },

  async registrarResultado(empresaId, syncToken, r) {
    await query(
      `update public.instagram_conexao
          set ultima_sync = case when $3 then now() else ultima_sync end,
              status = case when $4 then 'expirado'
                            when $3 then 'conectado'
                            when $5 then status
                            else 'erro' end,
              ultimo_erro = $6,
              erro_codigo = $7,
              erro_temporario = $5
        where empresa_id = $1 and sync_token = $2`,
      [empresaId, syncToken, r.sucesso, r.expirado, r.erroTemporario, r.erroMensagem, r.erroCodigo],
    )
  },
}

// Contas reais elegíveis para a rotina diária, da tentativa mais antiga para a
// mais recente. Contas de demonstração e que precisam de reconexão ficam fora.
export async function listarContasParaSyncDiario(): Promise<string[]> {
  const rows = await query<{ empresa_id: string }>(
    `select empresa_id from public.instagram_conexao
      where modo = 'real' and status <> 'expirado'
      order by ultima_tentativa asc nulls first`,
  )
  return rows.map((r) => r.empresa_id)
}

export function depsSyncPadrao(): DepsSync {
  return {
    repo: repoSyncPostgres,
    criarCliente: (token, maxChamadas) => criarClienteGraph({ token, maxChamadas }),
    gerarId: () => randomUUID(),
    agora: () => Date.now(),
    log: (evento, dados) => console.info(evento, dados),
  }
}
