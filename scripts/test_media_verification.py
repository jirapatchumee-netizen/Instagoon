import importlib.util
import json
from pathlib import Path
import shutil
import struct
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import zlib

SCRIPTS = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('render_zimage_turbo', SCRIPTS / 'render_zimage_turbo.py')
renderer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(renderer)


def png(width=544, height=960, pixels=None):
    def chunk(kind, data):
        return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data))
    raw = pixels if pixels is not None else (b'\0' + bytes(width * 3)) * height
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b''))


class MediaVerificationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.workflow = self.root / 'workflow.json'
        self.workflow.write_text(json.dumps({str(n): {'inputs': {}} for n in [5, 9, 11]}))
        self.image = self.root / 'output.png'

    def tearDown(self):
        self.temp.cleanup()

    def render(self):
        history = {'outputs': {'11': {'images': [{'filename': 'output.png'}]}}}
        with patch.object(renderer, 'COMFY_OUTPUT_DIR', self.root), patch.object(renderer, 'queue_prompt', return_value={'prompt_id': 'fixture'}), patch.object(renderer, 'wait_for_prompt', return_value=history):
            return renderer.render('fixture', workflow_path=self.workflow, output_dir=self.root / 'copied')

    def test_render_rejects_corrupt_png_before_copy(self):
        self.image.write_bytes(b'not a PNG')
        with self.assertRaises(ValueError):
            self.render()
        self.assertFalse((self.root / 'copied/output.png').exists())

    def test_render_rejects_wrong_dimensions(self):
        self.image.write_bytes(png(32, 32))
        with self.assertRaisesRegex(ValueError, '544.*960'):
            self.render()

    def test_render_rejects_incomplete_decoded_pixels(self):
        self.image.write_bytes(png(pixels=b'\0'))
        with self.assertRaises(ValueError):
            self.render()

    def test_render_reports_real_dimensions_and_hash(self):
        self.image.write_bytes(png())
        result = self.render()
        self.assertEqual((result['width'], result['height']), (544, 960))
        self.assertEqual(len(result['sha256']), 64)
        self.assertEqual((self.root / 'copied/output.png').read_bytes(), self.image.read_bytes())

    def fixture(self):
        scripts = self.root / 'scripts'
        game = self.root / 'games/overtime'
        scripts.mkdir()
        (game / 'scenes').mkdir(parents=True)
        shutil.copy2(SCRIPTS / 'vn-check.mjs', scripts / 'vn-check.mjs')
        for name in ['CANON.md', 'THREADS.md']:
            (game / name).touch()
        (game / 'game.json').write_text(json.dumps({'characters': {}, 'backgrounds': {'bg_old': 'old', 'bg_new': 'new'}, 'variables': {}}))
        (game / 'scenes/S1.json').write_text(json.dumps({'id': 'S1', 'nodes': [{'id': '015', 'bg': 'bg_old', 'text': 'fixture'}]}))
        (game / 'assets.json').write_text(json.dumps({'assets': {'bg_new': {'kind': 'bg', 'status': 'active', 'file': '/art/new.png'}, 'placeholder': {'kind': 'sprite', 'status': 'missing'}}}))
        (self.root / 'public/art').mkdir(parents=True)
        (self.root / 'public/art/new.png').write_bytes(png())
        return game

    def check(self, *args):
        return subprocess.run(['node', str(self.root / 'scripts/vn-check.mjs'), *args], capture_output=True, text=True)

    def test_missing_served_file_fails_general_check(self):
        self.fixture()
        (self.root / 'public/art/new.png').unlink()
        result = self.check()
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertIn('Missing asset file', result.stderr)

    def test_procedural_asset_with_explicit_missing_file_fails(self):
        game = self.fixture()
        (game / 'assets.json').write_text(json.dumps({'assets': {
            'bg_new': {'kind': 'bg', 'status': 'procedural', 'file': '/art/new.png'}}}))
        (game / 'scenes/S1.json').write_text(json.dumps({'id': 'S1', 'nodes': [
            {'id': '015', 'bg': 'bg_new', 'text': 'fixture'}]}))
        (self.root / 'public/art/new.png').unlink()
        result = self.check('--node', 'S1/015', '--asset', 'bg_new', '--file', '/art/new.png')
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertIn('Missing asset file', result.stderr)

    def test_copied_file_without_registry_mapping_fails(self):
        game = self.fixture()
        (game / 'assets.json').write_text('{"assets":{}}')
        result = self.check('--node', 'S1/015', '--asset', 'bg_new', '--file', '/art/new.png')
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertIn('Expected asset', result.stderr)

    def test_mapping_not_used_by_target_fails(self):
        self.fixture()
        result = self.check('--node', 'S1/015', '--asset', 'bg_new', '--file', '/art/new.png')
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertIn('does not use', result.stderr)

    def test_target_bound_to_served_asset_passes(self):
        game = self.fixture()
        (game / 'scenes/S1.json').write_text(json.dumps({'id': 'S1', 'nodes': [{'id': '015', 'bg': 'bg_new', 'text': 'fixture'}]}))
        result = self.check('--node', 'S1/015', '--asset', 'bg_new', '--file', '/art/new.png')
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == '__main__':
    unittest.main(verbosity=2)
