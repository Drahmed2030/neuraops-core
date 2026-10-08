#!/usr/bin/env python3
"""Disposable native PostgreSQL verification; takes no host, URL or credentials."""
import argparse, hashlib, json, os, pathlib, select, shutil, subprocess, tempfile, time
from datetime import datetime, timezone
ROOT=pathlib.Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--pg-bin',required=True);p.add_argument('--evidence',required=True)
a=p.parse_args();binpath=pathlib.Path(a.pg_bin).resolve();out=pathlib.Path(a.evidence).resolve();out.mkdir()
if os.geteuid()==0: raise SystemExit('Run as an ordinary OS user, never root')
for cmd in ['initdb','pg_ctl','psql']:
 if not (binpath/cmd).is_file():raise SystemExit('Missing '+cmd)
work=pathlib.Path(tempfile.mkdtemp(prefix='company-os-native-'));sock=work/'socket';sock.mkdir(mode=0o700)
env={'PATH':str(binpath)+':/usr/bin:/bin','LANG':'C.UTF-8','LC_ALL':'C.UTF-8','PGHOST':str(sock),'PGPORT':'55439','PGUSER':'postgres','PGDATABASE':'postgres'}
log=open(out/'native.log','w');results=[];started=False;children=[]
receipt={'started_utc':datetime.now(timezone.utc).isoformat(),'status':'FAIL','checks':results,'native':True,'synthetic_only':True,'hosted_access':False,'cleanup':False}
def run(cmd,**kw):
 r=subprocess.run(cmd,env=env,text=True,capture_output=True,timeout=30,**kw)
 log.write(r.stdout+r.stderr);log.flush()
 if r.returncode:raise RuntimeError(f'command exit {r.returncode}: '+r.stderr[-1800:])
 return r.stdout.strip()
def sql(q):return run([str(binpath/'psql'),'-X','-qAt','-v','ON_ERROR_STOP=1','-c',q])
def rows(q):return json.loads(sql("select coalesce(json_agg(q),'[]'::json) from ("+q+") q"))
def file(path):return run([str(binpath/'psql'),'-X','-q','-v','ON_ERROR_STOP=1','-f',str(path)])
def check(name,fn):
 fn();results.append({'test':name,'status':'PASS'});log.write('PASS '+name+'\n');log.flush()
def eq(actual,expected):
 if actual!=expected:raise AssertionError((actual,expected))
def denied(q,code=None):
 r=subprocess.run([str(binpath/'psql'),'-X','-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-c',q],env=env,text=True,capture_output=True,timeout=10)
 log.write(r.stderr);log.flush()
 assert r.returncode!=0, 'unexpected successful SQL'
 if code:assert code in r.stderr,(code,r.stderr)
def race(key,rollback=False):
 # A and B have separate native backend sessions. B must block behind A's row lock.
 agent='dce3a297-b28c-45b5-96d5-da4a8dc195aa'
 insert=f"insert into neuraops_company.agent_function_assignments(agent_id,function_key,assignment_kind,assignment_version) values('{agent}','{key}','BUSINESS',1);"
 ae=dict(env,PGAPPNAME='company_race_a');be=dict(env,PGAPPNAME='company_race_b')
 A=subprocess.Popen([str(binpath/'psql'),'-X','-qAt','-v','ON_ERROR_STOP=1'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,env=ae,bufsize=1);children.append(A)
 A.stdin.write("begin; set local statement_timeout='8s'; "+insert+"select 'A_HELD';\n");A.stdin.flush()
 ready=select.select([A.stdout],[],[],8)[0];assert ready,'A did not acquire row lock'
 assert A.stdout.readline().strip()=='A_HELD'
 B=subprocess.Popen([str(binpath/'psql'),'-X','-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-c',"set statement_timeout='8s'; "+insert],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,env=be);children.append(B)
 blocked=False
 for _ in range(50):
  blocked=sql("select exists(select 1 from pg_stat_activity where application_name='company_race_b' and wait_event_type='Lock' and cardinality(pg_blocking_pids(pid))>0)")=='t'
  if blocked:break
  time.sleep(.05)
 assert blocked,'B never demonstrated lock contention'
 A.stdin.write(('rollback;' if rollback else 'commit;')+'\n\\q\n');A.stdin.flush()
 ao,ae=A.communicate(timeout=10);bo,be=B.communicate(timeout=10)
 log.write(ao+ae+bo+be)
 assert A.returncode==0,(A.returncode,ae)
 if rollback:assert B.returncode==0,be
 else:assert B.returncode!=0 and '23505' in be,(B.returncode,be)
 eq(sql(f"select count(*) from neuraops_company.agent_function_assignments where agent_id='{agent}' and function_key='{key}'"),'1')
 receipt.setdefault('races',[]).append({'function':key,'independent_sessions':True,'blocking_observed':True,'a':'ROLLBACK' if rollback else 'COMMIT','b':'COMMITTED' if rollback else '23505_CONFLICT'})
def approval_task():
 tid=sql("insert into public.agent_tasks(agent_id,task_description,lifecycle_state,risk_level,action_class,data_class,budget_limit_usd,expires_at,requested_by_reference) values('dce3a297-b28c-45b5-96d5-da4a8dc195aa','synthetic budget','WAITING_APPROVAL',1,'INTERNAL_CREATE','PUBLIC',0.05,now()+interval '1 hour',repeat('b',64)) returning id")
 sql("insert into neuraops_company.task_requester_attestations(task_id,principal_reference,verified_origin) values('"+tid+"',repeat('b',64),'SERVER_VERIFIED_HUMAN')")
 return tid
def budget_race():
 import uuid
 ids=[approval_task(),approval_task()]
 digests=[sql("select public.company_task_approval_snapshot('"+i+"')->>'digest'") for i in ids]
 day=sql("select (statement_timestamp() at time zone 'UTC')::date")
 sql("insert into neuraops_company.approval_budget_days(budget_day,reserved_usd) values('"+day+"',0.95) on conflict(budget_day) do update set reserved_usd=0.95")
 calls=["select public.company_record_task_approval('%s','%s','%s','%s');"%(i,d,'a'*64,uuid.uuid4()) for i,d in zip(ids,digests)]
 A=subprocess.Popen([str(binpath/'psql'),'-X','-qAt','-v','ON_ERROR_STOP=1'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,env=dict(env,PGAPPNAME='company_budget_a'),bufsize=1);children.append(A)
 # Suppress receipt output; synchronization line follows successful reservation.
 A.stdin.write("begin; set local statement_timeout='8s'; set local role service_role;\n\\o /dev/null\n"+calls[0]+"\n\\o\nselect 'BUDGET_HELD';\n");A.stdin.flush()
 assert select.select([A.stdout],[],[],8)[0],'budget A not ready'
 assert A.stdout.readline().strip()=='BUDGET_HELD'
 B=subprocess.Popen([str(binpath/'psql'),'-X','-qAt','-v','ON_ERROR_STOP=1','-c',"set statement_timeout='8s'; set role service_role; "+calls[1]],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,env=dict(env,PGAPPNAME='company_budget_b'));children.append(B)
 blocked=False
 for _ in range(50):
  blocked=sql("select exists(select 1 from pg_stat_activity where application_name='company_budget_b' and wait_event_type='Lock' and cardinality(pg_blocking_pids(pid))>0)")=='t'
  if blocked:break
  time.sleep(.05)
 assert blocked,'budget B did not demonstrate contention'
 A.stdin.write('commit;\n\\q\n');A.stdin.flush();ao,ae=A.communicate(timeout=10);bo,be=B.communicate(timeout=10);log.write(ao+ae+bo+be)
 assert A.returncode==0,ae
 assert B.returncode!=0 and 'BUDGET_LIMIT' in be,(B.returncode,be)
 eq(sql("select reserved_usd::text from neuraops_company.approval_budget_days where budget_day='"+day+"'"),'1.0000')
 eq(sql("select count(*) from neuraops_company.task_approval_bindings where task_id='"+ids[1]+"'"),'0')
 receipt['budget_race']={'independent_sessions':True,'blocking_observed':True,'successful_reservations':1,'rejected':'BUDGET_LIMIT','daily_reserved_usd':'1.0000','losing_task_partial_approval':False}

def expiry_race():
 import uuid
 tid=approval_task()
 day=sql("select (clock_timestamp() at time zone 'UTC')::date")
 sql("update neuraops_company.approval_budget_days set reserved_usd=0 where budget_day='"+day+"'")
 sql("update public.agent_tasks set expires_at=clock_timestamp()+interval '2 seconds' where id='"+tid+"'")
 digest=sql("select public.company_task_approval_snapshot('"+tid+"')->>'digest'")
 A=subprocess.Popen([str(binpath/'psql'),'-X','-qAt','-v','ON_ERROR_STOP=1'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,env=env,bufsize=1);children.append(A)
 A.stdin.write("begin; update neuraops_company.approval_budget_days set reserved_usd=0 where budget_day='"+day+"'; select 'EXPIRY_HELD';\n");A.stdin.flush()
 assert select.select([A.stdout],[],[],8)[0]
 assert A.stdout.readline().strip()=='EXPIRY_HELD'
 call="set statement_timeout='8s'; set role service_role; select public.company_record_task_approval('%s','%s','%s','%s');"%(tid,digest,'a'*64,uuid.uuid4())
 B=subprocess.Popen([str(binpath/'psql'),'-X','-qAt','-v','ON_ERROR_STOP=1','-c',call],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,env=dict(env,PGAPPNAME='company_expiry_b'));children.append(B)
 blocked=False
 for _ in range(50):
  blocked=sql("select exists(select 1 from pg_stat_activity where application_name='company_expiry_b' and wait_event_type='Lock' and cardinality(pg_blocking_pids(pid))>0)")=='t'
  if blocked:break
  time.sleep(.02)
 assert blocked,'expiry B never blocked'
 for _ in range(100):
  expired=sql("select clock_timestamp()>expires_at from public.agent_tasks where id='"+tid+"'")=='t'
  if expired:break
  time.sleep(.03)
 assert expired
 A.stdin.write('commit;\n\\q\n');A.stdin.flush()
 ao,ae=A.communicate(timeout=10);bo,be=B.communicate(timeout=10);log.write(ao+ae+bo+be)
 assert A.returncode==0,ae
 assert B.returncode!=0 and 'TASK_NOT_APPROVABLE' in be,be
 eq(sql("select count(*) from neuraops_company.task_approval_bindings where task_id='"+tid+"'"),'0')
 eq(sql("select reserved_usd::text from neuraops_company.approval_budget_days where budget_day='"+day+"'"),'0.0000')
 receipt['expiry_race']={'blocking_observed':True,'expired_while_waiting':True,'denied':True,'partial_reservation':False}


def request_race():
 import uuid
 key=str(uuid.uuid4());actor='c'*64
 call="select public.company_create_task_request('dce3a297-b28c-45b5-96d5-da4a8dc195aa','Synthetic native request','RESEARCH',0,'%s','%s');"%(actor,key)
 A=subprocess.Popen([str(binpath/'psql'),'-X','-qAt','-v','ON_ERROR_STOP=1'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,env=env,bufsize=1);children.append(A)
 A.stdin.write("begin; set local role service_role;\n\\o /dev/null\n"+call+"\n\\o\nselect 'REQUEST_HELD';\n");A.stdin.flush()
 assert select.select([A.stdout],[],[],8)[0]
 assert A.stdout.readline().strip()=='REQUEST_HELD'
 B=subprocess.Popen([str(binpath/'psql'),'-X','-qAt','-v','ON_ERROR_STOP=1','-c',"set statement_timeout='8s'; set role service_role; "+call],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,env=dict(env,PGAPPNAME='company_request_b'));children.append(B)
 blocked=False
 for _ in range(50):
  blocked=sql("select exists(select 1 from pg_stat_activity where application_name='company_request_b' and wait_event_type='Lock' and cardinality(pg_blocking_pids(pid))>0)")=='t'
  if blocked:break
  time.sleep(.02)
 assert blocked,'request replay did not contend'
 A.stdin.write('commit;\n\\q\n');A.stdin.flush();ao,ae=A.communicate(timeout=10);bo,be=B.communicate(timeout=10);log.write(ao+ae+bo+be)
 assert A.returncode==0 and B.returncode==0,(ae,be)
 tid=json.loads(bo.strip())['task_id']
 eq(sql("select count(*) from neuraops_company.task_request_bindings where requester_reference='%s' and request_key='%s'"%(actor,key)),'1')
 eq(sql("select count(*) from neuraops_company.agent_task_events where task_id='%s' and event_type='VERIFIED_HUMAN_REQUEST_RECORDED'"%tid),'1')
 denied("set role service_role; "+call.replace('Synthetic native request','Altered request'),'REQUEST_CONFLICT')
 digest=sql("set role service_role; select public.company_task_review_details('%s','%s')->>'digest'"%(tid,'d'*64))
 denied("set role service_role; select public.company_record_task_approval('%s','%s','%s','%s')"%(tid,digest,actor,uuid.uuid4()),'SELF_APPROVAL')
 result=json.loads(sql("set role service_role; select public.company_record_task_approval('%s','%s','%s','%s')"%(tid,digest,'d'*64,uuid.uuid4())))
 eq(result['status'],'RECORDED_NOT_EXECUTED')
 eq(sql("select lifecycle_state||':'||execution_mode from public.agent_tasks where id='%s'"%tid),'WAITING_APPROVAL:NONE')
 receipt['request_race']={'blocking_observed':True,'single_task_and_event':True,'changed_replay_denied':True,'self_approval_denied':True,'distinct_synthetic_operator_recorded':True,'executed':False}


try:
 run([str(binpath/'initdb'),'-D',str(work/'data'),'-U','postgres','--auth-local=trust','--auth-host=reject','--no-locale','--encoding=UTF8'])
 run([str(binpath/'pg_ctl'),'-D',str(work/'data'),'-l',str(work/'server.log'),'-o',f"-k {sock} -p 55439 -c listen_addresses=''",'-w','start']);started=True
 receipt['server_version']=sql('show server_version');receipt['os']=run(['uname','-srm'])
 paths=[ROOT/'tests/fixtures/company-os/baseline.sql',*sorted((ROOT/'tests/fixtures/company-os/source').glob('*.sql'))]
 candidate=ROOT/'supabase/candidates/company-agent-authority.sql'
 approvals=ROOT/'supabase/candidates/company-task-approvals.sql'
 provenance=ROOT/'supabase/candidates/company-task-provenance.sql'
 receipt['sha256']={str(x.relative_to(ROOT)):hashlib.sha256(x.read_bytes()).hexdigest() for x in paths+[candidate,approvals,provenance,pathlib.Path(__file__).resolve()]}
 for f in paths:file(f)
 before=rows('select * from public.system_agents order by id');profiles=rows('select * from neuraops_company.agent_authority_profiles order by agent_id')
 file(candidate)
 check('six original identities preserved',lambda:eq(rows("select * from public.system_agents where id<>'f44919ab-3f1a-430e-90f9-c569d8c1bb01' order by id"),before))
 check('six original policies preserved',lambda:eq(rows("select * from neuraops_company.agent_authority_profiles where agent_id<>'f44919ab-3f1a-430e-90f9-c569d8c1bb01' order by agent_id"),profiles))
 snapshot=rows('select * from neuraops_company.agent_function_assignments order by agent_id');file(candidate)
 check('seed replay changes nothing',lambda:eq(rows('select * from neuraops_company.agent_function_assignments order by agent_id'),snapshot))
 check('engineering inactive',lambda:eq(sql("select active::text||':'||cardinality(allowed_action_classes) from neuraops_company.agent_authority_profiles where agent_id='f44919ab-3f1a-430e-90f9-c569d8c1bb01'"),'false:0'))
 check('proposal cannot activate',lambda:denied("update neuraops_company.agent_function_assignments set state='ACTIVE'"))
 for role in ['anon','authenticated','service_role']:
  for table in ['agent_function_assignments','agent_authority_profile_versions','task_approvals','operating_controls']:
   check(role+' cannot write '+table,lambda r=role,t=table:denied('set role '+r+'; delete from neuraops_company.'+t,'42501'))
 check('history is immutable',lambda:denied('delete from neuraops_company.agent_authority_profile_versions'))
 check('policy cannot silently widen',lambda:denied("update neuraops_company.agent_authority_profiles set allowed_action_classes=array['PRODUCTION']"))
 taskid=sql("insert into public.agent_tasks(agent_id,task_description,lifecycle_state,risk_level,action_class,data_class,execution_mode) values('dce3a297-b28c-45b5-96d5-da4a8dc195aa','synthetic native','READY',0,'RESEARCH','PUBLIC','INTERNAL') returning id")
 check('service gateway denies unactivated work',lambda:eq(sql("set role service_role; select allowed::text||':'||reason from public.company_execution_gateway_preflight('"+taskid+"')"),'false:ASSIGNMENT_ACTIVATION_DISABLED'))
 check('concurrent commit rejects conflicting version',lambda:race('RESEARCH'))
 check('concurrent rollback releases reservation',lambda:race('GROWTH',True))
 file(approvals)
 check('concurrent budget reservation cannot exceed daily cap',budget_race)
 check('expiration while blocked rolls back approval and budget',expiry_race)
 check('UTC midnight rollover rejected',lambda:denied("select neuraops_company.approval_expiry_at('2026-10-09T00:00:01Z','2026-10-09T01:00:00Z','2026-10-08')",'BUDGET_DAY_CHANGED'))
 file(provenance)
 check('concurrent human request replay preserves one task and requires independent approval',request_race)
 check('all three operating controls disabled',lambda:eq(sql('select count(*) from neuraops_company.operating_controls where enabled'),'0'))
 receipt['status']='NATIVE_RECORDING_PASS_ACTIVATION_OPEN'
except Exception as e:
 receipt['error']=str(e);log.write('FAIL '+str(e)+'\n')
finally:
 for c in children:
  if c.poll() is None:c.kill();c.wait(timeout=5)
 try:
  if started:run([str(binpath/'pg_ctl'),'-D',str(work/'data'),'-m','fast','-w','stop'])
  shutil.rmtree(work);receipt['cleanup']=True
 except Exception as e:receipt['cleanup_error']=str(e);receipt['status']='FAIL'
 receipt['finished_utc']=datetime.now(timezone.utc).isoformat();log.close()
 receipt['log_sha256']=hashlib.sha256((out/'native.log').read_bytes()).hexdigest()
 (out/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
 print(json.dumps(receipt))
raise SystemExit(0 if receipt['status']=='NATIVE_RECORDING_PASS_ACTIVATION_OPEN' else 1)
