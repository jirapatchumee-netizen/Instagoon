#!/usr/bin/env python3
"""
Batch Storyboard Renderer for Chapter 1
Renders all 5 storyboard shots using Z-Image Turbo workflow via ComfyUI.
"""

import json
import os
import sys
from pathlib import Path

# Add project root and scripts to path
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
sys.path.append(str(SCRIPT_DIR))

from render_zimage_turbo import render

STORYBOARD_JSON = PROJECT_ROOT / "art/storyboard_chapter1.json"
OUTPUT_DIR = PROJECT_ROOT / "art/outputs/storyboard-chapter1"


def main():
    if not STORYBOARD_JSON.exists():
        print(f"Error: {STORYBOARD_JSON} not found", file=sys.stderr)
        sys.exit(1)

    with open(STORYBOARD_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)

    shots = data.get("shots", [])
    workflow = data.get("workflow")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"🎬 Starting Storyboard Rendering: {data.get('title')} ({len(shots)} shots)")
    print(f"📂 Output Directory: {OUTPUT_DIR}")
    print(f"⚡ Workflow: {workflow}\n")

    results = []
    for idx, shot in enumerate(shots, 1):
        print(f"[{idx}/{len(shots)}] 🎨 Rendering Shot {shot['shot_id']}: {shot['title']}...")
        print(f"   Prefix: {shot['prefix']}, Seed: {shot['seed']}")
        try:
            res = render(
                prompt_text=shot["prompt"],
                prefix=shot["prefix"],
                seed=shot["seed"],
                output_dir=OUTPUT_DIR,
                workflow_path=workflow
            )
            res["shot_id"] = shot["shot_id"]
            res["scene_id"] = shot["scene_id"]
            res["title"] = shot["title"]
            res["narrative"] = shot["narrative"]
            results.append(res)
            print(f"   ✅ Saved: {res['filename']} ({res['width']}x{res['height']})\n")
        except Exception as e:
            print(f"   ❌ Failed: {e}\n", file=sys.stderr)

    # Generate Markdown Storyboard Index
    md_path = OUTPUT_DIR / "STORYBOARD_CHAPTER1.md"
    with open(md_path, "w", encoding="utf-8") as f:
        f.write("# 🎬 Storyboard — Chapter 1: Overtime Secrets (แฟ้มลับกะดึก)\n\n")
        f.write("> **Project:** Overtime Secrets (`games/overtime/`)\n")
        f.write("> **Engine / Model:** Z-Image Turbo + AnimeLora3 (544×960 9:16 Portrait)\n")
        f.write(f"> **Workflow:** `{workflow}`\n")
        f.write(f"> **Total Panels:** {len(results)} Panels Generated\n\n")
        f.write("---\n\n")
        f.write("## 📑 Storyboard Panels Summary\n\n")
        f.write("| Panel | Scene ID | Title | Image File | Seed | Status |\n")
        f.write("| :---: | :--- | :--- | :--- | :---: | :---: |\n")
        for r in results:
            f.write(f"| **{r['shot_id']}** | `{r['scene_id']}` | **{r['title']}** | `images/{r['filename']}` | `{r['seed']}` | ✅ Ready |\n")
        f.write("\n---\n\n")
        f.write("## 🖼️ Detailed Panel Breakdown\n\n")
        for r in results:
            f.write(f"### 📌 Panel {r['shot_id']}: {r['title']}\n\n")
            f.write(f"- **Scene ID:** `{r['scene_id']}`\n")
            f.write(f"- **Resolution:** {r['width']} × {r['height']} px (9:16 Portrait)\n")
            f.write(f"- **Seed:** `{r['seed']}`\n")
            f.write(f"- **Output Path:** `{r['path']}`\n")
            f.write(f"- **Narrative Beat:** {r['narrative']}\n\n")
            f.write("```text\n")
            f.write(f"[Prompt]: {r['prompt']}\n")
            f.write("```\n\n")
            f.write(f"![{r['title']}]({r['path']})\n\n")
            f.write("---\n\n")

    print(f"✨ Storyboard rendering complete! {len(results)}/{len(shots)} images rendered.")
    print(f"📄 Summary Report: {md_path}")


if __name__ == "__main__":
    main()
