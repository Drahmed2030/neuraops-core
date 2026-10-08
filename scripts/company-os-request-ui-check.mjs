#!/usr/bin/env node
// Real React/DOM regression with synthetic action transport; no browser or live account.
import {createRequire} from 'node:module'
import {mkdtemp,readFile,writeFile,rm,mkdir} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import assert from 'node:assert/strict'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const require=createRequire(resolve(root,'package.json'))
const ts=require('typescript'),{webpack}=require('next/dist/compiled/webpack/webpack')
const verifierRequire=createRequire(resolve(root,'tools/company-os-verification/package.json'))
const {JSDOM}=verifierRequire('jsdom')
const out=resolve(process.argv[2]);await mkdir(out)
const temp=await mkdtemp(resolve(tmpdir(),'company-ui-'));let dom
try {
 const source=await readFile(resolve(root,'src/app/dashboard/control/requests/RequestWorkspace.tsx'),'utf8')
 await writeFile(resolve(temp,'component.js'),ts.transpileModule(source.replace("'../approval-actions'","'./actions.js'"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText)
 await writeFile(resolve(temp,'actions.js'),`export async function createCompanyTaskRequest(x){window.calls.push(x);if(window.calls.length===1)throw Error('lost response');return {status:200,request:{task_id:'123e4567-e89b-42d3-a456-426614174001'}}} export async function reviewCompanyTask(){return {status:409}} export async function recordCompanyTaskApproval(){return {status:409}}`)
 await writeFile(resolve(temp,'entry.js'),`import React from 'react';import{createRoot}from'react-dom/client';import Component from'./component.js';window.calls=[];createRoot(document.getElementById('root')).render(React.createElement(Component));`)
 await new Promise((ok,no)=>webpack({mode:'development',entry:resolve(temp,'entry.js'),devtool:false,output:{path:temp,filename:'bundle.js'},resolve:{modules:[resolve(root,'node_modules')]},optimization:{minimize:false}},(err,stats)=>{if(err||stats.hasErrors())no(err||Error(stats.toString({all:false,errors:true})));else ok()}))
 dom=new JSDOM('<div id="root"></div>',{url:'http://localhost',runScripts:'dangerously',pretendToBeVisual:true})
 dom.window.eval(await readFile(resolve(temp,'bundle.js'),'utf8'))
 const wait=async(fn)=>{for(let i=0;i<150;i++){if(fn())return;await new Promise(r=>setTimeout(r,20))}throw Error('DOM state timeout')}
 const doc=dom.window.document
 await wait(()=>doc.querySelector('textarea'))
 const textarea=doc.querySelector('textarea')
 Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype,'value').set.call(textarea,'Synthetic internal release checklist')
 textarea.dispatchEvent(new dom.window.Event('input',{bubbles:true}))
 doc.querySelector('button[type=submit]').click()
 await wait(()=>doc.querySelector('[role=status]').textContent.includes('Connection interrupted'))
 assert.equal(textarea.value,'Synthetic internal release checklist','Lost response must preserve original request fields')
 doc.querySelector('button[type=submit]').click()
 await wait(()=>doc.querySelector('[role=status]').textContent.includes('Request recorded'))
 const calls=JSON.parse(JSON.stringify(dom.window.calls))
 assert.equal(calls.length,2);assert.deepEqual(calls[0],calls[1],'Unchanged retry must preserve exact payload and idempotency key')
 await writeFile(resolve(out,'result.json'),JSON.stringify({status:'PASS',tests:1,react:require('react/package.json').version,jsdom:verifierRequire('jsdom/package.json').version,scope:'Real React client component in JSDOM; synthetic lost-response action transport; no browser visual/layout or live auth certification',calls_match:true},null,2)+'\n')
 console.log('PASS: real React form retains payload and request key after lost response')
} finally {dom?.window.close();await rm(temp,{recursive:true,force:true})}
