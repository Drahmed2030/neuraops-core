import { PGlite } from '../../tools/company-os-verification/node_modules/@electric-sql/pglite/dist/index.js'
import { readFile, readdir } from 'node:fs/promises'
const root = new URL('../fixtures/company-os/', import.meta.url)
export const pm = 'dce3a297-b28c-45b5-96d5-da4a8dc195aa'
export const engineering = 'f44919ab-3f1a-430e-90f9-c569d8c1bb01'
export async function baseline() {
  const db = new PGlite()
  try {
    await db.exec(await readFile(new URL('baseline.sql', root), 'utf8'))
    for (const f of (await readdir(new URL('source/', root))).sort())
      await db.exec(await readFile(new URL('source/' + f, root), 'utf8'))
    return db
  } catch (e) { await db.close(); throw e }
}
export async function candidate(db) {
  await db.exec(await readFile(new URL('../../supabase/candidates/company-agent-authority.sql', import.meta.url), 'utf8'))
}
export async function asRole(db, role, sql, args=[]) {
  if (!['anon','authenticated','service_role'].includes(role)) throw new Error('unsupported fixture role')
  await db.exec('set role ' + role)
  try { return await db.query(sql,args) } finally { await db.exec('reset role') }
}
