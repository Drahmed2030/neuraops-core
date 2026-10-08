import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {baseline,candidate,asRole,pm} from './helpers/company-os-db.mjs'
let db
const actor='a'.repeat(64), requester='b'.repeat(64)
test.before(async()=>{
 db=await baseline();await candidate(db)
 for(const f of ['company-task-approvals.sql','company-task-provenance.sql'])await db.exec(await readFile(new URL('../supabase/candidates/'+f,import.meta.url),'utf8'))
})
test.after(async()=>db?.close())
async function task(cents,parent=null){
 const r=(await asRole(db,'service_role','select public.company_create_task_request($1,$2,$3,$4,$5,$6) r',[pm,'Synthetic budget test','RESEARCH',cents,requester,crypto.randomUUID()])).rows[0].r
 // Owner-only synthetic linkage: no live delegation-creation endpoint exists yet.
 if(parent)await db.query('update public.agent_tasks set parent_task_id=$1 where id=$2',[parent,r.task_id])
 return r.task_id
}
async function approve(id,key=crypto.randomUUID()){
 const d=(await asRole(db,'service_role','select public.company_task_approval_snapshot($1) r',[id])).rows[0].r.digest
 return (await asRole(db,'service_role','select public.company_record_task_approval($1,$2,$3,$4) r',[id,d,actor,key])).rows[0].r
}
test('siblings cannot collectively reserve more than the approved parent budget',async()=>{
 const p=await task(5);await approve(p)
 await approve(await task(3,p));const second=await task(3,p)
 const before=(await db.query('select reserved_usd from neuraops_company.approval_budget_days')).rows
 await assert.rejects(approve(second),/PARENT_BUDGET_LIMIT/)
 assert.deepEqual((await db.query('select reserved_usd from neuraops_company.approval_budget_days')).rows,before)
 assert.equal((await db.query('select count(*)::int n from neuraops_company.task_approval_bindings where task_id=$1',[second])).rows[0].n,0)
})
test('exact replay reserves once and permits the remaining sibling budget',async()=>{
 const p=await task(5);await approve(p);const child=await task(3,p),key=crypto.randomUUID()
 const a=await approve(child,key);assert.deepEqual(await approve(child,key),a)
 const b=await approve(await task(2,p));assert.equal(b.status,'RECORDED_NOT_EXECUTED')
 const parent=(await db.query('select expires_at from neuraops_company.task_approval_bindings where task_id=$1',[p])).rows[0]
 assert.ok(new Date(b.expires_at)<=parent.expires_at)
})
test('unapproved, revoked or changed parent cannot sponsor a child approval',async()=>{
 for(const state of ['unapproved','revoked','changed']){
  const p=await task(5)
  if(state!=='unapproved')await approve(p)
  if(state==='revoked')await db.query("insert into neuraops_company.task_approvals(task_id,approval_level,decision,approved_by_reference) values($1,3,'REVOKE',$2)",[p,actor])
  if(state==='changed')await db.query("update public.agent_tasks set task_description='Changed after review' where id=$1",[p])
  await assert.rejects(approve(await task(1,p)),/PARENT_APPROVAL_REQUIRED/)
 }
})
test('nested delegation remains disabled at approval recording',async()=>{
 const p=await task(5);await approve(p);const c=await task(3,p);await approve(c)
 await assert.rejects(approve(await task(1,c)),/NESTED_DELEGATION_DISABLED/)
})
test('revoked parent blocks replay of an existing child approval',async()=>{
 const p=await task(5);await approve(p);const c=await task(2,p),k=crypto.randomUUID();await approve(c,k)
 await db.query("insert into neuraops_company.task_approvals(task_id,approval_level,decision,approved_by_reference) values($1,3,'REVOKE',$2)",[p,actor])
 await assert.rejects(approve(c,k),/PARENT_APPROVAL_REQUIRED/)
})
test('changing child linkage does not release the original reserved budget',async()=>{
 const p=await task(5);await approve(p);const c=await task(4,p);await approve(c)
 await db.query('update public.agent_tasks set parent_task_id=null where id=$1',[c])
 await assert.rejects(approve(await task(2,p)),/PARENT_BUDGET_LIMIT/)
})
