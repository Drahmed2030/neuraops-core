import test from 'node:test'
import assert from 'node:assert/strict'
import { baseline, asRole, pm } from './helpers/company-os-db.mjs'
let db
 test.before(async()=>{db=await baseline()})
 test.after(async()=>{await db?.close()})
test('recovered schema preserves six identities and foreign-key task linkage',async()=>{
 assert.equal((await db.query('select count(*)::int n from public.system_agents')).rows[0].n,6)
 const r=await db.query("insert into public.agent_tasks(agent_id,task_description) values ($1,'synthetic') returning agent_id",[pm])
 assert.equal(r.rows[0].agent_id,pm)
 await assert.rejects(db.query("insert into public.agent_tasks(agent_id,task_description) values ('00000000-0000-0000-0000-000000000000','synthetic')"),e=>e.code==='23503')
})
test('duplicate display names cannot introduce an ambiguous identity',async()=>{
 await assert.rejects(db.exec("insert into public.system_agents(agent_name,role,system_prompt) values ('Neura-PM','fake','synthetic')"),e=>e.code==='23505')
})
test('existing service role cannot mutate private authority tables',async()=>{
 await assert.rejects(asRole(db,'service_role','update neuraops_company.agent_authority_profiles set active=false'),e=>e.code==='42501')
})
test('service wrapper returns a denial for unknown task, anonymous callers cannot invoke it',async()=>{
 const q="select * from public.company_execution_gateway_preflight('00000000-0000-0000-0000-000000000000')"
 assert.equal((await asRole(db,'service_role',q)).rows[0].allowed,false)
 await assert.rejects(asRole(db,'anon',q),e=>e.code==='42501')
})
test('model, external and production controls remain disabled',async()=>{
 assert.equal((await db.query('select count(*)::int n from neuraops_company.operating_controls where enabled')).rows[0].n,0)
})
