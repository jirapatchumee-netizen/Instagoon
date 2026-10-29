#!/usr/bin/env python3
"""
Frost Script DSL Compiler & Decompiler
Converts between Frost Script (.fscript) text files and Frost Novel Studio Scene JSON.
Preserves single-scene isolation and conforms to the project's node conventions.
"""

import sys
import os
import json
import re
import argparse
import subprocess

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
DEFAULT_GAMES_DIR = os.path.join(PROJECT_ROOT, "games", "overtime")

def decompile_scene(scene_data):
    """Convert scene JSON dict into .fscript DSL string."""
    lines = []
    lines.append(f"# Scene: {scene_data.get('id', 'unknown_scene')}")
    if scene_data.get('title'):
        lines.append(f"# Title: {scene_data.get('title')}")
    if scene_data.get('bg'):
        lines.append(f"# BG: {scene_data.get('bg')}")
    if scene_data.get('bgm'):
        lines.append(f"# BGM: {scene_data.get('bgm')}")
    lines.append("")

    nodes = scene_data.get('nodes', [])
    for node in nodes:
        node_id = node.get('id', '')
        lines.append(f"[{node_id}]")

        # Background override
        if node.get('bg'):
            lines.append(f"{{bg::{node['bg']}}}")

        # BGM override
        if node.get('bgm'):
            lines.append(f"{{bgm::{node['bgm']}}}")

        # SFX override
        if node.get('sfx'):
            lines.append(f"{{sfx::{node['sfx']}}}")

        # Visual FX (shake, flash)
        if node.get('fx'):
            lines.append(f"{{fx::{node['fx']}}}")

        # Cast placement
        if 'cast' in node:
            cast_str = ", ".join(node['cast'])
            lines.append(f"{{cast::{cast_str}}}")

        if 'set' in node:
            lines.append(f"{{set::{json.dumps(node['set'], ensure_ascii=False)}}}")

        # Check node type
        if 'choice' in node:
            prompt = node.get('choice', '')
            lines.append(f"{{choice::{prompt}}}")
            for opt in node.get('options', []):
                opt_str = f"- {json.dumps(opt.get('label', ''), ensure_ascii=False)}"
                if opt.get('if'):
                    opt_str += f" [if: {opt['if']}]"
                if opt.get('set'):
                    opt_str += f" [set: {json.dumps(opt['set'], ensure_ascii=False)}]"
                opt_str += f" -> {opt.get('go', '')}"
                lines.append(opt_str)

        elif 'end' in node:
            end_type = node.get('end', 'game')
            msg = node.get('text', node.get('message', ''))
            lines.append(f"{{end::{end_type}}} {json.dumps(msg, ensure_ascii=False)}")
            if node.get('retry'):
                lines.append(f"{{retry::{node['retry']}}}")

        elif 'branch' in node or ('cond' in node and 'then' in node):
            cond = node.get('branch', node.get('cond', ''))
            then_go = node.get('then', '')
            else_go = node.get('else', '')
            lines.append(f"{{branch::{cond}}} -> {then_go} : {else_go}")

        elif 'text' in node or 'say' in node:
            # Standard Dialogue
            speaker = node.get('say')
            text = node.get('text', '')
            
            # Format text safely
            if speaker:
                lines.append(f"{speaker}::{json.dumps(text, ensure_ascii=False)}")
            else:
                lines.append(json.dumps(text, ensure_ascii=False))

        # Explicit next jump if set
        if node.get('go') and 'choice' not in node and 'branch' not in node:
            lines.append(f"-> {node['go']}")

        lines.append("")

    return "\n".join(lines)


def compile_script(script_text):
    """Compile .fscript DSL string into scene JSON dict."""
    scene_data = {
        "id": "",
        "title": "",
        "bg": "",
        "nodes": []
    }

    lines = script_text.splitlines()
    current_node = None
    auto_id_counter = 10

    def parse_string(value):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value[1:-1]

    def parse_set(value):
        if value.startswith('{'):
            return json.loads(value)
        result = {}
        for item in value.split(','):
            if '=' in item:
                key, val = item.split('=', 1)
                try:
                    result[key.strip()] = json.loads(val.strip())
                except json.JSONDecodeError:
                    result[key.strip()] = val.strip()
        return result

    def finalize_node():
        nonlocal current_node
        if current_node:
            scene_data["nodes"].append(current_node)
            current_node = None

    for raw_line in lines:
        line = raw_line.strip()
        if not line:
            continue

        # Header metadata comments
        if line.startswith("# Scene:"):
            scene_data["id"] = line.split(":", 1)[1].strip()
            continue
        elif line.startswith("# Title:"):
            scene_data["title"] = line.split(":", 1)[1].strip()
            continue
        elif line.startswith("# BG:"):
            scene_data["bg"] = line.split(":", 1)[1].strip()
            continue
        elif line.startswith("# BGM:"):
            scene_data["bgm"] = line.split(":", 1)[1].strip()
            continue
        elif line.startswith("#"):
            # Generic comment
            continue

        # Node ID header [010]
        id_match = re.match(r"^\[([a-zA-Z0-9_\-]+)\]$", line)
        if id_match:
            finalize_node()
            current_node = {"id": id_match.group(1)}
            continue

        # If line starts and no current_node, auto-create one
        if current_node is None:
            current_node = {"id": f"{auto_id_counter:03d}"}
            auto_id_counter += 10

        # Tags like {bg::...}, {bgm::...}, {sfx::...}, {fx::...}, {cast::...}
        tag_match = re.match(r"^\{(bg|bgm|sfx|fx|cast|retry)::(.*?)\}$", line)
        if tag_match:
            tag, val = tag_match.group(1), tag_match.group(2).strip()
            if tag == "bg":
                current_node["bg"] = val
            elif tag == "bgm":
                current_node["bgm"] = val
            elif tag == "sfx":
                current_node["sfx"] = val
            elif tag == "fx":
                current_node["fx"] = val
            elif tag == "cast":
                current_node["cast"] = [c.strip() for c in val.split(",") if c.strip()]
            elif tag == "retry":
                current_node["retry"] = val
            continue

        # Choice tag: {choice::Prompt text}
        choice_match = re.match(r"^\{choice(?:::)?(.*?)\}$", line)
        if choice_match:
            prompt = choice_match.group(1).strip()
            current_node["choice"] = prompt
            current_node["options"] = []
            continue

        # Choice option: - "label" [if: cond] [set: k=v] -> go
        if line.startswith("- ") and current_node and "choice" in current_node:
            opt_line = line[2:].strip()
            label_match = re.match(r'^((?:"(?:\\.|[^"\\])*"))(.*)$', opt_line)
            if label_match:
                label = parse_string(label_match.group(1))
                rest = label_match.group(2).strip()
                
                option = {"label": label}
                
                # Check for [if: ...]
                if_match = re.search(r"\[if:\s*(.+?)\]", rest)
                if if_match:
                    option["if"] = if_match.group(1).strip()
                    
                # Check for [set: ...]
                set_match = re.search(r"\[set:\s*(.+?)\]", rest)
                if set_match:
                    set_str = set_match.group(1).strip()
                    option["set"] = parse_set(set_str)

                # Check for -> go
                go_match = re.search(r"->\s*([a-zA-Z0-9_\-/]+)", rest)
                if go_match:
                    option["go"] = go_match.group(1).strip()
                    
                current_node["options"].append(option)
            continue

        # End tag: {end::bad} "Message"
        end_match = re.match(r'^\{end::([^}]+)\}(?:\s*(".*"))?$', line)
        if end_match:
            current_node["end"] = end_match.group(1)
            if end_match.group(2):
                current_node["text"] = parse_string(end_match.group(2))
            continue

        # Branch tag: {branch::cond} -> then_id : else_id
        branch_match = re.match(r"^\{branch::(.+?)\}\s*->\s*([a-zA-Z0-9_\-/]+)\s*:\s*([a-zA-Z0-9_\-/]+)$", line)
        if branch_match:
            current_node["cond"] = branch_match.group(1).strip()
            current_node["then"] = branch_match.group(2).strip()
            current_node["else"] = branch_match.group(3).strip()
            continue

        # Set tag: {set::k = v} -> go
        set_match = re.match(r"^\{set::(.+?)\}(?:\s*->\s*([a-zA-Z0-9_\-/]+))?$", line)
        if set_match:
            set_str = set_match.group(1).strip()
            current_node["set"] = parse_set(set_str)
            if set_match.group(2):
                current_node["go"] = set_match.group(2).strip()
            continue

        # Next node jump: -> 030
        next_match = re.match(r"^->\s*([a-zA-Z0-9_\-/]+)$", line)
        if next_match:
            current_node["go"] = next_match.group(1).strip()
            continue

        # Dialogue speech: speaker::"text"
        dialogue_match = re.match(r'^([a-zA-Z0-9_]+)::(".*")$', line)
        if dialogue_match:
            current_node["say"] = dialogue_match.group(1)
            current_node["text"] = parse_string(dialogue_match.group(2))
            continue

        # Narration: "text"
        narration_match = re.match(r'^(".*")$', line)
        if narration_match:
            current_node["text"] = parse_string(narration_match.group(1))
            continue

        # Fallback raw line as text
        if current_node:
            current_node["text"] = line

    finalize_node()

    # Clean up empty scene metadata
    if not scene_data["id"]:
        scene_data["id"] = "untitled_scene"

    return scene_data


def run_vn_check():
    """Execute pnpm vn:check to validate story consistency."""
    check_script = os.path.join(SCRIPT_DIR, "vn-check.mjs")
    if os.path.exists(check_script):
        res = subprocess.run(["node", check_script], capture_output=True, text=True)
        print(res.stdout)
        if res.returncode != 0:
            print(res.stderr, file=sys.stderr)
            return False
    return True


def main():
    parser = argparse.ArgumentParser(description="Frost Script DSL Compiler & Decompiler")
    parser.add_argument("--compile", "-c", help="Compile a .fscript file to .json")
    parser.add_argument("--decompile", "-d", help="Decompile a scene .json file to .fscript")
    parser.add_argument("--compile-all", action="store_true", help="Compile all .fscript files in scripts/ to scenes/")
    parser.add_argument("--decompile-all", action="store_true", help="Decompile all scenes/*.json into scripts/")
    parser.add_argument("--out", "-o", help="Explicit output path")
    parser.add_argument("--no-check", action="store_true", help="Skip running vn:check after compilation")

    args = parser.parse_args()

    scenes_dir = os.path.join(DEFAULT_GAMES_DIR, "scenes")
    scripts_dir = os.path.join(DEFAULT_GAMES_DIR, "scripts")
    os.makedirs(scripts_dir, exist_ok=True)
    os.makedirs(scenes_dir, exist_ok=True)

    if args.decompile:
        src = args.decompile
        dest = args.out or os.path.join(scripts_dir, os.path.splitext(os.path.basename(src))[0] + ".fscript")
        with open(src, "r", encoding="utf-8") as f:
            data = json.load(f)
        fscript = decompile_scene(data)
        with open(dest, "w", encoding="utf-8") as f:
            f.write(fscript)
        print(f"✅ Decompiled: {src} -> {dest}")

    elif args.compile:
        src = args.compile
        dest = args.out or os.path.join(scenes_dir, os.path.splitext(os.path.basename(src))[0] + ".json")
        with open(src, "r", encoding="utf-8") as f:
            text = f.read()
        scene_data = compile_script(text)
        with open(dest, "w", encoding="utf-8") as f:
            json.dump(scene_data, f, ensure_ascii=False, indent=2)
        print(f"✅ Compiled: {src} -> {dest}")
        if not args.no_check:
            run_vn_check()

    elif args.decompile_all:
        for f in sorted(os.listdir(scenes_dir)):
            if f.endswith(".json"):
                src = os.path.join(scenes_dir, f)
                dest = os.path.join(scripts_dir, os.path.splitext(f)[0] + ".fscript")
                with open(src, "r", encoding="utf-8") as sf:
                    data = json.load(sf)
                fscript = decompile_scene(data)
                with open(dest, "w", encoding="utf-8") as df:
                    df.write(fscript)
                print(f"✅ Decompiled: {f} -> {os.path.basename(dest)}")
        print("\n✨ All scenes successfully decompiled to .fscript!")

    elif args.compile_all:
        for f in sorted(os.listdir(scripts_dir)):
            if f.endswith(".fscript"):
                src = os.path.join(scripts_dir, f)
                dest = os.path.join(scenes_dir, os.path.splitext(f)[0] + ".json")
                with open(src, "r", encoding="utf-8") as sf:
                    text = sf.read()
                data = compile_script(text)
                with open(dest, "w", encoding="utf-8") as df:
                    json.dump(data, df, ensure_ascii=False, indent=2)
                print(f"✅ Compiled: {f} -> {os.path.basename(dest)}")
        print("\n✨ All .fscript files compiled to scenes!")
        if not args.no_check:
            run_vn_check()
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
