from pathlib import Path
import csv
import json
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

job=Path(__file__).resolve().parent
samples=[json.loads(line) for line in (job/'ram-samples.jsonl').read_text().splitlines()]
phase=json.loads((job/'phase.json').read_text())
submitted=phase['submitted_at']
samples=[sample for sample in samples if sample['time']>=submitted-20]
gib=1024**3
roles=['frostnova_ui','frostnova_runtime','ollama','comfy_qwen21']
rows=[]
for sample in samples:
 row={'seconds':sample['time']-submitted,'phase':sample['phase'],'available_GiB':sample['available_bytes']/gib,'swap_GiB':sample['swap_used_bytes']/gib,'pressure_level':sample['pressure_level'],'compressed_GiB':sample['vm_pages'].get('Pages occupied by compressor',0)*sample['page_size']/gib}
 for role in roles:
  for key in ['rss_bytes','physical_footprint_bytes']:
   row[role+'_'+key.removesuffix('_bytes')+'_GiB']=sum(process.get(key) or 0 for process in sample['processes'] if process['role']==role)/gib
 row['loaded_models']=';'.join(model['name'] for model in sample.get('ollama_models',[]))
 rows.append(row)
with (job/'ram-timeline.csv').open('w') as stream:
 writer=csv.DictWriter(stream,fieldnames=rows[0].keys());writer.writeheader();writer.writerows(rows)
comfy=[sample for sample in samples if any(p['role']=='comfy_qwen21' for p in sample['processes'])]
co_resident=[sample for sample in comfy if sample.get('ollama_models')]
summary={'claim':'One observed installed-app foreground render; no controlled before/after performance or savings claim.','sample_interval_seconds':5,'samples_in_task_window':len(samples),'first_sample':rows[0],'last_sample':rows[-1],'minimum_available_GiB':min(row['available_GiB'] for row in rows),'peak_swap_GiB':max(row['swap_GiB'] for row in rows),'peak_compressed_GiB':max(row['compressed_GiB'] for row in rows),'pressure_levels':sorted(set(row['pressure_level'] for row in rows)),'comfy_samples':len(comfy),'comfy_samples_with_resident_ollama_models':len(co_resident),'process_peak_physical_footprint_GiB':{role:max(row[role+'_physical_footprint_GiB'] for row in rows) for role in roles},'caveat':'Independent process peaks are not additive. Five-second sampling can miss shorter transitions; app receipt records admission and cleanup. Unified CPU/MPS memory is one pool.'}
(job/'ram-summary.json').write_text(json.dumps(summary,indent=2))
fig,axes=plt.subplots(2,1,figsize=(11,7),sharex=True)
for role in roles:
 axes[0].plot([r['seconds'] for r in rows],[r[role+'_physical_footprint_GiB'] for r in rows],label=role)
axes[0].set_ylabel('Physical footprint (GiB)');axes[0].legend();axes[0].grid(alpha=.25)
for name in ['available_GiB','swap_GiB','compressed_GiB']:
 axes[1].plot([r['seconds'] for r in rows],[r[name] for r in rows],label=name)
axes[1].set_xlabel('Seconds since task submission');axes[1].set_ylabel('System memory (GiB)');axes[1].legend();axes[1].grid(alpha=.25)
fig.suptitle('FrostNova foreground Qwen 2.1 render — one observed run')
fig.tight_layout();fig.savefig(job/'ram-profile.png',dpi=160);fig.savefig(job/'ram-profile.pdf')
print(json.dumps({k:v for k,v in summary.items() if k not in ['first_sample','last_sample']},indent=2))
