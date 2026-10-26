import json
import sqlite3
import sys
from pathlib import Path
job=Path(__file__).resolve().parent
sys.path.insert(0,str(Path.home()/'Applications/FrostNova Desktop.app/Contents/Resources/runtime'))
from mcp_gateway import api_call
submission=json.loads((job/'app-submission.json').read_text())
task=submission['task_id']
status=api_call('get_task',{'task_id':task})
(job/'app-status.json').write_text(json.dumps(status,ensure_ascii=False,indent=2))
print(json.dumps({k:v for k,v in status.items() if k not in ['objective','messages','contract']},ensure_ascii=False))
db=sqlite3.connect('file:'+str(Path.home()/'.frostnova/desktop/tasks.sqlite3')+'?mode=ro',uri=True)
rows=db.execute('SELECT payload FROM transactions WHERE task=? ORDER BY updated DESC',(task,)).fetchall()
for row in rows:
 transaction=json.loads(row[0])
 if transaction.get('tool_name')=='render_image' and transaction.get('render'):
  record=transaction['render']
  (job/'render-record-observed.json').write_text(json.dumps(record,ensure_ascii=False,indent=2))
  phase=json.loads((job/'phase.json').read_text());phase['phase']=record['phase'];(job/'phase.json').write_text(json.dumps(phase))
  print(json.dumps({k:record.get(k) for k in ['operation_id','phase','handoff','pid','prompt_id','result']},ensure_ascii=False))
  logfile=Path(record['job_directory'])/'backend.log'
  if logfile.exists():print(logfile.read_text(errors='replace')[-1000:])
  break
else:print('No render operation persisted yet')
db.close()
