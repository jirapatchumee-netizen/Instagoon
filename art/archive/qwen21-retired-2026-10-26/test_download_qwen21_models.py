import hashlib
import http.server
import os
from pathlib import Path
import subprocess
import tempfile
import threading
import unittest


SCRIPT = Path(__file__).with_name("download-qwen21-t2i-models.sh")


class DownloadTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.comfy = self.root / "ComfyUI with spaces"
        self.comfy.mkdir()
        original = SCRIPT.read_text()
        records = original.split("cat <<'MODELS'\n", 1)[1].split("\nMODELS", 1)[0]
        self.files = {}
        replacements = []
        for index, line in enumerate(records.splitlines()):
            relative = line.split()[0]
            content = (f"model-{index}-fixture\n" * 2048).encode()
            self.files[relative] = content
            replacements.append(f"{relative} {len(content)} {hashlib.sha256(content).hexdigest()}")
        self.requests = []
        files, requests = self.files, self.requests

        class Handler(http.server.BaseHTTPRequestHandler):
            def do_GET(self):
                relative = self.path.lstrip("/")
                content = files.get(relative)
                if content is None:
                    self.send_error(404)
                    return
                offset = int(self.headers.get("Range", "bytes=0-").split("=")[1].split("-")[0])
                requests.append((relative, offset))
                self.send_response(206 if offset else 200)
                self.send_header("Content-Length", str(len(content) - offset))
                if offset:
                    self.send_header("Content-Range", f"bytes {offset}-{len(content)-1}/{len(content)}")
                self.end_headers()
                self.wfile.write(content[offset:])

            def log_message(self, *args):
                pass

        server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.addCleanup(server.server_close)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        self.addCleanup(server.shutdown)
        test_script = original.replace(records, "\n".join(replacements))
        base_line = next(line for line in original.splitlines() if line.startswith("BASE_URL="))
        test_script = test_script.replace(base_line, f'BASE_URL="http://127.0.0.1:{server.server_port}"')
        self.script = self.root / "download.sh"
        self.script.write_text(test_script)

    def run_download(self):
        return subprocess.run(
            ["/bin/bash", str(self.script)],
            env={**os.environ, "COMFYUI_DIR": str(self.comfy)},
            capture_output=True, text=True, timeout=30,
        )

    def test_download_then_skip_verified_files(self):
        first = self.run_download()
        self.assertEqual(first.returncode, 0, first.stdout + first.stderr)
        for relative, content in self.files.items():
            self.assertEqual((self.comfy / "models" / relative).read_bytes(), content)
        second = self.run_download()
        self.assertEqual(second.returncode, 0, second.stdout + second.stderr)
        self.assertEqual(len(self.requests), 3)
        self.assertEqual(second.stdout.count("Verified; skipping download."), 3)

    def test_resume_partial_file(self):
        relative, content = next(iter(self.files.items()))
        partial = self.comfy / "models" / (relative + ".part")
        partial.parent.mkdir(parents=True)
        partial.write_bytes(content[:4096])
        result = self.run_download()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(self.requests[0], (relative, 4096))
        self.assertEqual(partial.with_suffix("").read_bytes(), content)
        self.assertFalse(partial.exists())

    def test_corrupt_existing_file_is_preserved(self):
        relative, content = next(iter(self.files.items()))
        destination = self.comfy / "models" / relative
        destination.parent.mkdir(parents=True)
        corrupt = b"x" * len(content)
        destination.write_bytes(corrupt)
        result = self.run_download()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Existing file failed verification", result.stderr)
        self.assertEqual(destination.read_bytes(), corrupt)
        self.assertEqual(self.requests, [])

    def test_complete_corrupt_partial_is_not_installed(self):
        relative, content = next(iter(self.files.items()))
        partial = self.comfy / "models" / (relative + ".part")
        partial.parent.mkdir(parents=True)
        corrupt = b"x" * len(content)
        partial.write_bytes(corrupt)
        result = self.run_download()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Verification failed", result.stderr)
        self.assertEqual(partial.read_bytes(), corrupt)
        self.assertFalse(partial.with_suffix("").exists())
        self.assertFalse((self.comfy / "models/.qwen21-t2i-download.lock").exists())


if __name__ == "__main__":
    unittest.main()
