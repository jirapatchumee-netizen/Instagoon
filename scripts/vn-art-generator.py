#!/usr/bin/env python3
"""
Visual Novel Art Generator & ComfyUI Pipeline
Inspired by claude-higgsfield-skill / Cinematic Prompt Studio (bulk_builder.py + higgsfield-mcp)

Generates character sprites, cinematic Event CGs, and LTX-Video 2.5 motion prompts
for the Visual Novel project ('Overtime Secrets'), with optional direct submission
to local ComfyUI API (127.0.0.1:8188) on Apple Silicon Mac M4 Pro.
"""

import argparse
import csv
import json
import os
import re
import sys
import urllib.request
import urllib.error
import zipfile
from pathlib import Path

# Base quality and negative tags tuned for SDXL / Illustrious / Pony / Animagine
QUALITY_BASE = "masterpiece, best quality, ultra-detailed, 8k wallpaper, aesthetic, dynamic lighting, finely detailed anime eyes, studio lighting"
NEGATIVE_BASE = "lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry, artist name, explicit nude, uncensored genitals"

HEROINES = {
    "noey": {
        "stage": 1,
        "name": "น้องเนย (Noey)",
        "role": "Marketing Intern",
        "tag": "noey_intern",
        "age": 21,
        "base_identity": "cute asian anime girl, caramel brown hair, side ponytail with pink scrunchie, bright magenta eyes",
        "wardrobe": "white office blouse, pink ribbon tie, navy blue pleated skirt",
        "expressions": {
            "normal": "gentle smile, looking at viewer, open happy eyes",
            "blush": "heavy blushing, watery eyes, embarrassment, shy o-shaped mouth, cute flustered expression",
            "panicked": "worried eyebrows, teary eyes, slightly parted lips, looking down nervously",
            "pout": "pouting puffed cheeks, looking sideways, slightly furrowed cute brows"
        },
        "event_cg": {
            "title": "Under the Desk Romance",
            "prompt": "masterpiece, 1girl, 1boy, noey_intern, close distance, intimate proximity under office wooden desk, soft warm shadows, dim office night lighting, girl crouching close to viewer, flushed red cheeks, nervous trembling breath, sweating slightly, messy brown side ponytail, slightly rumpled white blouse, shallow depth of field, cinematic lighting, sensual tension, ecchi romance aesthetic"
        },
        "motion_ltx": {
            "title": "Noey Desk Romance Motion (5s)",
            "duration": 5.0,
            "prompt": "0.0s - 1.5s: Extreme close-up on Noey crouching under office desk, soft blue computer glow on her hair, subtle trembling breathing motion, eyes darting up nervously.\n1.5s - 3.5s: Slow camera push-in towards her face, heavy blush blooming on cheeks, lips parting with slight nervous exhale, loose strands of caramel brown ponytail swaying softly.\n3.5s - 5.0s: Eye contact locked with camera/viewer, subtle embarrassed swallow, dim office light shifting as footsteps pass outside, romantic intimate tension, cinematic 24fps motion blur."
        }
    },
    "pim": {
        "stage": 2,
        "name": "คุณพิมพ์ (Pim)",
        "role": "Strict HR Manager",
        "tag": "pim_hr",
        "age": 30,
        "base_identity": "beautiful mature woman, sleek black hair in elegant updo, red-framed glasses, sharp violet eyes, voluptuous figure",
        "wardrobe": "dark navy tailored business blazer, tight white button-up shirt, navy pencil skirt, cleavage peek",
        "expressions": {
            "strict": "condescending gaze, stern look, frowning, hand adjusting glasses, authoritative",
            "shocked": "eyes wide in shock, glasses slipping down nose, flushed cheeks, gasp mouth, disheveled composure",
            "seductive_blush": "heavy blush, trembling lips, removing glasses, seductive flustered gaze, looking away in embarrassment",
            "gentle_tease": "smirking playfully, raised eyebrow, looking over the rim of red glasses"
        },
        "event_cg": {
            "title": "The Secret HR Cosplay Exposure",
            "prompt": "masterpiece, 1girl, 1boy, pim_hr, locked HR records archive room late at night, dim moody neon street reflections through venetian blinds, girl backed against tall filing cabinets, caught red-handed in partially unzipped glamorous cosplay outfit under formal blazer, glasses askew on flushed cheeks, breathless expression of scandal and desperate surrender, cinematic depth of field, moody noir illumination"
        },
        "motion_ltx": {
            "title": "Pim HR Archive Confrontation (5s)",
            "duration": 5.0,
            "prompt": "0.0s - 2.0s: Low-angle tracking shot along archive filing cabinets towards Pim, shadows slicing across her stern face from window blinds.\n2.0s - 3.5s: Hand reaches up in slow motion to adjust red glasses, eyes widening as secret folder slips from fingers.\n3.5s - 5.0s: Fast camera push-in on her face, sudden vulnerability shattering her strict composure, rapid shallow breathing, dramatic cinematic lighting shift."
        }
    },
    "rinda": {
        "stage": 3,
        "name": "คุณรินดา (Rinda)",
        "role": "Internal Audit Chief",
        "tag": "rinda_audit",
        "age": 28,
        "base_identity": "chic intelligent woman, dark brown bob cut hair, sharp amber golden eyes, slender long legs",
        "wardrobe": "formal charcoal grey waistcoat, white collared shirt with rolled up sleeves, silver pendant necklace",
        "expressions": {
            "calculating": "smirking confidently, piercing amber eyes, tilting head slightly, analytical gaze",
            "interrogating": "narrowed eyes, intense scrutiny, furrowed brow, pointing pen forward, stern professional pressure",
            "vulnerable": "subtle blush on cheekbones, surprised wide eyes, loosened necktie, looking down caught off-guard",
            "relieved": "soft affectionate smile, eyes gently closed, relaxed posture, exhaling softly"
        },
        "event_cg": {
            "title": "The Audit Interrogation",
            "prompt": "masterpiece, 1girl, 1boy, rinda_audit, late night audit department, desks piled with confidential financial binders, harsh desk lamp beam cutting through room darkness, girl leaning across wooden conference table close to boy, charcoal waistcoat unbuttoned, amber eyes glowing in directional lamplight, predatory whisper distance, intense psychological suspense, cinematic noir lighting"
        },
        "motion_ltx": {
            "title": "Rinda Audit Interrogation Motion (5s)",
            "duration": 5.0,
            "prompt": "0.0s - 2.0s: Macro shot of fountain pen tapping rhythmically on confidential audit ledger, golden amber desk lamp casting long harsh shadows.\n2.0s - 3.5s: Smooth upward pan to Rinda's smirking face leaning forward, amber eyes gleaming with predator-like satisfaction.\n3.5s - 5.0s: Slow camera push-in as she leans into whisper range, subtle wisp of breath visible in chilly AC air, cinematic suspense focus."
        }
    },
    "meena": {
        "stage": 4,
        "name": "คุณมีนา (Meena)",
        "role": "Executive Secretary",
        "tag": "meena_secretary",
        "age": 26,
        "base_identity": "gorgeous executive secretary, wavy chocolate brown long hair, calm hazel eyes, seductive elegance",
        "wardrobe": "beige tailored double-breasted suit, silk camisole, holding leather folder",
        "expressions": {
            "poker_face": "serene gentle smile, closed lips, polite distant gaze, unreadable professional mask",
            "suspicious": "cold piercing stare, flat expression, tilting chin down, dangerous quiet intensity",
            "wistful_secret": "eyes looking out window wistfully, melancholic gentle expression, soft parted lips, resting cheek on hand",
            "intimate": "tender flushed smile, eyelashes fluttering, soft warm gaze, loosened hair strands"
        },
        "event_cg": {
            "title": "Executive Limousine Secrets",
            "prompt": "masterpiece, 1girl, 1boy, meena_secretary, luxury black executive limousine backseat, neon rain reflections gliding over tinted windows, streetlights flashing intermittently inside cabin, girl seated close to boy on leather upholstery, beige suit jacket draped over shoulders, quiet secretive whispers, hazel eyes illuminated by passing neon billboards, cinematic bokeh, luxurious intimate atmosphere"
        },
        "motion_ltx": {
            "title": "Meena Limousine Night Drive (6s)",
            "duration": 6.0,
            "prompt": "0.0s - 2.5s: Interior limousine shot looking out tinted window, neon city lights and rain droplets streaking past in smooth kinetic motion.\n2.5s - 4.5s: Camera smoothly tracks left to Meena seated closely, ambient magenta and cyan billboard lighting illuminating her calm hazel eyes.\n4.5s - 6.0s: Slow push-in on her face, serene mask dropping as she whispers, lips moving with soft breath, cinematic anamorphic bokeh flare."
        }
    },
    "rhea": {
        "stage": 5,
        "name": "คุณหนู เร-อา (Rhea)",
        "role": "Cool Beauty Future CEO",
        "tag": "rhea_heiress",
        "age": 24,
        "base_identity": "stunning cool beauty, pale porcelain skin, long flowing obsidian raven hair with silver highlights, piercing icy blue eyes, aristocratic aura",
        "wardrobe": "high-end bespoke black designer suit, silk collar, minimalist diamond necklace",
        "expressions": {
            "cold_contempt": "narrowed cold eyes, unimpressed glare, looking down at viewer, aloof stoic face",
            "intrigued_smirk": "subtle faint smirk, calculating sharp gaze, tilting chin up, predatory intelligence",
            "broken_ice": "intense red blush covering pale cheeks, trembling dilated blue eyes, biting lower lip, breathless expression, loosened black tie, vulnerable beauty",
            "queenly_grace": "regal upright posture, calm commanding gaze, slight authoritative tilt of head"
        },
        "event_cg": {
            "title": "The Penthouse Storm Climax",
            "prompt": "masterpiece, 1girl, 1boy, rhea_heiress, penthouse office top floor at midnight, giant panoramic glass window with raging rainstorm and lightning flashing outside, luxury executive leather chair, dim ambient amber room lights, girl seated with wet disheveled black suit, tie pulled loose, chest heaving slightly, flushed pale skin, looking up at boy with breathtaking mixture of pride and passionate surrender, sensual lighting, cinematic masterpiece, 8k resolution, romantic tension"
        },
        "motion_ltx": {
            "title": "Rhea Penthouse Storm Climax Motion (6s)",
            "duration": 6.0,
            "prompt": "0.0s - 2.0s: Slow low-angle push-in on Rhea seated in executive leather armchair, dark stormy clouds and rain beating against glass behind her, cold icy blue eyes staring calmly.\n2.0s - 4.0s: Sudden lightning flash illuminates the room in sharp monochrome, silhouette of her disordered black suit, subtle chest rise and trembling breath revealing vulnerable blush.\n4.0s - 6.0s: Camera holds steady in close-up, faint surrender smile touching her lips, rain droplets streaking glass in shallow bokeh, dramatic cinematic anime cutscene."
        }
    }
}


def build_sprite_prompt(heroine_key, exp_key, exp_desc):
    h = HEROINES[heroine_key]
    prompt = (
        f"1girl, {h['tag']}, solo, {h['age']} years old, {h['base_identity']}, "
        f"{h['wardrobe']}, {exp_desc}, transparent background, upper body, {QUALITY_BASE}"
    )
    return prompt


def build_character_sheet_prompt(heroine_key, layout="3panel"):
    """
    Builds a production-ready Character Reference Sheet prompt adhering strictly to
    the 'build-character-sheet-prompt' specification (ddokkang2).
    Supports 3-panel (face-excluded front neck-to-toe + complete back + face portrait)
    and modeling-board (3-view turnaround + 1 face close-up + 6 detail insets).
    """
    h = HEROINES[heroine_key]
    tag = h["tag"]
    name = h["name"]
    age = h["age"]
    identity = h["base_identity"]
    wardrobe = h["wardrobe"]

    if layout == "3panel":
        prompt = (
            f"masterpiece, best quality, ultra-detailed, professional character reference sheet, "
            f"three tall vertical panels arranged left-to-right in a single row, 1girl, {tag}, {age} years old.\n\n"
            f"[LEFT PANEL - FRONT OUTFIT & BODY VIEW, FACE EXCLUDED]: "
            f"Front-facing character view framed intentionally from the base of the neck to the soles of the shoes. "
            f"Show the character completely from neck to toe, with the full shoulders, torso, arms, hands, waist, legs, and shoes fully visible inside the frame without any cropping below the neck. "
            f"The upper frame boundary starts strictly at the base of the neck immediately above the collar and shoulder line. "
            f"Completely exclude the face, chin, mouth, nose, eyes, eyebrows, ears, hair, hairline, scalp, and all parts of the head. "
            f"The missing head is an intentional framing choice for costume inspection and must not be replaced with a mannequin, blank head, silhouette, mask, blur, or shadow. "
            f"Exhibiting complete outfit details: {wardrobe}, precise garment tailoring, crisp seams, fabric texture, uncropped hands at sides, legs, and complete footwear.\n\n"
            f"[MIDDLE PANEL - COMPLETE FULL-BODY BACK VIEW]: "
            f"Full-body shot showing the character completely from head to toe, with the top of the head and shoes fully visible inside the frame without any cropping. "
            f"Straight neutral back-facing pose showing complete rear hairstyle, head shape, back collar, shoulder construction, rear seams of {wardrobe}, rear waistband, skirt/trousers drape, legs, heels, and soles of shoes. "
            f"Scale, height, and body proportions strictly identical to the left panel.\n\n"
            f"[RIGHT PANEL - CLOSE-UP FACE PORTRAIT]: "
            f"Detailed close-up beauty portrait showing the complete head, face, neck, and upper collar of the exact same character. "
            f"{identity}, refined facial features, accurate eye color and shape, clear eyelashes, natural skin texture, serene neutral expression, front-facing eye contact with camera, sharp focus on eyes, hairline, and hair accessories.\n\n"
            f"[PRESENTATION & LIGHTING]: "
            f"Neutral light grey studio background in all three panels. "
            f"Soft studio product photography lighting, subtle grounded contact shadows under feet. "
            f"Even white balance, crisp garment edges, seamless studio reference look, no dramatic perspective distortion.\n\n"
            f"[PRESERVATION & CONSTRAINTS]: "
            f"Strictly maintain identical proportions, identity, and clothing across all panels. "
            f"The left panel represents the exact same character with identical body, skin tone, and costume. "
            f"Negative: lowres, bad anatomy, bad hands, text, error, extra limbs, cropped shoes, mannequin head, face on left panel, measurement lines, watermark, logo, ui elements, background scenery, furniture."
        )
        return prompt
    else:  # modeling-board
        prompt = (
            f"masterpiece, best quality, ultra-detailed, professional character design modeling board, "
            f"clean minimalist landscape layout on pure white background, 1girl, {tag}, {age} years old.\n\n"
            f"[LEFT MAIN AREA - THREE-VIEW FULL-BODY TURNAROUND]: "
            f"Three full-body standing figures in a clean row from head to toe without any cropping: "
            f"1. Front full-body standing pose. "
            f"2. Exact 90-degree left-side full-body standing pose in strict profile (no 3/4 angle, no torso twist). "
            f"3. Back full-body standing pose. "
            f"All three figures show complete head, face, {identity}, and {wardrobe}. "
            f"Natural standing poses with arms at sides, orthographic presentation, consistent eye-level scale.\n\n"
            f"[UPPER-RIGHT AREA - ONE DOMINANT FACIAL CLOSE-UP]: "
            f"One prominent large frontal face portrait of the same character. Sharp focus on eyes, lips, skin texture, hair parting, and expression matching the turnaround figures exactly.\n\n"
            f"[LOWER-RIGHT AREA - SIX DETAIL CLOSE-UPS GRID]: "
            f"Six clean square detail insets arranged in a balanced 2-by-3 grid: "
            f"1. Upper garment fabric weave and collar stitching detail. "
            f"2. Waistband, belt, or button construction detail. "
            f"3. Lower-body skirt or trouser textile texture. "
            f"4. Hand, cuff, or wrist accessory detail. "
            f"5. Extreme close-up of eye iris and eyelashes. "
            f"6. Full close-up pair of shoes showing complete soles, heels, and materials.\n\n"
            f"[PRESENTATION & LIGHTING]: "
            f"Pure white studio background, generous clean whitespace, soft grounded contact shadows under feet, uniform neutral studio illumination.\n\n"
            f"[PRESERVATION & CONSTRAINTS]: "
            f"Strictly maintain identical proportions, identity, and clothing across all views and detail insets. "
            f"Negative: lowres, bad anatomy, text, labels, measurement arrows, blueprint grid lines, watermark, logos, ui buttons, scenery."
        )
        return prompt


def check_comfy_status(host="127.0.0.1", port=8188):
    url = f"http://{host}:{port}/system_stats"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "FrostNova-VNArt/1.0"})
        with urllib.request.urlopen(req, timeout=2.0) as resp:
            if resp.status == 200:
                return True, json.loads(resp.read().decode("utf-8"))
    except Exception:
        pass
    return False, None


def generate_comfy_workflow_payload(prompt_text, width=832, height=1216, steps=30, cfg=7.0):
    """
    Standard SDXL / Illustrious prompt payload schema for ComfyUI API
    """
    return {
        "client_id": "frostnova_vn_generator",
        "prompt": {
            "3": {
                "inputs": {
                    "seed": 42,
                    "steps": steps,
                    "cfg": cfg,
                    "sampler_name": "euler_ancestral",
                    "scheduler": "karras",
                    "denoise": 1.0,
                    "model": ["4", 0],
                    "positive": ["6", 0],
                    "negative": ["7", 0],
                    "latent_image": ["5", 0]
                },
                "class_type": "KSampler"
            },
            "4": {
                "inputs": {
                    "ckpt_name": "Illustrious-XL.safetensors"
                },
                "class_type": "CheckpointLoaderSimple"
            },
            "5": {
                "inputs": {
                    "width": width,
                    "height": height,
                    "batch_size": 1
                },
                "class_type": "EmptyLatentImage"
            },
            "6": {
                "inputs": {
                    "text": prompt_text,
                    "clip": ["4", 1]
                },
                "class_type": "CLIPTextEncode"
            },
            "7": {
                "inputs": {
                    "text": NEGATIVE_BASE,
                    "clip": ["4", 1]
                },
                "class_type": "CLIPTextEncode"
            },
            "8": {
                "inputs": {
                    "samples": ["3", 0],
                    "vae": ["4", 2]
                },
                "class_type": "VAEDecode"
            },
            "9": {
                "inputs": {
                    "filename_prefix": "VN_Output",
                    "images": ["8", 0]
                },
                "class_type": "SaveImage"
            }
        }
    }


def main():
    parser = argparse.ArgumentParser(
        description="Visual Novel Art Generator & ComfyUI Pipeline (Inspired by claude-higgsfield-skill)"
    )
    parser.add_argument(
        "--mode",
        choices=["all", "sprites", "event_cgs", "motion_cgs", "character_sheets"],
        default="all",
        help="Category to generate (default: all)"
    )
    parser.add_argument(
        "--heroine",
        choices=["all", "noey", "pim", "rinda", "meena", "rhea"],
        default="all",
        help="Target heroine (default: all)"
    )
    parser.add_argument(
        "--out",
        default="generated_prompts",
        help="Output directory (default: generated_prompts)"
    )
    parser.add_argument(
        "--comfy-host",
        default="127.0.0.1",
        help="ComfyUI host (default: 127.0.0.1)"
    )
    parser.add_argument(
        "--comfy-port",
        type=int,
        default=8188,
        help="ComfyUI port (default: 8188)"
    )
    parser.add_argument(
        "--submit",
        action="store_true",
        help="Attempt direct submit to running ComfyUI server"
    )
    parser.add_argument(
        "--zip",
        action="store_true",
        help="Package all generated files into a zip file"
    )

    args = parser.parse_args()

    # Determine script root
    script_dir = Path(__file__).resolve().parent
    vn_root = script_dir.parent
    out_dir = vn_root / args.out
    out_dir.mkdir(parents=True, exist_ok=True)

    target_keys = (
        list(HEROINES.keys()) if args.heroine == "all" else [args.heroine]
    )

    items = []

    # 1. Collect Sprites
    if args.mode in ["all", "sprites"]:
        for h_key in target_keys:
            h = HEROINES[h_key]
            for exp_key, exp_desc in h["expressions"].items():
                prompt = build_sprite_prompt(h_key, exp_key, exp_desc)
                item_id = f"{h_key}_sprite_{exp_key}"
                items.append({
                    "id": item_id,
                    "category": "sprite",
                    "heroine": h_key,
                    "title": f"{h['name']} - Expression: {exp_key}",
                    "resolution": "832x1216 (Portrait)",
                    "target_model": "SDXL / Illustrious / Animagine",
                    "prompt": prompt,
                    "filename": f"{item_id}.txt"
                })

    # 2. Collect Event CGs
    if args.mode in ["all", "event_cgs"]:
        for h_key in target_keys:
            h = HEROINES[h_key]
            cg = h["event_cg"]
            item_id = f"{h_key}_event_cg"
            items.append({
                "id": item_id,
                "category": "event_cg",
                "heroine": h_key,
                "title": f"{h['name']} - Event CG: {cg['title']}",
                "resolution": "1344x768 (16:9 Cinematic)",
                "target_model": "SDXL / Illustrious / Pony",
                "prompt": cg["prompt"],
                "filename": f"{item_id}.txt"
            })

    # 3. Collect Motion CGs (LTX-Video 2.5)
    if args.mode in ["all", "motion_cgs"]:
        for h_key in target_keys:
            h = HEROINES[h_key]
            motion = h["motion_ltx"]
            item_id = f"{h_key}_motion_ltx"
            items.append({
                "id": item_id,
                "category": "motion_cg",
                "heroine": h_key,
                "title": f"{h['name']} - Motion CG: {motion['title']}",
                "resolution": "1280x720 (16:9 Video @ 24fps)",
                "target_model": "LTX-Video 2.5 Distilled GGUF",
                "prompt": motion["prompt"],
                "filename": f"{item_id}.txt"
            })

    # 4. Collect Character Sheets (3-Panel & Modeling Board per ddokkang2 standard)
    if args.mode in ["all", "character_sheets"]:
        for h_key in target_keys:
            h = HEROINES[h_key]
            # 3-Panel Reference Sheet
            prompt_3p = build_character_sheet_prompt(h_key, layout="3panel")
            item_id_3p = f"{h_key}_sheet_3panel"
            items.append({
                "id": item_id_3p,
                "category": "character_sheet",
                "heroine": h_key,
                "title": f"{h['name']} - 3-Panel Reference Sheet (Front Neck-to-toe / Back / Face)",
                "resolution": "1536x864 (16:9 Landscape)",
                "target_model": "SDXL / Illustrious / FLUX",
                "prompt": prompt_3p,
                "filename": f"{item_id_3p}.txt"
            })

            # Modeling Board Turnaround Sheet
            prompt_mb = build_character_sheet_prompt(h_key, layout="modeling_board")
            item_id_mb = f"{h_key}_sheet_modeling_board"
            items.append({
                "id": item_id_mb,
                "category": "character_sheet",
                "heroine": h_key,
                "title": f"{h['name']} - Character Design Modeling Board (3-View Turnaround + 6 Insets)",
                "resolution": "1792x1024 (Landscape Concept Art)",
                "target_model": "FLUX / SDXL / Pony",
                "prompt": prompt_mb,
                "filename": f"{item_id_mb}.txt"
            })

    # Write individual prompt files
    prompts_dir = out_dir / "prompts"
    prompts_dir.mkdir(exist_ok=True)

    for item in items:
        p_path = prompts_dir / item["filename"]
        with open(p_path, "w", encoding="utf-8") as f:
            f.write(f"# {item['title']}\n")
            f.write(f"# Resolution: {item['resolution']}\n")
            f.write(f"# Recommended Model: {item['target_model']}\n\n")
            f.write(item["prompt"])
            f.write("\n")

    # Write Manifest CSV
    manifest_path = out_dir / "manifest.csv"
    with open(manifest_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["id", "category", "heroine", "title", "resolution", "target_model", "file"])
        for item in items:
            writer.writerow([
                item["id"],
                item["category"],
                item["heroine"],
                item["title"],
                item["resolution"],
                item["target_model"],
                f"prompts/{item['filename']}"
            ])

    # Write Markdown Review Index
    index_path = out_dir / "INDEX.md"
    with open(index_path, "w", encoding="utf-8") as f:
        f.write("# 🎬 Visual Novel Art & Motion Prompt Catalog\n\n")
        f.write(f"> Generated **{len(items)}** production-grade prompts for Overtime Secrets.\n")
        f.write(f"> Ready for ComfyUI on Apple Silicon Mac M4 Pro.\n\n")
        f.write("| ID | Category | Heroine | Title | Resolution | Target Model |\n")
        f.write("|---|---|---|---|---|---|\n")
        for item in items:
            f.write(
                f"| `{item['id']}` | {item['category']} | {item['heroine']} | "
                f"{item['title']} | {item['resolution']} | {item['target_model']} |\n"
            )
        f.write("\n---\n\n## Prompt Details\n\n")
        for item in items:
            f.write(f"### 📌 `{item['id']}`: {item['title']}\n")
            f.write(f"- **Category:** `{item['category']}`\n")
            f.write(f"- **Model:** `{item['target_model']}`\n")
            f.write(f"- **Resolution:** `{item['resolution']}`\n\n")
            f.write("```text\n")
            f.write(item["prompt"] + "\n")
            f.write("```\n\n")

    # Generate ComfyUI API queue payload
    comfy_queue_path = out_dir / "comfy_queue.json"
    queue_payloads = []
    for item in items:
        if item["category"] in ["sprite", "event_cg", "character_sheet"]:
            if item["category"] == "sprite":
                w, h = (832, 1216)
            elif item["category"] == "event_cg":
                w, h = (1344, 768)
            else:  # character_sheet
                w, h = (1536, 864)
            payload = generate_comfy_workflow_payload(item["prompt"], width=w, height=h)
            payload["_vn_item_id"] = item["id"]
            queue_payloads.append(payload)

    with open(comfy_queue_path, "w", encoding="utf-8") as f:
        json.dump(queue_payloads, f, indent=2, ensure_ascii=False)

    print(f"✨ Successfully generated {len(items)} prompts!")
    print(f"📁 Prompts written to: {prompts_dir}")
    print(f"📄 Manifest: {manifest_path}")
    print(f"📑 Catalog Index: {index_path}")
    print(f"⚡ ComfyUI Queue Payload: {comfy_queue_path}")

    # Check ComfyUI server status
    is_running, stats = check_comfy_status(args.comfy_host, args.comfy_port)
    if is_running:
        print(f"\n🟢 ComfyUI Server is ACTIVE at http://{args.comfy_host}:{args.comfy_port}!")
        if args.submit:
            print("🚀 Submitting payloads to ComfyUI queue...")
            submitted = 0
            for p in queue_payloads:
                try:
                    req_data = json.dumps({"prompt": p["prompt"]}).encode("utf-8")
                    req = urllib.request.Request(
                        f"http://{args.comfy_host}:{args.comfy_port}/prompt",
                        data=req_data,
                        headers={"Content-Type": "application/json"}
                    )
                    with urllib.request.urlopen(req, timeout=5.0) as resp:
                        if resp.status == 200:
                            submitted += 1
                except Exception as e:
                    print(f"  ❌ Error submitting {p.get('_vn_item_id')}: {e}")
            print(f"✅ Submitted {submitted}/{len(queue_payloads)} jobs to ComfyUI queue.")
        else:
            print("💡 Tip: Use '--submit' to push these prompts directly into ComfyUI queue.")
    else:
        print(f"\n⚪ ComfyUI server is currently idle/offline at http://{args.comfy_host}:{args.comfy_port}.")
        print("💡 When you start ComfyUI (`python main.py`), you can execute these workflows directly.")

    if args.zip:
        zip_path = out_dir / "vn_art_prompts.zip"
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for root, _, files in os.walk(out_dir):
                for file in files:
                    fp = Path(root) / file
                    if fp.name != "vn_art_prompts.zip":
                        arcname = fp.relative_to(out_dir)
                        zf.write(fp, arcname)
        print(f"📦 Zipped package created at: {zip_path}")


if __name__ == "__main__":
    main()
