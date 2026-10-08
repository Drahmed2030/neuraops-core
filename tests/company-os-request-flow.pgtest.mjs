import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {registerHooks} from 'node:module'
import {baseline,candidate,asRole,pm,engineering} from './helpers/company-os-db.mjs'
const users=['123e4567-e89b-42d3-a456-426614174000','123e4567-e89b-42d3-a456-426614174001']
let db, user={id:users[0]}, transportCalls=0
const hook=registerHooks({resolve(s,c,next){
 if(s==='@/lib/supabase/server')return {url:'data:text/javascript,'+encodeURIComponent('export async function createServerClient(){return {auth:{getUser:globalThis.__companyFlowAuth}}}'),shortCircuit:true}
 if(s==='@/lib/supabase/admin')return {url:'data:text/javascript,'+encodeURIComponent('export const supabaseAdmin={rpc:globalThis.__companyFlowRpc}'),shortCircuit:true}
 if(s.startsWith('@/'))return {url:new URL('../src/'+s.slice(2)+(s.endsWith('.mjs')?'':'.ts'),import.meta.url).href,shortCircuit:true}
 return next(s,c)
}})
globalThis.__companyFlowAuth=async()=>({data:{user},error:null})
globalThis.__companyFlowRpc=async(name,args)=>{
 transportCalls++
 // Transport only is replaced: real action, auth guard, role grants and SQL execute.
 assert.match(name,/^company_[a-z_]+$/)
 try{return {data:(await asRole(db,'service_role','select public.'+name+'('+Object.keys(args).map((k,i)=>k+'=> $'+(i+1)).join(',')+') value',Object.values(args))).rows[0].value,error:null}}
 catch(e){return {data:null,error:{code:e.code,message:e.message}}}
}
const mod=await import('../src/app/dashboard/control/approval-actions.ts')
const create=mod.createCompanyTaskRequest??(async()=>({status:501}))
const input=()=>({agentId:pm,description:'Prepare a synthetic internal release checklist',actionClass:'INTERNAL_CREATE',budgetCents:2,requestKey:crypto.randomUUID()})
const saved={ids:process.env.NTRP_OPERATOR_USER_IDS,flag:process.env.COMPANY_APPROVAL_RECORDING_ENABLED}
test.before(async()=>{db=await baseline();await candidate(db);await db.exec(await readFile(new URL('../supabase/candidates/company-task-approvals.sql',import.meta.url),'utf8'));const next=await readFile(new URL('../supabase/candidates/company-task-provenance.sql',import.meta.url),'utf8').catch(e=>{if(e.code==='ENOENT')return '';throw e});if(next)await db.exec(next)})
test.beforeEach(()=>{user={id:users[0]};transportCalls=0;process.env.NTRP_OPERATOR_USER_IDS=users.join(',');process.env.COMPANY_APPROVAL_RECORDING_ENABLED='true'})
test.after(async()=>{hook.deregister();delete globalThis.__companyFlowAuth;delete globalThis.__companyFlowRpc;await db?.close();for(const [k,v]of [['NTRP_OPERATOR_USER_IDS',saved.ids],['COMPANY_APPROVAL_RECORDING_ENABLED',saved.flag]]){if(v===undefined)delete process.env[k];else process.env[k]=v}})
test('verified requester creates an attested inert task, reviewed by a distinct operator',async()=>{
 const r=await create(input());assert.equal(r.status,200);assert.equal(r.request.status,'WAITING_APPROVAL')
 const id=r.request.task_id;let review=await mod.reviewCompanyTask(id)
 assert.equal(review.status,200);assert.equal(review.review.can_approve,false);assert.equal(review.review.task.destination,'internal-draft');assert.equal(review.review.task.budget_usd,0.02)
 assert.equal((await mod.recordCompanyTaskApproval({taskId:id,digest:review.review.digest,requestKey:crypto.randomUUID()})).status,409)
 user={id:users[1]};review=await mod.reviewCompanyTask(id);assert.equal(review.review.can_approve,true)
 const request={taskId:id,digest:review.review.digest,requestKey:crypto.randomUUID()};const receipt=await mod.recordCompanyTaskApproval(request)
 assert.equal(receipt.status,200);assert.equal(receipt.receipt.status,'RECORDED_NOT_EXECUTED');assert.deepEqual(await mod.recordCompanyTaskApproval(request),receipt)
 const row=(await db.query('select lifecycle_state,execution_mode,is_approved from public.agent_tasks where id=$1',[id])).rows[0]
 assert.deepEqual(row,{lifecycle_state:'WAITING_APPROVAL',execution_mode:'NONE',is_approved:false})
 assert.equal((await db.query('select count(*)::int n from neuraops_company.task_requester_attestations where task_id=$1',[id])).rows[0].n,1)
})
test('same requester/key is idempotent; changed request is a conflict',async()=>{
 const x=input(),a=await create(x),b=await create(x);assert.equal(a.status,200);assert.deepEqual(b,a)
 assert.equal((await create({...x,description:'Changed request'})).status,409)
})
test('two identities do not share an idempotency namespace',async()=>{
 const x=input(),a=await create(x);assert.equal(a.status,200);user={id:users[1]};const b=await create(x);assert.equal(b.status,200);assert.notEqual(a.request.task_id,b.request.task_id)
})
test('unauthenticated, unlisted and disabled callers never reach the privileged transport',async()=>{
 user=null;assert.equal((await create(input())).status,401)
 user={id:crypto.randomUUID(),user_metadata:{role:'founder'}};assert.equal((await create(input())).status,403)
 user={id:users[0]};delete process.env.COMPANY_APPROVAL_RECORDING_ENABLED;assert.equal((await create(input())).status,503)
 assert.equal(transportCalls,0)
})
test('caller identity, tool, destination, PHI class and spending overrides are rejected',async()=>{
 for(const extra of [{actor:'forged'},{tools:['database']},{destination:'https://outside.invalid'},{dataClass:'RESTRICTED'},{budgetCents:6},{budgetCents:.5},{description:''},{actionClass:'PRODUCTION'}])assert.equal((await create({...input(),...extra})).status,400)
 assert.equal(transportCalls,0)
})
test('unknown/inactive agent cannot create partial evidence',async()=>{
 for(const agentId of [engineering,crypto.randomUUID()])assert.equal((await create({...input(),agentId})).status,409)
 assert.equal((await db.query('select count(*)::int n from neuraops_company.task_requester_attestations a join public.agent_tasks t on t.id=a.task_id where t.agent_id=$1',[engineering])).rows[0].n,0)
})
test('public roles cannot forge the trusted creation RPC',async()=>{
 for(const role of ['anon','authenticated'])await assert.rejects(asRole(db,role,'select public.company_create_task_request($1,$2,$3,$4,$5,$6)',[pm,'Synthetic','RESEARCH',0,'a'.repeat(64),crypto.randomUUID()]),e=>e.code==='42501')
})
test('review rejects a legacy task without newly attested provenance',async()=>{
 const id=(await db.query("insert into public.agent_tasks(agent_id,task_description) values($1,'legacy') returning id",[pm])).rows[0].id
 assert.equal((await mod.reviewCompanyTask(id)).status,409)
})
test('audit failure rolls back the request, attestation and envelope together',async()=>{
 const count=async()=>JSON.stringify((await db.query('select (select count(*) from public.agent_tasks) tasks,(select count(*) from neuraops_company.task_requester_attestations) attestations,(select count(*) from neuraops_company.task_request_bindings) bindings,(select count(*) from neuraops_company.execution_envelopes) envelopes')).rows[0])
 const before=await count()
 await db.exec("create function public.synthetic_reject_event() returns trigger language plpgsql as $$ begin raise exception 'SYNTHETIC_AUDIT_FAILURE'; end $$; create trigger synthetic_reject_event before insert on neuraops_company.agent_task_events for each row execute function public.synthetic_reject_event()")
 try{assert.equal((await create(input())).status,409);assert.equal(await count(),before)}finally{await db.exec('drop trigger synthetic_reject_event on neuraops_company.agent_task_events; drop function public.synthetic_reject_event()')}
})
