# Qwen 2.1 T2I retired — 2026-10-26

Owner requested retirement and disk cleanup, citing commercial licensing as the reason. This records the owner's decision, not an independent legal assessment.

Removed the three downloaded Qwen 2.1 weights (32.440 GB logical), disabled the managed Qwen profile, and removed the duplicate scratch validation worktree. Its 17,049 non-bytecode dependency files matched the retained managed core. Observed filesystem free space increased about 32.70 GB; APFS and concurrent activity can affect the free-space delta.

The downloader and its fixture tests are archived here for historical evidence. The profile copy is named `retired-render-profile.json` and is not an active installation profile. Do not restore or run these as part of a commercial pipeline without a new owner decision.

Generated test images, prompts, workflow JSON, receipts and RAM reports remain in art/outputs as research history; this cleanup does not approve those assets for commercial publication. Original source references and game assets are unchanged.

Retained reusable components: FrostNova runtime/ResourceGate, primary ComfyUI, existing Python environment, and the managed Comfy core with runtime dependencies. Z-Image-Turbo has not been installed or configured by this cleanup.

Exact paths, sizes, actions and post-removal checks are in cleanup-receipt.json. The installed tool catalog no longer advertises render_image while the profile is absent.
