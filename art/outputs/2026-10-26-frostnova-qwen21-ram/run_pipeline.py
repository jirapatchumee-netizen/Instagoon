from pathlib import Path
import hashlib
import json
import os
import signal
import subprocess
import sys
import time
import urllib.error
import urllib.request
import uuid

JOB = Path(__file__).resolve().parent
ROOT = JOB.parents[2]
CORE = Path.home() / 'FrostNova/FrostNovaWorkspace/scratch/comfy-qwen21-validation'
PYTHON = Path.home() / 'ComfyUI/venv/bin/python'
BASE = 'http://127.0.0.1:8190'


def write(name, value):
    (JOB / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def phase(name):
    write('phase.json', {'phase': name, 'time': time.time()})
    with (JOB / 'phases.jsonl').open('a') as stream:
        stream.write(json.dumps({'phase': name, 'time': time.time()}) + '\n')
    print(name, flush=True)


def request(route, value=None):
    body = None if value is None else json.dumps(value).encode()
    req = urllib.request.Request(BASE + route, data=body, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=10) as response:
        return json.load(response)


def main():
    lock = JOB / 'pipeline.lock'
    lock.mkdir()
    server = None
    try:
        if (JOB / 'receipt.json').exists():
            raise RuntimeError('Run already completed; do not duplicate it')
        try:
            request('/system_stats')
        except urllib.error.URLError:
            pass
        else:
            raise RuntimeError('Port 8190 is occupied; preserve the existing server')
        phase('starting_comfy')
        models = Path.home() / 'ComfyUI/models'
        (JOB / 'models.yaml').write_text(f'local_models:\n  base_path: {models}\n  diffusion_models: diffusion_models\n  text_encoders: text_encoders\n  vae: vae\n')
        (JOB / 'images').mkdir(exist_ok=True)
        env = os.environ.copy()
        env['PYTHONPATH'] = str(CORE / '.runtime-deps')
        command = [str(PYTHON), '-u', str(CORE / 'main.py'), '--listen', '127.0.0.1', '--port', '8190', '--disable-all-custom-nodes', '--offline', '--bf16-unet', '--cpu-vae', '--use-pytorch-cross-attention', '--extra-model-paths-config', str(JOB / 'models.yaml'), '--output-directory', str(JOB / 'images')]
        with (JOB / 'server.log').open('w') as log:
            server = subprocess.Popen(command, cwd=CORE, env=env, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
        write('server-process.json', {'pid': server.pid, 'parent_pid': os.getpid(), 'runner_pid': os.getpid(), 'argv': command})
        deadline = time.monotonic() + 120
        while True:
            if server.poll() is not None:
                raise RuntimeError('ComfyUI startup failed; inspect server.log')
            try:
                stats = request('/system_stats')
                break
            except urllib.error.URLError:
                if time.monotonic() > deadline:
                    raise TimeoutError('ComfyUI startup timed out')
                time.sleep(2)
        write('system-stats.json', stats)
        phase('comfy_idle')
        time.sleep(10)
        source = ROOT / 'art/outputs/2026-10-26-qwen21-t2i-544x960-v1/workflow-api.json'
        graph = json.loads(source.read_text())
        graph['6']['inputs']['seed'] = 2026102602
        graph['8']['inputs']['filename_prefix'] = 'noey_frostnova_qwen21_544x960'
        write('workflow-api.json', graph)
        prompt_id = str(uuid.uuid4())
        write('submission-intent.json', {'prompt_id': prompt_id, 'time': time.time()})
        phase('render_requested')
        result = request('/prompt', {'prompt': graph, 'client_id': 'frostnova-desktop-ram-test', 'prompt_id': prompt_id})
        write('submission.json', result)
        deadline = time.monotonic() + 1200
        while True:
            history = request('/history/' + prompt_id)
            if prompt_id in history:
                break
            if server.poll() is not None:
                raise RuntimeError('ComfyUI exited during render')
            if time.monotonic() > deadline:
                raise TimeoutError('Render timed out; no automatic resubmit')
            time.sleep(3)
        write('history.json', history)
        record = history[prompt_id]
        if record['status']['status_str'] != 'success' or not record['status']['completed']:
            raise RuntimeError('Render failed; inspect history.json and server.log')
        from PIL import Image
        files = []
        for output in record['outputs'].values():
            for image in output.get('images', []):
                path = JOB / 'images' / image.get('subfolder', '') / image['filename']
                with Image.open(path) as decoded:
                    decoded.load()
                    if decoded.size != (544, 960):
                        raise RuntimeError(f'Unexpected image dimensions: {decoded.size}')
                files.append({'path': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
        if not files:
            raise RuntimeError('No decoded image output')
        write('receipt.json', {'status': 'success', 'prompt_id': prompt_id, 'outputs': files, 'width': 544, 'height': 960, 'steps': 25, 'cfg': 1, 'time': time.time(), 'runner_pid': os.getpid(), 'parent_pid': os.getppid()})
        phase('render_complete_models_cached')
        time.sleep(20)
    except BaseException as error:
        write('error.json', {'type': type(error).__name__, 'message': str(error), 'time': time.time()})
        phase('failed')
        raise
    finally:
        if server is not None and server.poll() is None:
            os.killpg(server.pid, signal.SIGTERM)
            try:
                server.wait(timeout=15)
            except subprocess.TimeoutExpired:
                os.killpg(server.pid, signal.SIGKILL)
                server.wait()
        phase('comfy_stopped')
        lock.rmdir()
    time.sleep(10)
    print(json.dumps(json.loads((JOB / 'receipt.json').read_text()), ensure_ascii=False), flush=True)


if __name__ == '__main__':
    main()
