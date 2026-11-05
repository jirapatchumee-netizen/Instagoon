#!/bin/bash
# Frostnova Production Launcher for Milin Assets (Golden Master Standard v4.2)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIPELINE_SCRIPT="$SCRIPT_DIR/../../scripts/batch_produce_all_milin.py"

python3 "$PIPELINE_SCRIPT" "$@"
