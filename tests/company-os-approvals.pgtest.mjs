import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { baseline,candidate,asRole,pm } from './helpers/company-os-db.mjs'
let db
const actor='a'.repeat(64), key=()=>crypto.randomUUID()
const draft=await readFile(new URL('../supabase/candidates/company-task-approvals.sql',import.meta.url),'utf8').catch(e=>{if(e.code==='ENOENT')return '';throw e})
test.before(async()=>{db=await baseline();await candidate(db);if(draft)await db.exec(draft)})
test.after(async()=>{await db?.close()})
async function task(budget=.05,requester='b'.repeat(64)){
 const id=(await db.query("insert into public.agent_tasks(agent_id,task_description,lifecycle_state,risk_level,action_class,data_class,budget_limit_usd,expires_at,requested_by_reference,payload) values($1,'synthetic approval','WAITING_APPROVAL',1,'INTERNAL_CREATE','PUBLIC',$2,now()+interval '1 hour',$3,'{}') returning id",[pm,budget,requester])).rows[0].id
 // Owner-created synthetic attestation; the live issuer is deliberately not implemented.
 await db.query("insert into neuraops_company.task_requester_attestations(task_id,principal_reference,verified_origin) values($1,$2,'SERVER_VERIFIED_HUMAN')",[id,requester])
 return id
}
async function snapshot(id){return (await asRole(db,'service_role','select public.company_task_approval_snapshot($1) value',[id])).rows[0].value}
async function approve(id,digest,k=key(),who=actor){return (await asRole(db,'service_role','select public.company_record_task_approval($1,$2,$3,$4) value',[id,digest,who,k])).rows[0].value}
test('approval binding storage exists',async()=>assert.equal((await db.query("select to_regclass('neuraops_company.task_approval_bindings')::text n")).rows[0].n,'neuraops_company.task_approval_bindings'))
test('record approval and budget reservation atomically, replay once',async()=>{
 const id=await task(), s=await snapshot(id), k=key(), r=await approve(id,s.digest,k)
 assert.equal(r.status,'RECORDED_NOT_EXECUTED');assert.deepEqual(await approve(id,s.digest,k),r)
 assert.equal((await db.query('select count(*)::int n from neuraops_company.task_approval_bindings where task_id=$1',[id])).rows[0].n,1)
})
test('changed payload and destination invalidate the reviewed digest',async()=>{
 const id=await task(),s=await snapshot(id)
 await db.query("update public.agent_tasks set payload='{\"destination\":\"external\"}' where id=$1",[id])
 await assert.rejects(approve(id,s.digest),/STALE_APPROVAL/)
})
test('changed policy invalidates review without accepting a new grant',async()=>{
 const id=await task(),s=await snapshot(id)
 await db.query("update public.agent_tasks set model_route='{\"policy_version\":999}' where id=$1",[id])
 await assert.rejects(approve(id,s.digest),/STALE_APPROVAL/)
})
test('unknown task, expired task, restricted or external work is denied',async()=>{
 await assert.rejects(snapshot(crypto.randomUUID()),/TASK_NOT_FOUND/)
 for(const change of ["expires_at=now()-interval '1 second'","data_class='RESTRICTED'","external_action_allowed=true","risk_level=3"]){
  const id=await task();await db.query('update public.agent_tasks set '+change+' where id=$1',[id]);const s=await snapshot(id)
  await assert.rejects(approve(id,s.digest),/TASK_NOT_APPROVABLE/)
 }
})
test('self approval and malformed actor are denied',async()=>{
 const id=await task(.05,actor);const s=await snapshot(id)
 await assert.rejects(approve(id,s.digest),/SELF_APPROVAL/)
 await assert.rejects(approve(id,s.digest,key(),'founder'),/INVALID_APPROVAL_REQUEST/)
})
test('anonymous and authenticated callers cannot assert an operator identity directly',async()=>{
 const id=await task(),s=await snapshot(id)
 for(const role of ['anon','authenticated']) await assert.rejects(asRole(db,role,'select public.company_record_task_approval($1,$2,$3,$4)',[id,s.digest,actor,key()]),e=>e.code==='42501')
})
test('per-task spending cap rejects oversized requests',async()=>{
 const id=await task(.06),s=await snapshot(id);await assert.rejects(approve(id,s.digest),/BUDGET_LIMIT/)
})
test('daily cap has no partial approval or budget write on failure',async()=>{
 await db.exec('update neuraops_company.approval_budget_days set reserved_usd=1')
 const id=await task(),s=await snapshot(id);await assert.rejects(approve(id,s.digest),/BUDGET_LIMIT/)
 assert.equal((await db.query('select count(*)::int n from neuraops_company.task_approval_bindings where task_id=$1',[id])).rows[0].n,0)
})
test('approval records never enable execution or operating controls',async()=>{
 assert.equal((await db.query('select count(*)::int n from neuraops_company.operating_controls where enabled')).rows[0].n,0)
 const id=await task();assert.equal((await asRole(db,'service_role','select * from public.company_execution_gateway_preflight($1)',[id])).rows[0].allowed,false)
})
test('an agent reference cannot approve its own work',async()=>{
 const id=await task(0),s=await snapshot(id)
 const who=(await db.query("select encode(sha256(convert_to($1,'UTF8')),'hex') h",[pm])).rows[0].h
 await assert.rejects(approve(id,s.digest,key(),who),/SELF_APPROVAL/)
})
test('revocation prevents replay of a recorded approval',async()=>{
 const id=await task(0),s=await snapshot(id),k=key();await approve(id,s.digest,k)
 await db.query("insert into neuraops_company.task_approvals(task_id,approval_level,decision,approved_by_reference) values($1,3,'REVOKE',$2)",[id,actor])
 await assert.rejects(approve(id,s.digest,k),/APPROVAL_REVOKED/)
})
test('prior rejection or revocation blocks first approval recording',async()=>{
 for(const decision of ['REJECT','REVOKE']){
  const id=await task(0),s=await snapshot(id)
  await db.query('insert into neuraops_company.task_approvals(task_id,approval_level,decision,approved_by_reference) values($1,3,$2,$3)',[id,decision,actor])
  await assert.rejects(approve(id,s.digest),/APPROVAL_REVOKED/)
 }
})
test('missing or noncanonical requester provenance fails closed',async()=>{
 for(const who of [null,pm,'unverified-label']){
  const id=await task(0);await db.query('update public.agent_tasks set requested_by_reference=$1 where id=$2',[who,id]);const s=await snapshot(id)
  await assert.rejects(approve(id,s.digest),/REQUESTER_PROVENANCE_REQUIRED/)
 }
})
test('expiry window uses post-lock wall clock and refuses UTC day rollover',async()=>{
 await assert.rejects(db.query("select neuraops_company.approval_expiry_at('2026-10-09T00:00:01Z','2026-10-09T01:00:00Z','2026-10-08')"),/BUDGET_DAY_CHANGED/)
 await assert.rejects(db.query("select neuraops_company.approval_expiry_at('2026-10-08T12:00:02Z','2026-10-08T12:00:01Z','2026-10-08')"),/TASK_NOT_APPROVABLE/)
})

test('a canonical hash alone is not verified requester provenance',async()=>{
 const id=(await db.query("insert into public.agent_tasks(agent_id,task_description,lifecycle_state,risk_level,action_class,data_class,budget_limit_usd,expires_at,requested_by_reference) values($1,'unattested','WAITING_APPROVAL',1,'INTERNAL_CREATE','PUBLIC',0,now()+interval '1 hour',$2) returning id",[pm,'b'.repeat(64)])).rows[0].id
 const s=await snapshot(id);await assert.rejects(approve(id,s.digest),/REQUESTER_PROVENANCE_REQUIRED/)
 for(const role of ['anon','authenticated','service_role']) await assert.rejects(asRole(db,role,"insert into neuraops_company.task_requester_attestations(task_id,principal_reference,verified_origin) values($1,$2,'SERVER_VERIFIED_HUMAN')",[id,'b'.repeat(64)]),e=>e.code==='42501')
})
