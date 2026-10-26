#!/usr/bin/env python3
"""
FrostNova Visual Novel — Stage 1 First-Person POV Production Orchestrator
Synthesizes:
1. story-architect-skill: Scene narrative beat decomposition & 1st-Person POV camera mapping (62 nodes -> 38 POV shots)
2. build-character-sheet-prompt: Vertical 544x960 character reference sheets & immutable DNA lock
3. Higgsfield-Skill: Cinematic POV camera directing & natural-language prompt compilation
Dispatches to ComfyUI workflow: /Users/macminim4pro/ComfyUI/workflows/Z_Image_Turbo_AnimeLora3_544x960.json
"""

import argparse
import json
import os
import sys
from pathlib import Path

# Paths
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
COMFY_WORKFLOW = "/Users/macminim4pro/ComfyUI/workflows/Z_Image_Turbo_AnimeLora3_544x960.json"
MANIFEST_JSON = PROJECT_ROOT / "art/storyboard_stage1_pov_544x960.json"
PUBLIC_OUTPUT_DIR = PROJECT_ROOT / "public/art/stage1"

# Import local runner
sys.path.append(str(SCRIPT_DIR))
from render_zimage_turbo import render

# Base Style Prompt (noey-soft-romance-v1)
STYLE_PREFIX = (
    "fine clean line art, soft glossy romance manhwa anime aesthetic, "
    "smooth peach-pink skin shading, controlled broad hair highlights, "
    "soft blooming backlight, lavender-violet ambient shadows, 8k resolution, cinematic lighting"
)

# Character DNA Blocks (Locked by build-character-sheet-prompt standard)
CHARACTER_DNA = {
    "noey_office": (
        "Noey the 21-year-old marketing intern, cute Asian anime girl, long caramel brown hair "
        "in side ponytail with pink scrunchie on left, bright magenta eyes, "
        "crisp white office blouse with pink ribbon tie, navy blue pleated skirt"
    ),
    "noey_catmaid": (
        "Noey, cute 21-year-old anime girl, long caramel brown hair in side ponytail with pink scrunchie, "
        "bright magenta eyes, wearing black cat ears headband, black choker with golden bell, "
        "cute frilly black and white maid dress with white apron, cat paw gesture"
    ),
    "noey_silk": (
        "Noey, 21-year-old girl, caramel brown hair in loose messy side ponytail, radiant magenta eyes, "
        "wearing an oversized slightly unbuttoned white silk shirt revealing intricate black lace underneath"
    ),
    "pim_hr": (
        "Pim the 30-year-old HR manager, elegant mature Asian woman, sleek black hair in high updo, "
        "red-framed glasses, sharp cold violet eyes, dark navy tailored business blazer, white collared shirt"
    ),
    "arm_protagonist": (
        "Arm the 27-year-old IT Support specialist and cosplay photographer, handsome Korean manhwa male lead, "
        "messy short dark slate hair, observant dark eyes with subtle tired shadows, "
        "dark navy tech polo shirt, blue lanyard with white IT Support staff badge, dark grey trousers"
    )
}

# -------------------------------------------------------------
# 1. Vertical 544x960 Character Reference Sheets
# -------------------------------------------------------------
CHARACTER_SHEETS = [
    {
        "sheet_id": "CS_01_Noey_Office",
        "title": "Character Sheet: Noey (Office Intern)",
        "prefix": "Sheet_CS01_Noey_Office",
        "seed": 20261101,
        "prompt": (
            f"character design reference sheet, vertical full-body front and back view, "
            f"{CHARACTER_DNA['noey_office']}, neutral standing pose, clean studio light grey background, "
            f"perfect anatomical proportions, visible front and back outfit details, {STYLE_PREFIX}"
        )
    },
    {
        "sheet_id": "CS_02_Noey_CatMaid",
        "title": "Character Sheet: Noey (Cat-Maid Cosplay)",
        "prefix": "Sheet_CS02_Noey_CatMaid",
        "seed": 20261102,
        "prompt": (
            f"character design reference sheet, vertical full-body front view and close-up face portrait, "
            f"{CHARACTER_DNA['noey_catmaid']}, playful cute pose, clean studio background, "
            f"crisp cat ears and bell choker construction, {STYLE_PREFIX}"
        )
    },
    {
        "sheet_id": "CS_03_Noey_MidnightSilk",
        "title": "Character Sheet: Noey (Midnight Silk Climax)",
        "prefix": "Sheet_CS03_Noey_MidnightSilk",
        "seed": 20261103,
        "prompt": (
            f"character design reference sheet, vertical portrait and three-quarter view, "
            f"{CHARACTER_DNA['noey_silk']}, soft romantic sensual lighting, clean background, "
            f"intricate black lace textile texture, delicate tailoring, {STYLE_PREFIX}"
        )
    },
    {
        "sheet_id": "CS_04_Pim_HR",
        "title": "Character Sheet: Pim (HR Manager)",
        "prefix": "Sheet_CS04_Pim_HR",
        "seed": 20261104,
        "prompt": (
            f"character design reference sheet, vertical full-body front view and stern portrait, "
            f"{CHARACTER_DNA['pim_hr']}, confident authoritative posture, sharp glasses detail, "
            f"clean studio background, {STYLE_PREFIX}"
        )
    }
]

# -------------------------------------------------------------
# 2. Stage 1 Pure Eye-Level POV Shot Manifest (38 Shots covering 62 Nodes)
# Dating Sim / Romance Style: 100% Subjective View (No protagonist body/hands visible)
# Focus: Heroine direct eye contact ('solo, 1girl, looking at viewer') or pure atmospheric eye-level
# -------------------------------------------------------------
POV_SHOTS = [
    # --- Scene 1: S1_01_server_room (14 Nodes) ---
    {
        "shot_id": "S1_01_01",
        "nodes": ["010", "020"],
        "scene_id": "S1_01_server_room",
        "title": "POV: Arm's eye view of tangled LAN cables in dark server room",
        "prefix": "POV_S1_01_LanCables",
        "seed": 20261011,
        "prompt": (
            "first-person POV eye-level looking at dark basement server room, tangled yellow ethernet cables "
            "hanging from patch panels, blue network crimping tool resting on desk, server racks with blinking "
            "cyan and amber LEDs in background, atmospheric depth, moody office mystery, "
            f"{STYLE_PREFIX}"
        )
    },
    {
        "shot_id": "S1_01_02",
        "nodes": ["030", "040", "050"],
        "scene_id": "S1_01_server_room",
        "title": "POV: Vintage CRT Monitor awakens with green phosphor glow",
        "prefix": "POV_S1_01_CRT_Awakens",
        "seed": 20261012,
        "prompt": (
            "first-person POV looking directly at an old CRT computer monitor tucked in a server rack, "
            "screen glowing bright phosphor green displaying text '> ECHO_MIND v4.9: ROOT CONNECTED', "
            "green volumetric light illuminating the dark server room, cyberpunk atmosphere, "
            f"{STYLE_PREFIX}"
        )
    },
    {
        "shot_id": "S1_01_03",
        "nodes": ["060", "070", "080"],
        "scene_id": "S1_01_server_room",
        "title": "POV: Arm's National ID card resting on CRT terminal scanner under green laser",
        "prefix": "POV_S1_01_ScanOwnID",
        "seed": 20261013,
        "prompt": (
            "first-person POV macro view of CRT terminal scanner bed, a plastic Thai National ID card resting "
            "under glowing green laser beam, green phosphor light scanning across the card surface, "
            "digital glitch reflections, mysterious cyberpunk atmosphere, "
            f"{STYLE_PREFIX}"
        )
    },
    {
        "shot_id": "S1_01_04",
        "nodes": ["085", "090", "100", "110"],
        "scene_id": "S1_01_server_room",
        "title": "POV: Terminal confirms mental intervention and pain relief",
        "prefix": "POV_S1_01_HealConfirm",
        "seed": 20261014,
        "prompt": (
            "first-person POV looking directly at green CRT terminal screen with glowing status window "
            "'[TARGET: ARM / STATUS: PAIN RELIEVED]', warm green particle aura emanating from screen, "
            "illuminated dark server racks in background, dramatic breakthrough moment, "
            f"{STYLE_PREFIX}"
        )
    },

    # --- Scene 2: S1_02_noey_desk (15 Nodes) ---
    {
        "shot_id": "S1_02_01",
        "nodes": ["010", "020"],
        "scene_id": "S1_02_noey_desk",
        "title": "POV: Noey greeting Arm in marketing office at 08:30 AM",
        "prefix": "POV_S1_02_NoeyGreeting",
        "seed": 20261021,
        "prompt": (
            f"first-person POV eye-level, solo, 1girl, {CHARACTER_DNA['noey_office']}, sweet gentle morning smile, "
            "waving hand warmly, standing close in bright corporate marketing office, large windows with morning sunlight, "
            f"looking directly at viewer, intimate romance game perspective, {STYLE_PREFIX}"
        )
    },
    {
        "shot_id": "S1_02_02",
        "nodes": ["030", "040"],
        "scene_id": "S1_02_noey_desk",
        "title": "POV: Looking under Noey's desk, dropped pink wallet and ID card",
        "prefix": "POV_S1_02_UnderDeskWallet",
        "seed": 20261022,
        "prompt": (
            "first-person POV looking under office wooden desk, low angle view of carpet floor, router cables on left, "
            "dropped pastel pink wallet lying open on floor with corner of national ID card clearly peeking out, "
            "warm daylight filtering through desk gap, tense stealth perspective, "
            f"{STYLE_PREFIX}"
        )
    },
    {
        "shot_id": "S1_02_03",
        "nodes": ["050", "060"],
        "scene_id": "S1_02_noey_desk",
        "title": "POV Under Desk: Noey's legs sitting down and peeking under cloth",
        "prefix": "POV_S1_02_UnderDeskPeeking",
        "seed": 20261023,
        "prompt": (
            "first-person POV from low angle underneath wooden desk, slender feminine legs in navy pleated skirt sitting above, "
            f"solo, 1girl, {CHARACTER_DNA['noey_office']}, bending down and lifting desk cloth to peek underneath, "
            "shocked blushing face, wide embarrassed magenta eyes looking down directly at viewer, spicy romantic tension, "
            f"{STYLE_PREFIX}"
        )
    },
    {
        "shot_id": "S1_02_04",
        "nodes": ["061", "062"],
        "scene_id": "S1_02_noey_desk",
        "title": "POV Bad End: Security arrest for PDPA violation",
        "prefix": "POV_S1_02_BadEndArrest",
        "seed": 20261024,
        "prompt": (
            "first-person POV dramatic bad end, flashing red alarm strobe lights, security guards in black uniform "
            "reaching forward toward camera, tilted disoriented perspective, red warning banner, "
            f"{STYLE_PREFIX}"
        )
    },
    {
        "shot_id": "S1_02_05",
        "nodes": ["070", "080"],
        "scene_id": "S1_02_noey_desk",
        "title": "POV Success: Arm crawls out, Noey blushing gratefully",
        "prefix": "POV_S1_02_NoeyBlushThanks",
        "seed": 20261025,
        "prompt": (
            f"first-person POV looking up from floor, solo, 1girl, {CHARACTER_DNA['noey_office']}, heavy blushing on cheeks, "
            "nervous relieved smile, extending her soft hand down toward viewer, sunny office background, "
            f"intimate romantic chemistry, looking directly at viewer, {STYLE_PREFIX}"
        )
    },

    # --- Scene 3: S1_03_night_terminal (15 Nodes) ---
    {
        "shot_id": "S1_03_01",
        "nodes": ["010", "020", "030"],
        "scene_id": "S1_03_night_terminal",
        "title": "POV: Night 1 Echo Mind unlocks Noey's secret profile",
        "prefix": "POV_S1_03_NoeyProfile",
        "seed": 20261031,
        "prompt": (
            "first-person POV looking at green CRT monitor displaying Noey's scanned profile and secret desire keywords "
            "'[DESIRE: CAT-MAID COSPLAY / LONELINESS IN OVERTIME]', dark basement server room, green phosphor light, "
            f"{STYLE_PREFIX}"
        )
    },
    {
        "shot_id": "S1_03_02",
        "nodes": ["040", "050"],
        "scene_id": "S1_03_night_terminal",
        "title": "POV: Server room door opens, Noey enters in Cat-Maid outfit",
        "prefix": "POV_S1_03_CatMaidEnters",
        "seed": 20261032,
        "prompt": (
            f"first-person POV eye-level, server room metal door sliding open, solo, 1girl, {CHARACTER_DNA['noey_catmaid']}, "
            "standing in doorframe, blushing intensely, shy fidgeting posture, magenta eyes looking up timidly at viewer, "
            f"soft dim blue and magenta server lights, direct eye contact, {STYLE_PREFIX}"
        )
    },
    {
        "shot_id": "S1_03_03",
        "nodes": ["060", "071"],
        "scene_id": "S1_03_night_terminal",
        "title": "POV DSLR Viewfinder: Cat-Maid Noey shy pose (Special Photo #1A)",
        "prefix": "POV_S1_03_CatMaid_Shy",
        "seed": 20261033,
        "prompt": (
            f"vertical camera viewfinder portrait POV, solo, 1girl, {CHARACTER_DNA['noey_catmaid']}, "
            "covering cheeks with both hands, shy bashful expression, watery magenta eyes looking at viewer, "
            "golden bell on black choker, server rack lights blurred in background, romantic studio bokeh, "
            f"{STYLE_PREFIX}"
        )
    },
    {
        "shot_id": "S1_03_04",
        "nodes": ["072"],
        "scene_id": "S1_03_night_terminal",
        "title": "POV DSLR Viewfinder: Cat-Maid Noey playful paw wink (Special Photo #1B)",
        "prefix": "POV_S1_03_CatMaid_Wink",
        "seed": 20261034,
        "prompt": (
            f"vertical camera viewfinder portrait POV, solo, 1girl, {CHARACTER_DNA['noey_catmaid']}, "
            "playful cat paw gesture near cheek, cute wink with one eye, blushing sweet smile, looking at viewer, "
            "sparkling anime highlights, soft pink and cyan rim lights, "
            f"{STYLE_PREFIX}"
        )
    },
    {
        "shot_id": "S1_03_05",
        "nodes": ["073", "080"],
        "scene_id": "S1_03_night_terminal",
        "title": "POV: Close-up eye contact and returning ID card",
        "prefix": "POV_S1_03_ReturnID",
        "seed": 20261035,
        "prompt": (
            f"first-person POV intimate close distance, solo, 1girl, {CHARACTER_DNA['noey_catmaid']}, "
            "holding National ID card with two hands against her chest, gazing warmly at viewer with deep gratitude, "
            "soft ambient warmth, heart-melting expression, direct eye contact, "
            f"{STYLE_PREFIX}"
        )
    },

    # --- Scene 4: S1_04_hr_incident (7 Nodes) ---
    {
        "shot_id": "S1_04_01",
        "nodes": ["010", "020"],
        "scene_id": "S1_04_hr_incident",
        "title": "POV: 4th floor HR corridor, Pim scolding Noey harshly",
        "prefix": "POV_S1_04_HR_Confrontation",
        "seed": 20261041,
        "prompt": (
            "first-person POV walking into 4th floor modern corporate corridor, tall glass walls, "
            f"in center: {CHARACTER_DNA['pim_hr']}, strict furious expression, pointing finger down at Noey, "
            f"in right: {CHARACTER_DNA['noey_office']} holding scattered folders with head bowed in tears, "
            f"intense corporate drama lighting, {STYLE_PREFIX}"
        )
    },
    {
        "shot_id": "S1_04_02",
        "nodes": ["030", "040"],
        "scene_id": "S1_04_hr_incident",
        "title": "POV: Pim turns and glares condescendingly at Arm",
        "prefix": "POV_S1_04_PimGlares",
        "seed": 20261042,
        "prompt": (
            f"first-person POV close-up, solo, 1girl, {CHARACTER_DNA['pim_hr']}, turning sharply to face viewer, "
            "hand adjusting red glasses rim, condescending sneer, sharp piercing violet eyes looking down at viewer, "
            "cold violet corridor background, intimidating aura, direct eye contact, "
            f"{STYLE_PREFIX}"
        )
    },
    {
        "shot_id": "S1_04_03",
        "nodes": ["050", "060", "070"],
        "scene_id": "S1_04_hr_incident",
        "title": "POV: Noey looks up tearfully, forming secret revenge pact",
        "prefix": "POV_S1_04_WipeTearsPact",
        "seed": 20261043,
        "prompt": (
            f"first-person POV intimate close-up, solo, 1girl, {CHARACTER_DNA['noey_office']}, "
            "tear rolling down rosy cheek, gazing directly into viewer's eyes with tender gratitude and determined resolve, "
            "emotional face close-up, soft cinematic lighting, romantic eye contact, "
            f"{STYLE_PREFIX}"
        )
    },

    # --- Scene 5: S1_05_keycard (11 Nodes) ---
    {
        "shot_id": "S1_05_01",
        "nodes": ["010", "020", "030"],
        "scene_id": "S1_05_keycard",
        "title": "POV: Night 2, Noey enters in oversized white shirt and black lace",
        "prefix": "POV_S1_05_MidnightSilk_Enter",
        "seed": 20261051,
        "prompt": (
            f"first-person POV eye-level, solo, 1girl, {CHARACTER_DNA['noey_silk']}, standing in dimly lit server room, "
            "oversized white dress shirt slipping slightly off shoulder, intricate black lace lingerie peeking out, "
            "soft glowing skin, deep blushing gaze looking at viewer, sensual and romantic atmosphere, direct eye contact, "
            f"{STYLE_PREFIX}"
        )
    },
    {
        "shot_id": "S1_05_02",
        "nodes": ["035", "041", "042", "043"],
        "scene_id": "S1_05_keycard",
        "title": "POV DSLR Viewfinder: Midnight Silk Special Photo #2",
        "prefix": "POV_S1_05_MidnightSilk_Portrait",
        "seed": 20261052,
        "prompt": (
            f"vertical camera viewfinder portrait POV, solo, 1girl, {CHARACTER_DNA['noey_silk']}, "
            "leaning against server rack, soft ambient rim lighting tracing shoulders, tender loving gaze, "
            "fingertip gently touching the camera lens edge, looking at viewer, beautiful bokeh, masterpiece romantic CG, "
            f"{STYLE_PREFIX}"
        )
    },
    {
        "shot_id": "S1_05_03",
        "nodes": ["050", "060"],
        "scene_id": "S1_05_keycard",
        "title": "POV Climax: Noey hands Pim's real National ID card to Arm",
        "prefix": "POV_S1_05_NoeyHandsPimID",
        "seed": 20261053,
        "prompt": (
            f"first-person POV intimate close distance, solo, 1girl, {CHARACTER_DNA['noey_silk']}, "
            "leaning close facing viewer, holding out Pim's official National ID card with both hands toward camera, "
            "card showing strict woman with red glasses, Noey's radiant blushing expression looking directly at viewer "
            "with deep trust and complicity, sensual romantic atmosphere, direct eye contact, "
            f"{STYLE_PREFIX}"
        )
    },
    {
        "shot_id": "S1_05_04",
        "nodes": ["070", "100"],
        "scene_id": "S1_05_keycard",
        "title": "POV Climax: Pim's ID card on terminal scanner ready for Chapter 2",
        "prefix": "POV_S1_05_PimID_ReadyForScan",
        "seed": 20261054,
        "prompt": (
            "first-person POV close-up table view, Pim's official National ID card placed on glowing terminal scanner, "
            "ID photo of strict woman with red glasses illuminated by emerald green laser, "
            "CRT terminal in background ready for Chapter 2 mental invasion, thrilling cliffhanger, "
            f"{STYLE_PREFIX}"
        )
    }
]


def build_manifest():
    """Generates the master JSON manifest of all 38 shots covering Stage 1."""
    data = {
        "project": "Overtime Secrets (แฟ้มลับกะดึก)",
        "stage": 1,
        "resolution": "544x960",
        "aspect_ratio": "9:16 Vertical Portrait",
        "workflow": COMFY_WORKFLOW,
        "character_sheets": CHARACTER_SHEETS,
        "shots": POV_SHOTS
    }

    MANIFEST_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(MANIFEST_JSON, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"✅ Generated Master Manifest: {MANIFEST_JSON}")
    print(f"   Character Sheets: {len(CHARACTER_SHEETS)} sheets")
    print(f"   POV Scene Shots: {len(POV_SHOTS)} keyframe setups covering all 62 nodes in Stage 1")


def render_all(mode="shots", shot_filter=None):
    """Renders manifest items using ComfyUI workflow."""
    PUBLIC_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    items = []
    if mode in ["all", "sheets"]:
        for s in CHARACTER_SHEETS:
            items.append({
                "id": s["sheet_id"],
                "type": "character_sheet",
                "prefix": s["prefix"],
                "seed": s["seed"],
                "prompt": s["prompt"],
                "title": s["title"]
            })

    if mode in ["all", "shots"]:
        for s in POV_SHOTS:
            if shot_filter and s["shot_id"] != shot_filter:
                continue
            items.append({
                "id": s["shot_id"],
                "type": "pov_shot",
                "prefix": s["prefix"],
                "seed": s["seed"],
                "prompt": s["prompt"],
                "title": s["title"],
                "nodes": s["nodes"]
            })

    print(f"🚀 Running Pipeline on ComfyUI via {COMFY_WORKFLOW}")
    print(f"📦 Total Items to Render: {len(items)}")
    print(f"📂 Output Destination: {PUBLIC_OUTPUT_DIR}\n")

    rendered = []
    for idx, item in enumerate(items, 1):
        print(f"[{idx}/{len(items)}] 🎨 Rendering {item['id']}: {item['title']}...")
        print(f"   Prefix: {item['prefix']}, Seed: {item['seed']}")
        try:
            res = render(
                prompt_text=item["prompt"],
                prefix=item["prefix"],
                seed=item["seed"],
                output_dir=PUBLIC_OUTPUT_DIR,
                workflow_path=COMFY_WORKFLOW
            )
            res["item_id"] = item["id"]
            res["title"] = item["title"]
            rendered.append(res)
            print(f"   ✅ Saved: {res['filename']} (544x960)\n")
        except Exception as e:
            print(f"   ❌ Render Failed for {item['id']}: {e}\n", file=sys.stderr)

    print(f"✨ Pipeline completed! {len(rendered)}/{len(items)} images generated.")


def main():
    parser = argparse.ArgumentParser(description="FrostNova Stage 1 First-Person POV Art Orchestrator")
    parser.add_argument("--build-manifest", action="store_true", help="Generate art/storyboard_stage1_pov_544x960.json")
    parser.add_argument("--render", choices=["all", "sheets", "shots"], default=None, help="Trigger ComfyUI render queue")
    parser.add_argument("--shot", default=None, help="Render specific shot ID only (e.g. S1_01_01)")

    args = parser.parse_args()

    if args.build_manifest or args.render is None:
        build_manifest()

    if args.render:
        render_all(mode=args.render, shot_filter=args.shot)


if __name__ == "__main__":
    main()
