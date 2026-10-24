import "server-only"
import { query, getPool } from "@/lib/db"
import { criptografarToken, descriptografarToken } from "@/lib/instagram-crypto"

export type ModoInstagram = "real" | "demo"
export type StatusInstagram = "conectado" | "expirado" | "erro"

export type ConexaoInstagram = {
  empresaId: string
  modo: ModoInstagram
  igUserId: string | null
  username: string | null
  nome: string | null
  accountType: string | null
  profilePictureUrl: string | null
  seguidores: number | null
  segue: number | null
  midiaCount: number | null
  tokenExpiraEm: string | null
  status: StatusInstagram
  ultimoErro: string | null
  conectadoEm: string
  ultimaSync: string | null
  ultimaTentativa: string | null
  syncBloqueadaAte: string | null
  erroCodigo: string | null
  erroTemporario: boolean
}

export type MidiaInstagram = {
  id: string
  tipo: string
  legenda: string
  permalink: string
  thumbnailUrl: string
  mediaUrl: string
  publicadoEm: string
  curtidas: number | null
  comentarios: number | null
  alcance: number | null
  impressoes: number | null
  salvamentos: number | null
  compartilhamentos: number | null
  visualizacoes: number | null
  visitasPerfil: number | null
  seguidores: number | null
  reposts: number | null
}

type ConexaoRow = {
  empresa_id: string
  modo: string
  ig_user_id: string | null
  username: string | null
  nome: string | null
  account_type: string | null
  profile_picture_url: string | null
  seguidores: number | null
  segue: number | null
  midia_count: number | null
  token_expira_em: Date | null
  status: string
  ultimo_erro: string | null
  conectado_em: Date
  ultima_sync: Date | null
  ultima_tentativa: Date | null
  sync_bloqueada_ate: Date | null
  erro_codigo: string | null
  erro_temporario: boolean | null
}

type MidiaRow = {
  id: string
  tipo: string | null
  legenda: string | null
  permalink: string | null
  thumbnail_url: string | null
  media_url: string | null
  publicado_em: Date | null
  curtidas: number | null
  comentarios: number | null
  alcance: number | null
  impressoes: number | null
  salvamentos: number | null
  compartilhamentos: number | null
  visualizacoes: number | null
  visitas_perfil: number | null
  seguidores: number | null
  reposts: number | null
}

function mapConexao(r: ConexaoRow): ConexaoInstagram {
  return {
    empresaId: r.empresa_id,
    modo: r.modo === "demo" ? "demo" : "real",
    igUserId: r.ig_user_id,
    username: r.username,
    nome: r.nome,
    accountType: r.account_type,
    profilePictureUrl: r.profile_picture_url,
    seguidores: r.seguidores,
    segue: r.segue,
    midiaCount: r.midia_count,
    tokenExpiraEm: r.token_expira_em ? new Date(r.token_expira_em).toISOString() : null,
    status: (["conectado", "expirado", "erro"].includes(r.status) ? r.status : "conectado") as StatusInstagram,
    ultimoErro: r.ultimo_erro,
    conectadoEm: new Date(r.conectado_em).toISOString(),
    ultimaSync: r.ultima_sync ? new Date(r.ultima_sync).toISOString() : null,
    ultimaTentativa: r.ultima_tentativa ? new Date(r.ultima_tentativa).toISOString() : null,
    syncBloqueadaAte: r.sync_bloqueada_ate ? new Date(r.sync_bloqueada_ate).toISOString() : null,
    erroCodigo: r.erro_codigo,
    erroTemporario: r.erro_temporario === true,
  }
}

// Dados públicos da conexão (nunca inclui o access token).
export async function getConexaoInstagram(empresaId: string): Promise<ConexaoInstagram | null> {
  const rows = await query<ConexaoRow>(
    `select empresa_id, modo, ig_user_id, username, nome, account_type, profile_picture_url,
            seguidores, segue, midia_count, token_expira_em, status, ultimo_erro, conectado_em, ultima_sync,
            ultima_tentativa, sync_bloqueada_ate, erro_codigo, erro_temporario
       from public.instagram_conexao
      where empresa_id = $1`,
    [empresaId],
  )
  return rows[0] ? mapConexao(rows[0]) : null
}

// Devolve o access token descriptografado (uso interno em sync/refresh).
export async function getTokenInstagram(empresaId: string): Promise<string | null> {
  const rows = await query<{ access_token: string | null }>(
    `select access_token from public.instagram_conexao where empresa_id = $1`,
    [empresaId],
  )
  const enc = rows[0]?.access_token
  if (!enc) return null
  try {
    return descriptografarToken(enc)
  } catch {
    return null
  }
}

export type SalvarConexaoInput = {
  empresaId: string
  modo: ModoInstagram
  igUserId?: string | null
  username?: string | null
  nome?: string | null
  accountType?: string | null
  profilePictureUrl?: string | null
  seguidores?: number | null
  segue?: number | null
  midiaCount?: number | null
  accessToken?: string | null // texto puro; será criptografado aqui
  tokenExpiraEm?: string | null
}

// Cria/atualiza a conexão (upsert por empresa_id).
export async function salvarConexaoInstagram(dados: SalvarConexaoInput): Promise<void> {
  const tokenCripto =
    dados.accessToken != null && dados.accessToken !== "" ? criptografarToken(dados.accessToken) : null

  await query(
    `insert into public.instagram_conexao
       (empresa_id, modo, ig_user_id, username, nome, account_type, profile_picture_url,
        seguidores, segue, midia_count, access_token, token_expira_em, status, ultimo_erro,
        conectado_em, ultima_sync)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'conectado',null, now(), null)
     on conflict (empresa_id) do update set
       modo = excluded.modo,
       ig_user_id = excluded.ig_user_id,
       username = excluded.username,
       nome = excluded.nome,
       account_type = excluded.account_type,
       profile_picture_url = excluded.profile_picture_url,
       seguidores = excluded.seguidores,
       segue = excluded.segue,
       midia_count = excluded.midia_count,
       access_token = coalesce(excluded.access_token, public.instagram_conexao.access_token),
       token_expira_em = excluded.token_expira_em,
       status = 'conectado',
       ultimo_erro = null,
       erro_codigo = null,
       erro_temporario = false,
       conectado_em = now()`,
    [
      dados.empresaId,
      dados.modo,
      dados.igUserId ?? null,
      dados.username ?? null,
      dados.nome ?? null,
      dados.accountType ?? null,
      dados.profilePictureUrl ?? null,
      dados.seguidores ?? null,
      dados.segue ?? null,
      dados.midiaCount ?? null,
      tokenCripto,
      dados.tokenExpiraEm ?? null,
    ],
  )
}

// Atualiza só os campos de perfil e marca a data de sincronização.
export async function marcarSyncInstagram(
  empresaId: string,
  perfil: { seguidores?: number | null; segue?: number | null; midiaCount?: number | null },
): Promise<void> {
  await query(
    `update public.instagram_conexao
        set seguidores = coalesce($2, seguidores),
            segue = coalesce($3, segue),
            midia_count = coalesce($4, midia_count),
            ultima_sync = now(),
            status = 'conectado',
            ultimo_erro = null,
            erro_codigo = null,
            erro_temporario = false
      where empresa_id = $1`,
    [empresaId, perfil.seguidores ?? null, perfil.segue ?? null, perfil.midiaCount ?? null],
  )
}

export async function registrarErroInstagram(empresaId: string, erro: string): Promise<void> {
  await query(
    `update public.instagram_conexao set status = 'erro', ultimo_erro = $2 where empresa_id = $1`,
    [empresaId, erro.slice(0, 500)],
  )
}

export async function desconectarInstagram(empresaId: string): Promise<void> {
  const pool = getPool()
  await pool.query(`delete from public.instagram_midia where empresa_id = $1`, [empresaId])
  await pool.query(`delete from public.instagram_conexao where empresa_id = $1`, [empresaId])
}

// Remove todas as conexões e mídias associadas a um usuário do Instagram
// (ig_user_id). Usado pelos callbacks de desautorização e exclusão de dados
// exigidos pela Meta. Retorna os empresaIds afetados.
export async function excluirDadosPorIgUserId(igUserId: string): Promise<string[]> {
  const pool = getPool()
  const { rows } = await pool.query<{ empresa_id: string }>(
    `select empresa_id from public.instagram_conexao where ig_user_id = $1`,
    [igUserId],
  )
  const empresaIds = rows.map((r) => r.empresa_id)
  for (const empresaId of empresaIds) {
    await pool.query(`delete from public.instagram_midia where empresa_id = $1`, [empresaId])
    await pool.query(`delete from public.instagram_conexao where empresa_id = $1`, [empresaId])
  }
  return empresaIds
}

// Posts de demonstração têm id "demo-…" (ids reais da Meta são numéricos).
// A inteligência do cliente passa excluirDemo para nunca analisar dados fictícios.
export async function getMidiasInstagram(
  empresaId: string,
  opcoes: { excluirDemo?: boolean } = {},
): Promise<MidiaInstagram[]> {
  const rows = await query<MidiaRow>(
    `select id, tipo, legenda, permalink, thumbnail_url, media_url, publicado_em, curtidas,
            comentarios, alcance, impressoes, salvamentos, compartilhamentos, visualizacoes,
            visitas_perfil, seguidores, reposts
       from public.instagram_midia
      where empresa_id = $1
        ${opcoes.excluirDemo ? "and id not like 'demo-%'" : ""}
      order by publicado_em desc nulls last`,
    [empresaId],
  )
  return rows.map((r) => ({
    id: r.id,
    tipo: r.tipo ?? "IMAGE",
    legenda: r.legenda ?? "",
    permalink: r.permalink ?? "",
    thumbnailUrl: r.thumbnail_url ?? "",
    mediaUrl: r.media_url ?? "",
    publicadoEm: r.publicado_em ? new Date(r.publicado_em).toISOString() : "",
    curtidas: r.curtidas,
    comentarios: r.comentarios,
    alcance: r.alcance,
    impressoes: r.impressoes,
    salvamentos: r.salvamentos,
    compartilhamentos: r.compartilhamentos,
    visualizacoes: r.visualizacoes,
    visitasPerfil: r.visitas_perfil,
    seguidores: r.seguidores,
    reposts: r.reposts,
  }))
}

export type MidiaUpsert = {
  id: string
  tipo?: string
  legenda?: string
  permalink?: string
  thumbnailUrl?: string
  mediaUrl?: string
  publicadoEm?: string | null
  curtidas?: number | null
  comentarios?: number | null
  alcance?: number | null
  impressoes?: number | null
  salvamentos?: number | null
  compartilhamentos?: number | null
  visualizacoes?: number | null
  visitasPerfil?: number | null
  seguidores?: number | null
  reposts?: number | null
}

// Grava/atualiza mídias completas (upsert por id). Hoje usado só pelo modo
// demonstração; a sincronização real usa lib/instagram-sync-repo.ts.
export async function salvarMidiasInstagram(empresaId: string, midias: MidiaUpsert[]): Promise<void> {
  if (midias.length === 0) return
  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query("begin")
    for (const m of midias) {
      await client.query(
        `insert into public.instagram_midia
           (id, empresa_id, tipo, legenda, permalink, thumbnail_url, media_url, publicado_em,
            curtidas, comentarios, alcance, impressoes, salvamentos, compartilhamentos, visualizacoes,
            visitas_perfil, seguidores, reposts, atualizado_em, metricas_status, metricas_atualizadas_em)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18, now(), 'ok', now())
         on conflict (id) do update set
           tipo = excluded.tipo,
           legenda = excluded.legenda,
           permalink = excluded.permalink,
           thumbnail_url = excluded.thumbnail_url,
           media_url = excluded.media_url,
           publicado_em = excluded.publicado_em,
           curtidas = excluded.curtidas,
           comentarios = excluded.comentarios,
           alcance = excluded.alcance,
           impressoes = excluded.impressoes,
           salvamentos = excluded.salvamentos,
           compartilhamentos = excluded.compartilhamentos,
           visualizacoes = excluded.visualizacoes,
           visitas_perfil = excluded.visitas_perfil,
           seguidores = excluded.seguidores,
           reposts = excluded.reposts,
           atualizado_em = now(),
           metricas_status = 'ok',
           metricas_atualizadas_em = now()
         where public.instagram_midia.empresa_id = excluded.empresa_id`,
        [
          m.id,
          empresaId,
          m.tipo ?? "IMAGE",
          m.legenda ?? null,
          m.permalink ?? null,
          m.thumbnailUrl ?? null,
          m.mediaUrl ?? null,
          m.publicadoEm ?? null,
          m.curtidas ?? null,
          m.comentarios ?? null,
          m.alcance ?? null,
          m.impressoes ?? null,
          m.salvamentos ?? null,
          m.compartilhamentos ?? null,
          m.visualizacoes ?? null,
          m.visitasPerfil ?? null,
          m.seguidores ?? null,
          m.reposts ?? null,
        ],
      )
    }
    await client.query("commit")
  } catch (e) {
    await client.query("rollback")
    throw e
  } finally {
    client.release()
  }
}
