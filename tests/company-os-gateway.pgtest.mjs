import test from 'node:test'
import assert from 'node:assert/strict'
import { baseline,candidate,asRole,pm,engineering } from './helpers/company-os-db.mjs'
let db
 test.before(async()=>{db=await baseline();await candidate(db)})
 test.after(async()=>{await db?.close()})
async function task(agent=pm, payload={}) {
 return (await db.query("insert into public.agent_tasks(agent_id,task_description,lifecycle_state,risk_level,action_class,data_class,execution_mode,expires_at,payload) values($1,'synthetic','READY',0,'RESEARCH','PUBLIC','INTERNAL',now()+interval '1 hour',$2) returning id",[agent,JSON.stringify(payload)])).rows[0].id
}
async function gate(id){return (await asRole(db,'service_role','select * from public.company_execution_gateway_preflight($1)',[id])).rows[0]}
test('a proposed assignment never authorizes execution',async()=>{
 assert.equal((await gate(await task())).allowed,false)
})
test('inactive engineering is denied',async()=>{
 assert.equal((await gate(await task(engineering))).reason,'AGENT_NOT_AUTHORIZED')
})
test('caller role claims and unverified approval records do not activate execution',async()=>{
 const id=await task(pm,{role:'founder',approved:true})
 await db.query("insert into neuraops_company.task_approvals(task_id,approval_level,decision,approved_by_reference,evidence) values($1,3,'APPROVE','forged-founder','{}')",[id])
 assert.equal((await gate(id)).allowed,false)
 await db.query("update public.agent_tasks set payload='{"+'"changed":true' +"}' where id=$1",[id])
 assert.equal((await gate(id)).allowed,false)
})
test('internal authority checker also returns explicit deny for absent task',async()=>{
 const rows=(await db.query("select * from neuraops_company.task_authority_check('00000000-0000-0000-0000-000000000000')")).rows
 assert.equal(rows.length,1);assert.equal(rows[0].allowed,false)
})
test('model kill switch is preserved',async()=>{
 const id=await task();await db.query("update public.agent_tasks set execution_mode='MODEL_ROUTED' where id=$1",[id])
 assert.equal((await gate(id)).reason,'MODEL_EXECUTION_KILL_SWITCH')
})
async function envelope(id, overrides={}) {
 const t=(await db.query('select * from public.agent_tasks where id=$1',[id])).rows[0]
 const e={agent:t.agent_id,version:1,risk:t.risk_level,action:t.action_class,data:t.data_class,budget:t.budget_limit_usd,correlation:t.correlation_id,expiry:t.expires_at,external:false,tools:[],providers:[],...overrides}
 await db.query(`insert into neuraops_company.execution_envelopes
 (task_id,agent_id,policy_version,risk_level,action_class,data_class,model_budget_usd,input_fingerprint,idempotency_key,correlation_id,expires_at,external_action_allowed,permitted_tools,model_provider_allowlist)
 values($1,$2,$3,$4,$5,$6,$7,'synthetic',$8,$9,$10,$11,$12,$13)`,[id,e.agent,e.version,e.risk,e.action,e.data,e.budget,crypto.randomUUID(),e.correlation,e.expiry,e.external,e.tools,e.providers])
}
test('a ready task without a sealed envelope cannot reach assignment evaluation',async()=>{
 const r=await gate(await task());assert.equal(r.allowed,false);assert.equal(r.reason,'EXECUTION_ENVELOPE_MISSING')
})
test('an envelope cannot select an unrecorded policy version',async()=>{
 const id=await task();await envelope(id,{version:999});const r=await gate(id)
 assert.equal(r.allowed,false);assert.equal(r.reason,'POLICY_VERSION_MISMATCH')
})
test('task drift cannot reuse an envelope for another scope or agent',async()=>{
 for(const overrides of [{agent:engineering},{risk:1},{action:'INTERNAL_CREATE'},{data:'INTERNAL'},{budget:'0.04'},{correlation:crypto.randomUUID()},{expiry:new Date(Date.now()+1800000)},{external:true}]){
  const id=await task();await envelope(id,overrides);const r=await gate(id)
  assert.equal(r.allowed,false);assert.equal(r.reason,'EXECUTION_ENVELOPE_MISMATCH',JSON.stringify(overrides))
 }
})
test('matching version numbers cannot hide missing or divergent policy history',async()=>{
 for(const mutation of [
  'delete from neuraops_company.agent_authority_profile_versions where agent_id=$1',
  `update neuraops_company.agent_authority_profile_versions set profile='{}' where agent_id=$1`
 ]){
  await db.exec('begin')
  try{
   const id=await task();await envelope(id)
   // Owner-only fault injection in this disposable database; always rolled back.
   await db.exec('alter table neuraops_company.agent_authority_profile_versions disable trigger company_policy_history_immutable')
   await db.query(mutation,[pm]);const r=await gate(id)
   assert.equal(r.allowed,false);assert.equal(r.reason,'POLICY_VERSION_MISMATCH')
  }finally{await db.exec('rollback')}
 }
})
test('matching envelope and policy do not activate proposed assignments',async()=>{
 const id=await task();await envelope(id);const r=await gate(id)
 assert.equal(r.allowed,false);assert.equal(r.reason,'ASSIGNMENT_ACTIVATION_DISABLED')
})
async function delegation(change='none') {
 const parent=await task(pm,{destination:'internal-draft'}), child=await task(pm,{destination:'internal-draft'})
 await db.query("update public.agent_tasks set budget_limit_usd=0.04,expires_at=date_trunc('second',now())+interval '1 hour' where id=$1",[parent])
 await db.query("update public.agent_tasks set parent_task_id=$1,budget_limit_usd=0.02,expires_at=date_trunc('second',now())+interval '30 minutes' where id=$2",[parent,child])
 if(change==='budget')await db.query('update public.agent_tasks set budget_limit_usd=0.05 where id=$1',[child])
 if(change==='expiry')await db.query("update public.agent_tasks set expires_at=now()+interval '2 hours' where id=$1",[child])
 if(change==='destination')await db.query(`update public.agent_tasks set payload='{"destination":"other-draft"}' where id=$1`,[child])
 if(change==='missing-destination')await db.query("update public.agent_tasks set payload='{}' where id=$1",[child])
 if(change==='risk')await db.query("update public.agent_tasks set risk_level=1 where id=$1",[child])
 if(change==='data')await db.query("update public.agent_tasks set data_class='INTERNAL' where id=$1",[child])
 if(change==='action')await db.query("update public.agent_tasks set action_class='REVIEW' where id=$1",[child])
 if(change==='unbounded')await db.query('update public.agent_tasks set budget_limit_usd=null where id=$1',[child])
 if(change==='nested')await db.query('update public.agent_tasks set parent_task_id=$1 where id=$2',[child,parent])
 await envelope(child,change==='tools'?{tools:['database.write']}:change==='providers'?{providers:['unapproved-provider']}:{})
 if(change!=='missing-parent-envelope')await envelope(parent)
 return child
}
test('delegation cannot enlarge budget, expiry, data scope, risk or destination',async()=>{
 for(const change of ['budget','expiry','destination','missing-destination','risk','data','action','unbounded','tools','providers']){
  const r=await gate(await delegation(change));assert.equal(r.allowed,false);assert.equal(r.reason,'DELEGATION_SCOPE_EXCEEDED',change)
 }
})
test('delegation requires a stored parent envelope and rejects cycles or nested delegation',async()=>{
 for(const [change,reason] of [['missing-parent-envelope','PARENT_ENVELOPE_MISSING'],['nested','NESTED_DELEGATION_DISABLED']]){
  const r=await gate(await delegation(change));assert.equal(r.allowed,false);assert.equal(r.reason,reason)
 }
})
test('a matching child cannot execute through an unauthorized parent',async()=>{
 const r=await gate(await delegation());assert.equal(r.allowed,false);assert.equal(r.reason,'PARENT_NOT_AUTHORIZED')
})
