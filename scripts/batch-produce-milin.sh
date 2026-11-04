#!/bin/bash
# Frostnova Production Launcher for Milin Assets
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIPELINE_SCRIPT="$SCRIPT_DIR/../../instagoon-workbench/art-pipeline/scripts/batch_produce_milin.py"

python3 "$PIPELINE_SCRIPT" "$@"
