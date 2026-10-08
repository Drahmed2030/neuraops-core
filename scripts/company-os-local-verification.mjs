#!/usr/bin/env node
// Explicit embedded PostgreSQL verification. No credentials, network or installs.
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const args=process.argv.slice(2)
const options={}
for(let i=0;i<args.length;i+=2){
 if(!['--suite','--evidence'].includes(args[i])||!args[i+1]||options[args[i]]) throw new Error('Use --suite all|baseline|assignments|authority|approvals --evidence NEW_DIRECTORY')
 options[args[i]]=args[i+1]
}
const suites={baseline:['tests/company-os-baseline.pgtest.mjs'],assignments:['tests/company-os-assignments.pgtest.mjs'],authority:['tests/company-os-authority.test.mjs','tests/company-os-gateway.pgtest.mjs'],approvals:['tests/company-os-delegation-budget.pgtest.mjs','tests/company-os-approvals.pgtest.mjs','tests/company-os-approval-actions.test.mjs','tests/company-os-request-flow.pgtest.mjs']}
const suite=options['--suite']??'all'
if(!options['--evidence'] || !(suite==='all'||suites[suite])) throw new Error('Invalid verification arguments')
const out=resolve(options['--evidence'])
mkdirSync(out) // existing evidence is never overwritten
const started=new Date().toISOString()
const files=suite==='all'?Object.values(suites).flat():suites[suite]
const child=spawnSync(process.execPath,['--test','--test-reporter=tap',...files],{cwd:root,encoding:'utf8',timeout:120000,env:{PATH:process.env.PATH,LANG:'C.UTF-8'},maxBuffer:8*1024*1024})
const log=(child.stdout??'')+(child.stderr??'')
writeFileSync(resolve(out,'verification.tap'),log)
const hash=p=>createHash('sha256').update(readFileSync(resolve(root,p))).digest('hex')
const count=k=>Number(log.match(new RegExp('^# '+k+' (\\d+)$','m'))?.[1]??NaN)
const pass=child.status===0 && count('tests')>0 && count('fail')===0 && count('skipped')===0 && count('cancelled')===0
const tracked=['scripts/company-os-local-verification.mjs','supabase/candidates/company-agent-authority.sql','supabase/candidates/company-task-approvals.sql','supabase/candidates/company-task-provenance.sql','src/app/dashboard/control/requests/page.tsx','src/app/dashboard/control/requests/RequestWorkspace.tsx','src/app/dashboard/control/approval-actions.ts','src/lib/auth/require-operations-access.ts','src/lib/company-os/authority-result.mjs','tools/company-os-verification/package-lock.json',...files,'tests/helpers/company-os-db.mjs','tests/fixtures/company-os/baseline.sql',...readdirSync(resolve(root,'tests/fixtures/company-os/source')).sort().map(x=>'tests/fixtures/company-os/source/'+x)]
const receipt={status:pass?'LOCAL_EMBEDDED_PASS':'FAIL',engine:'PGlite 0.5.8 (embedded PostgreSQL; single connection)',suite,started_utc:started,finished_utc:new Date().toISOString(),node:process.version,tests:count('tests'),passed:count('pass'),failed:count('fail'),exit:child.status,error:child.error?.message??null,source_head:spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).stdout.trim(),working_tree_changes:spawnSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).stdout.trim().split('\n').filter(Boolean),digests:Object.fromEntries(tracked.map(p=>[p,hash(p)])),log_sha256:createHash('sha256').update(log).digest('hex'),native_concurrency:'NOT_TESTED_BY_THIS_RUNNER',hosted_application:'NOT_PERFORMED',approval_activation:'DISABLED',limitations:['Catalog-derived public fixture omits unrelated company-project columns and platform services.','This runner does not certify native concurrency, live authentication, task provenance issuance or delegated execution.','Tests use actual inherited anon/authenticated/service_role SQL role contracts; no worker role is claimed.']}
writeFileSync(resolve(out,'receipt.json'),JSON.stringify(receipt,null,2)+'\n')
console.log(JSON.stringify({status:receipt.status,tests:receipt.tests,passed:receipt.passed,failed:receipt.failed,evidence:out}))
process.exitCode=pass?0:1
