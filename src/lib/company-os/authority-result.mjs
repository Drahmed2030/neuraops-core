// Server-side result validation only. Never use caller-supplied rows as authority.
// This does not bind a result to a request or replace the database gateway.
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const deny=()=>({allowed:false,reason:'INVALID_AUTHORITY_RESULT'})
export function normalizeAuthorityResult(rows) {
  if(!Array.isArray(rows)||rows.length!==1) return deny()
  const r=rows[0]
  if(!r || typeof r!=='object' || typeof r.reason!=='string' || !r.reason.trim()) return deny()
  if(r.allowed===false) return {allowed:false,reason:r.reason}
  if(r.allowed!==true || r.reason!=='ALLOWED' || r.requires_founder_approval!==false || typeof r.requires_qa!=='boolean') return deny()
  if(!['task_id','agent_id','correlation_id'].every(k=>typeof r[k]==='string'&&uuid.test(r[k]))) return deny()
  if(!Number.isInteger(r.risk_level)||r.risk_level<0||r.risk_level>3) return deny()
  if(typeof r.action_class!=='string'||!r.action_class.trim()||!['PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED'].includes(r.data_class)) return deny()
  const budget=r.budget_limit_usd
  if(budget!==null && (typeof budget!=='number'||!Number.isFinite(budget)||budget<0)) return deny()
  return {allowed:true,reason:'ALLOWED'}
}
