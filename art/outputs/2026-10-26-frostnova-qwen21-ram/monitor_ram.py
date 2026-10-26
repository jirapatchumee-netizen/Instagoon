from pathlib import Path
import ctypes
import datetime
import json
import re
import subprocess
import time
import urllib.request
import psutil

JOB = Path(__file__).resolve().parent


class Usage(ctypes.Structure):
    _fields_ = [('uuid', ctypes.c_ubyte * 16)] + [(name, ctypes.c_uint64) for name in ['user_time', 'system_time', 'pkg_idle_wkups', 'interrupt_wkups', 'pageins', 'wired_size', 'resident_size', 'phys_footprint', 'proc_start_abstime', 'proc_exit_abstime']]


lib = ctypes.CDLL('/usr/lib/libproc.dylib')
lib.proc_pid_rusage.argtypes = [ctypes.c_int, ctypes.c_int, ctypes.c_void_p]
lib.proc_pid_rusage.restype = ctypes.c_int


def system_value(command):
    return subprocess.check_output(command, text=True, stderr=subprocess.DEVNULL).strip()


def sample():
    memory = psutil.virtual_memory()
    vm = system_value(['vm_stat'])
    page_size = int(re.search(r'page size of (\d+) bytes', vm).group(1))
    pages = {m.group(1): int(m.group(2)) for m in re.finditer(r'^([^:\n]+):\s+(\d+)\.', vm, re.MULTILINE)}
    record = {'time': time.time(), 'utc': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'total_bytes': memory.total, 'available_bytes': memory.available, 'swap_used_bytes': psutil.swap_memory().used, 'pressure_level': int(system_value(['sysctl', '-n', 'kern.memorystatus_vm_pressure_level'])), 'vm_pages': pages, 'page_size': page_size, 'processes': []}
    phase_file = JOB / 'phase.json'
    record['phase'] = json.loads(phase_file.read_text())['phase'] if phase_file.exists() else 'before_frostnova_task'
    log = JOB / 'server.log'
    if record['phase'] == 'render_requested' and log.exists():
        text = log.read_text(errors='replace')
        if re.search(r'100%\|', text): record['phase'] = 'vae_decode'
        elif re.search(r'\d+%\|', text): record['phase'] = 'sampling'
        elif 'Requested to load QwenImage21\n' in text: record['phase'] = 'loading_diffusion_model'
        else: record['phase'] = 'loading_or_encoding_text'
    for process in psutil.process_iter(['pid', 'ppid', 'name', 'cmdline', 'memory_info']):
        try:
            info = process.info
            if info['name'] in ['zsh', 'bash', 'sh']: continue
            args = ' '.join(info['cmdline'] or [])
            role = None
            if 'FrostNova Desktop.app/Contents/MacOS/' in args: role = 'frostnova_ui'
            elif 'FrostNova Desktop.app/Contents/Resources/runtime/' in args: role = 'frostnova_runtime'
            elif 'comfy-qwen21-validation/main.py' in args: role = 'comfy_qwen21'
            elif process.name().lower().startswith('ollama') or 'ollama runner' in args: role = 'ollama'
            elif 'mlx_lm.server' in args: role = 'mlx_server'
            elif 'run_pipeline.py' in args and str(JOB) in args: role = 'render_runner'
            if role:
                usage = Usage()
                ok = lib.proc_pid_rusage(info['pid'], 0, ctypes.byref(usage)) == 0
                record['processes'].append({'pid': info['pid'], 'ppid': info['ppid'], 'role': role, 'rss_bytes': info['memory_info'].rss, 'physical_footprint_bytes': usage.phys_footprint if ok else None})
        except (psutil.NoSuchProcess, psutil.AccessDenied): pass
    try:
        with urllib.request.urlopen('http://127.0.0.1:11434/api/ps', timeout=1) as response:
            data = json.load(response)
        record['ollama_models'] = [{key: model.get(key) for key in ['name', 'size', 'size_vram', 'expires_at', 'context_length']} for model in data.get('models', [])]
    except Exception as error: record['ollama_status'] = type(error).__name__
    with (JOB / 'ram-samples.jsonl').open('a') as stream:
        stream.write(json.dumps(record) + '\n')
    return record


claim = {'claim': 'Single observed FrostNova Desktop initiated Qwen 2.1 normal T2I run: sampled RAM footprint and system pressure by phase, not a benchmark comparison or guaranteed minimum RAM.', 'interval_seconds': 5, 'metrics': 'Process physical footprint and RSS; system available RAM, compression, swap and pressure. Unified CPU/GPU RAM must not be added twice.', 'logical_cpus': psutil.cpu_count(), 'initial_load_average': psutil.getloadavg(), 'started_at': time.time()}
(JOB / 'measurement-plan.json').write_text(json.dumps(claim, indent=2))
print('RAM monitor started; sampling every 5 seconds', flush=True)
try:
    while not (JOB / 'stop-monitor').exists():
        sample()
        time.sleep(5)
finally:
    sample()
    print('RAM monitor finished', flush=True)
