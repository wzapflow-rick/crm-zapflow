import { NextResponse } from "next/server"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { getPool } from "@/lib/db"

// TEMPORÁRIO: aplica a migração 008 (tabelas do Instagram) usando o pool do app.
export async function GET() {
  try {
    const sql = readFileSync(join(process.cwd(), "scripts", "008-instagram-conexao.sql"), "utf8")
    const pool = getPool()
    await pool.query(sql)
    const r = await pool.query(
      "select to_regclass('public.instagram_conexao') a, to_regclass('public.instagram_midia') b",
    )
    return NextResponse.json({ ok: true, tabelas: r.rows[0] })
  } catch (e) {
    return NextResponse.json({ ok: false, erro: e instanceof Error ? e.message : "erro" }, { status: 500 })
  }
}
