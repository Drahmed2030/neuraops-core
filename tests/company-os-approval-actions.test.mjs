import test from 'node:test'
import assert from 'node:assert/strict'
import {registerHooks} from 'node:module'
import {createHash} from 'node:crypto'
const uid='123e4567-e89b-42d3-a456-426614174000',task='123e4567-e89b-42d3-a456-426614174001'
let fixture={user:{id:uid},calls:[],error:null}
const globalKey='__companyApprovalFixture'
globalThis[globalKey]=fixture
const hook=registerHooks({resolve(specifier,context,next){
 let code
 if(specifier==='@/lib/supabase/server')code=`export async function createServerClient(){return {auth:{async getUser(){let f=globalThis.${globalKey};return {data:{user:f.user},error:f.error}}}}}`
 if(specifier==='@/lib/supabase/admin')code=`export const supabaseAdmin={async rpc(name,args){globalThis.${globalKey}.calls.push({name,args});return {data:{status:'RECORDED_NOT_EXECUTED'},error:null}}}`
 if(code)return {url:'data:text/javascript,'+encodeURIComponent(code),shortCircuit:true}
 if(specifier.startsWith('@/'))return {url:new URL('../src/'+specifier.slice(2)+(specifier.endsWith('.mjs')?'':'.ts'),import.meta.url).href,shortCircuit:true}
 return next(specifier,context)
}})
const mod=await import('../src/app/dashboard/control/approval-actions.ts').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e})
const approve=mod.recordCompanyTaskApproval??(async()=>undefined)
const prior={ids:process.env.NTRP_OPERATOR_USER_IDS,enabled:process.env.COMPANY_APPROVAL_RECORDING_ENABLED}
test.beforeEach(()=>{fixture.user={id:uid};fixture.error=null;fixture.calls=[];process.env.NTRP_OPERATOR_USER_IDS=uid;process.env.COMPANY_APPROVAL_RECORDING_ENABLED='true'})
test.after(()=>{hook.deregister();delete globalThis[globalKey];for(const [k,v]of [['NTRP_OPERATOR_USER_IDS',prior.ids],['COMPANY_APPROVAL_RECORDING_ENABLED',prior.enabled]]){if(v===undefined)delete process.env[k];else process.env[k]=v}})
const input=()=>({taskId:task,digest:'a'.repeat(64),requestKey:crypto.randomUUID()})
test('unauthenticated request cannot reach privileged approval RPC',async()=>{fixture.user=null;assert.equal((await approve(input()))?.status,401);assert.equal(fixture.calls.length,0)})
test('user metadata founder claim is not operator access',async()=>{fixture.user={id:task,user_metadata:{role:'founder'}};assert.equal((await approve(input()))?.status,403);assert.equal(fixture.calls.length,0)})
test('disabled recording remains unavailable even to verified operator',async()=>{delete process.env.COMPANY_APPROVAL_RECORDING_ENABLED;assert.equal((await approve(input()))?.status,503);assert.equal(fixture.calls.length,0)})
test('verified operator supplies actor from server authentication, not input',async()=>{
 const r=await approve(input());assert.equal(r?.status,200)
 assert.equal(fixture.calls[0].args.p_actor_reference,createHash('sha256').update(uid).digest('hex'))
 assert.equal(fixture.calls[0].name,'company_record_task_approval')
})
test('caller-supplied actor or budget fields are rejected',async()=>{
 assert.equal((await approve({...input(),actor:'forged',budget:100}))?.status,400);assert.equal(fixture.calls.length,0)
})
test('malformed digest is rejected before database access',async()=>{assert.equal((await approve({...input(),digest:'stale'}))?.status,400);assert.equal(fixture.calls.length,0)})
