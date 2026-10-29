#!/usr/bin/env python3
"""
Z-Image Untwisting 544x960 ComfyUI Render Runner
Executes prompts against local ComfyUI instance (http://127.0.0.1:8188)
using ~/ComfyUI/workflows/Z_Image_Untwisting_544x960.json
"""

import argparse
import json
import hashlib
import shutil
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

DEFAULT_WORKFLOW = str(Path.home() / "ComfyUI/workflows/Z_Image_Untwisting_544x960.json")
COMFY_URL = "http://127.0.0.1:8188"
COMFY_OUTPUT_DIR = Path.home() / "ComfyUI/output"


def png_info(path):
    from PIL import Image, UnidentifiedImageError

    try:
        with Image.open(path) as image:
            if image.format != "PNG":
                raise ValueError("Output is not a PNG")
            width, height = image.size
            if (width, height) != (544, 960):
                raise ValueError(f"Expected 544x960 PNG, got {width}x{height}")
            image.verify()
        with Image.open(path) as image:
            image.load()
    except (OSError, SyntaxError, UnidentifiedImageError) as error:
        raise ValueError("Invalid PNG image") from error
    return {"width": width, "height": height,
            "sha256": hashlib.sha256(Path(path).read_bytes()).hexdigest()}


def queue_prompt(workflow_dict, host_url=COMFY_URL):
    req_data = json.dumps({"prompt": workflow_dict}).encode("utf-8")
    req = urllib.request.Request(
        f"{host_url}/prompt",
        data=req_data,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=10.0) as resp:
        return json.loads(resp.read().decode("utf-8"))


def wait_for_prompt(prompt_id, host_url=COMFY_URL, timeout_sec=200):
    start = time.time()
    while time.time() - start < timeout_sec:
        try:
            with urllib.request.urlopen(f"{host_url}/history/{prompt_id}", timeout=5.0) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if prompt_id in data:
                    return data[prompt_id]
        except Exception:
            pass
        time.sleep(1.5)
    raise TimeoutError(f"Prompt {prompt_id} did not complete within {timeout_sec}s")


def render(prompt_text, prefix="Storyboard", seed=42, output_dir=None, workflow_path=DEFAULT_WORKFLOW, reference_image=None):
    wf_file = Path(workflow_path)
    if not wf_file.exists():
        raise FileNotFoundError(f"Workflow file not found: {workflow_path}")

    with open(wf_file, "r", encoding="utf-8") as f:
        wf = json.load(f)

    # Inject prompt, seed, prefix
    wf["5"]["inputs"]["text"] = prompt_text
    wf["9"]["inputs"]["seed"] = int(seed)
    wf["11"]["inputs"]["filename_prefix"] = prefix
    if reference_image and "12" in wf and "image" in wf["12"].get("inputs", {}):
        wf["12"]["inputs"]["image"] = reference_image

    res = queue_prompt(wf)
    prompt_id = res.get("prompt_id")
    if not prompt_id:
        raise RuntimeError(f"Failed to queue prompt: {res}")

    history = wait_for_prompt(prompt_id)
    outputs = history.get("outputs", {})
    images = outputs.get("11", {}).get("images", [])
    if not images:
        raise RuntimeError(f"No images returned in history output: {outputs}")

    img_info = images[0]
    filename = img_info["filename"]
    subfolder = img_info.get("subfolder", "")
    src_path = COMFY_OUTPUT_DIR / subfolder / filename

    if not src_path.exists():
        raise FileNotFoundError(f"Output image file not found at {src_path}")

    image_info = png_info(src_path)
    final_path = src_path
    if output_dir:
        out_path = Path(output_dir)
        out_path.mkdir(parents=True, exist_ok=True)
        dest_path = out_path / filename
        shutil.copy2(src_path, dest_path)
        final_path = dest_path

    return {
        "status": "completed",
        "prompt_id": prompt_id,
        "filename": filename,
        "path": str(final_path.resolve()),
        **image_info,
        "seed": seed,
        "prompt": prompt_text
    }


def main():
    parser = argparse.ArgumentParser(description="Render via Z-Image Untwisting ComfyUI workflow")
    parser.add_argument("--prompt", required=True, help="Positive prompt text")
    parser.add_argument("--prefix", default="Storyboard", help="Filename prefix")
    parser.add_argument("--seed", type=int, default=42, help="Seed integer")
    parser.add_argument("--output-dir", default=None, help="Destination directory")
    parser.add_argument("--workflow", default=DEFAULT_WORKFLOW, help="Workflow JSON path")
    parser.add_argument("--reference-image", default=None, help="Reference style image filename in ComfyUI input")

    args = parser.parse_args()
    try:
        result = render(
            prompt_text=args.prompt,
            prefix=args.prefix,
            seed=args.seed,
            output_dir=args.output_dir,
            workflow_path=args.workflow,
            reference_image=args.reference_image
        )
        print(json.dumps(result, indent=2, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"status": "failed", "error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
