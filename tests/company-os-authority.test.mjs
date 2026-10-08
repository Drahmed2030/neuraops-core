import test from 'node:test'
import assert from 'node:assert/strict'
const module = await import('../src/lib/company-os/authority-result.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e})
const normalize=module.normalizeAuthorityResult ?? (()=>undefined)
const id='dce3a297-b28c-45b5-96d5-da4a8dc195aa'
const valid={allowed:true,reason:'ALLOWED',task_id:id,agent_id:id,correlation_id:id,risk_level:1,action_class:'RESEARCH',data_class:'INTERNAL',budget_limit_usd:0,requires_founder_approval:false,requires_qa:true}
for(const [name,rows] of [ ['empty',[]],['null',null],['multiple',[valid,valid]],['missing-fields',[{allowed:true,reason:'ALLOWED'}]],['string-boolean',[{...valid,allowed:'true'}]],['contradictory-reason',[{...valid,reason:'TASK_EXPIRED'}]],['approval-required',[{...valid,requires_founder_approval:true}]],['invalid-uuid',[{...valid,task_id:'founder'}]],['invalid-risk',[{...valid,risk_level:NaN}]],['invalid-budget',[{...valid,budget_limit_usd:-1}]],['forged-role',[{role:'founder',allowed:true}]] ]){
 test(`gateway normalization denies ${name}`,()=>assert.equal(normalize(rows)?.allowed,false))
}
test('normalization preserves an explicit database denial',()=>assert.deepEqual(normalize([{allowed:false,reason:'TASK_NOT_FOUND'}]),{allowed:false,reason:'TASK_NOT_FOUND'}))
test('one complete server result can retain its allow',()=>assert.deepEqual(normalize([valid]),{allowed:true,reason:'ALLOWED'}))
