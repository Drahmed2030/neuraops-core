import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { baseline, asRole, engineering, pm } from './helpers/company-os-db.mjs'
let db, originalAgents, originalProfiles
const sql = await readFile(new URL('../supabase/candidates/company-agent-authority.sql',import.meta.url),'utf8').catch(e=>{if(e.code==='ENOENT')return '';throw e})
test.before(async()=>{db=await baseline();originalAgents=(await db.query('select * from public.system_agents order by id')).rows;originalProfiles=(await db.query('select * from neuraops_company.agent_authority_profiles order by agent_id')).rows;if(sql) await db.exec(sql)})
test.after(async()=>{await db?.close()})
test('candidate creates versioned assignments',async()=>{
 assert.equal((await db.query("select to_regclass('neuraops_company.agent_function_assignments')::text name")).rows[0].name,'neuraops_company.agent_function_assignments')
})
test('six identities and task linkage survive repeat candidate seed',async()=>{
 await db.query("insert into public.agent_tasks(agent_id,task_description) values($1,'preserved')",[pm])
 const before=(await db.query('select * from public.system_agents order by id')).rows
 await db.exec(sql)
 assert.deepEqual((await db.query('select * from public.system_agents order by id')).rows,before)
 assert.equal((await db.query('select agent_id from public.agent_tasks')).rows[0].agent_id,pm)
 assert.equal(before.length,7)
 assert.deepEqual(before.filter(a=>a.id!==engineering),originalAgents)
 assert.deepEqual((await db.query('select * from neuraops_company.agent_authority_profiles where agent_id<>$1 order by agent_id',[engineering])).rows,originalProfiles)
 assert.equal((await db.query('select count(*)::int n from neuraops_company.agent_function_assignments')).rows[0].n,7)
})
test('five business functions plus independent assurance remain proposed',async()=>{
 const r=(await db.query("select distinct function_key from neuraops_company.agent_function_assignments where assignment_kind='BUSINESS' order by function_key")).rows.map(x=>x.function_key)
 assert.deepEqual(r,['ENGINEERING','GROWTH','MEDIA','OPERATIONS','RESEARCH'])
 assert.equal((await db.query("select count(*)::int n from neuraops_company.agent_function_assignments where state<>'PROPOSED'")).rows[0].n,0)
})
test('engineering identity is inactive with no allowed actions',async()=>{
 const r=(await db.query('select s.status,p.active,p.allowed_action_classes from public.system_agents s join neuraops_company.agent_authority_profiles p on p.agent_id=s.id where s.id=$1',[engineering])).rows[0]
 assert.deepEqual(r,{status:'INACTIVE',active:false,allowed_action_classes:[]})
})
test('assignment activation is rejected until authenticated approval path exists',async()=>{
 await assert.rejects(db.exec("update neuraops_company.agent_function_assignments set state='ACTIVE'"))
})
test('policy snapshots cannot be rewritten, even by ordinary owner DML',async()=>{
 await assert.rejects(db.exec('update neuraops_company.agent_authority_profile_versions set policy_version=2'),/immutable/)
 await assert.rejects(db.exec('delete from neuraops_company.agent_authority_profile_versions'),/immutable/)
})
test('policy widening cannot silently replace the current profile',async()=>{
 await assert.rejects(db.query('update neuraops_company.agent_authority_profiles set allowed_action_classes=array[\'PRODUCTION\'] where agent_id=$1',[pm]),/approval.*disabled/)
})
test('service and authenticated callers cannot assign, self-approve or change controls',async()=>{
 for(const role of ['service_role','authenticated','anon']){
  for(const table of ['agent_function_assignments','agent_authority_profile_versions','task_approvals','operating_controls'])
   await assert.rejects(asRole(db,role,`delete from neuraops_company.${table}`),e=>e.code==='42501')
 }
})
test('failed mapping transaction rolls back the whole write',async()=>{
 const before=(await db.query('select count(*)::int n from neuraops_company.agent_function_assignments')).rows[0].n
 await db.exec('begin')
 try {
  await db.query("insert into neuraops_company.agent_function_assignments(agent_id,function_key,assignment_kind,assignment_version) values($1,'RESEARCH','BUSINESS',1)",[pm])
  await db.exec("insert into neuraops_company.agent_function_assignments(agent_id,function_key,assignment_kind,assignment_version) values('00000000-0000-0000-0000-000000000000','RESEARCH','BUSINESS',1)")
  assert.fail('unknown identity must fail')
 } catch(e){assert.equal(e.code,'23503')} finally {await db.exec('rollback')}
 assert.equal((await db.query('select count(*)::int n from neuraops_company.agent_function_assignments')).rows[0].n,before)
})
test('same assignment version cannot be duplicated',async()=>{
 await assert.rejects(db.query("insert into neuraops_company.agent_function_assignments(agent_id,function_key,assignment_kind,assignment_version) values($1,'OPERATIONS','BUSINESS',1)",[pm]),e=>e.code==='23505')
})
test('operating controls stay disabled',async()=>{
 assert.equal((await db.query('select count(*)::int n from neuraops_company.operating_controls where enabled')).rows[0].n,0)
})
