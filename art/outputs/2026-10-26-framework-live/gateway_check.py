import json, sys, time
from pathlib import Path
sys.path.insert(0,str(Path.home()/'Applications/FrostNova Desktop.app/Contents/Resources/runtime'))
from mcp_gateway import api_call
job=Path(__file__).resolve().parent
if sys.argv[1]=='submit':
 (job/'phase.json').write_text(json.dumps({'phase':'task_submitted','submitted_at':time.time()}))
 result=api_call('create_task',{'objective':(job/'objective.txt').read_text(),'idempotency_key':'render-framework-live-20261026-v1','operation_id':'render-framework-live-20261026-v1','run':True})
 (job/'app-submission.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
 print(json.dumps(result,ensure_ascii=False))
elif sys.argv[1]=='list':
 result=api_call('list_tasks',{})
 print(json.dumps(result,ensure_ascii=False))
else:
 task=sys.argv[2]
 result=api_call('get_task',{'task_id':task})
 (job/'app-status.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
 print(json.dumps(result,ensure_ascii=False))
