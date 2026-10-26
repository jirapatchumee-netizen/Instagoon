#!/bin/bash
set -euo pipefail

COMFYUI_DIR="${COMFYUI_DIR:-$HOME/ComfyUI}"
MODEL_ROOT="$COMFYUI_DIR/models"
BASE_URL="https://huggingface.co/Comfy-Org/Qwen-Image-2.1/resolve/0217efd1d9c9452e84f6448903d6e21bfa171ffd"
LOCK_DIR="$MODEL_ROOT/.qwen21-t2i-download.lock"

fail() {
    printf '\nERROR: %s\n' "$*" >&2
    exit 1
}

for program in curl shasum stat df awk; do
    command -v "$program" >/dev/null || fail "Missing command: $program"
done
[[ -d "$COMFYUI_DIR" ]] || fail "ComfyUI folder not found: $COMFYUI_DIR"
mkdir -p "$MODEL_ROOT"
mkdir "$LOCK_DIR" 2>/dev/null || fail "Another download may be running. Lock: $LOCK_DIR. If no download is running, remove this empty lock folder and retry."
trap 'rmdir "$LOCK_DIR"' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

models() {
    cat <<'MODELS'
diffusion_models/qwen_image_2.1_bf16.safetensors 14230280616 89f4158d066cc33906a199fca85634f766892dd78f49b6698dabf187ac86c4bc
text_encoders/qwen3vl_8b_bf16.safetensors 17534334616 68bdc82bc1b66851162ae656225e7e2068166b603db19bd5d5a3b90eb12669a9
vae/qwen_image_2.1_vae_bf16.safetensors 675509688 bb21f7473051e1ac368515dd3f2e15cd44d7a11748ee8823e1ddca3e4876b7c9
MODELS
}

verify() {
    local file="$1" expected_size="$2" expected_hash="$3" actual_hash
    [[ "$(stat -f '%z' "$file")" == "$expected_size" ]] || return 1
    actual_hash="$(shasum -a 256 "$file")"
    [[ "${actual_hash%% *}" == "$expected_hash" ]]
}

printf 'Qwen Image 2.1 — normal T2I, BF16\n'
printf 'Destination: %s\n' "$MODEL_ROOT"
printf 'Three files, 32.4 GB total. Ctrl+C pauses; run again to resume.\n'
printf 'Progress below includes percentage, bytes, speed and time estimates.\n'

index=0
while read -r relative expected_size expected_hash; do
    index=$((index + 1))
    destination="$MODEL_ROOT/$relative"
    partial="$destination.part"
    printf '\n[%s/3] %s\n' "$index" "$relative"
    mkdir -p "$(dirname "$destination")"

    if [[ -e "$destination" ]]; then
        printf 'Checking existing file SHA-256; this can take a while...\n'
        if verify "$destination" "$expected_size" "$expected_hash"; then
            printf 'Verified; skipping download.\n'
            continue
        fi
        fail "Existing file failed verification; preserved without overwriting: $destination"
    fi

    current_size=0
    if [[ -e "$partial" ]]; then
        current_size="$(stat -f '%z' "$partial")"
    fi
    [[ "$current_size" -le "$expected_size" ]] || fail "Partial file is larger than expected; preserved: $partial"
    remaining=$((expected_size - current_size))
    available="$(df -Pk "$MODEL_ROOT" | awk 'NR == 2 {printf "%.0f", $4 * 1024}')"
    [[ "$available" =~ ^[0-9]+$ ]] || fail 'Could not determine available disk space.'
    [[ "$available" -ge "$((remaining + 1073741824))" ]] || fail "Not enough disk space for this file plus 1 GiB reserve. Required additional bytes: $remaining"

    if [[ "$remaining" -gt 0 ]]; then
        printf 'Downloading; resuming from %s bytes if present...\n' "$current_size"
        if ! curl --location --fail --show-error --continue-at - \
            --retry 5 --retry-delay 3 --connect-timeout 30 \
            --output "$partial" "$BASE_URL/$relative"; then
            fail "Download interrupted or rejected. Partial file preserved; rerun this script to resume: $partial"
        fi
    fi

    printf 'Checking size and SHA-256; this can take a while...\n'
    verify "$partial" "$expected_size" "$expected_hash" || fail "Verification failed. Partial file preserved: $partial. Move it aside before retrying if its size is already complete."
    [[ ! -e "$destination" ]] || fail "Destination appeared during download; preserved partial: $partial"
    mv -n "$partial" "$destination"
    [[ ! -e "$partial" ]] || fail "Could not finalize file; preserved: $partial"
    printf 'OK: %s\n' "$destination"
done < <(models)

printf '\nDONE: all three normal T2I model files are verified.\n'
printf 'No Turbo, LoRA or prompt-enhancement model was downloaded.\n'
printf 'Select the three BF16 filenames in your working-copy workflow and keep refine_prompt OFF.\n'
printf 'This script does not update ComfyUI or start generation. Qwen 2.1 nodes must be available before running the workflow.\n'
