#!/bin/bash
set -euo pipefail
umask 077

if [ "$#" -ne 4 ]; then
  printf '%s\n' 'Usage: backup.sh D1_DATABASE RCLONE_R2_SOURCE OUTPUT_DIRECTORY RECIPIENT_CERTIFICATE' >&2
  exit 2
fi

database=$1
media_source=$2
output_dir=$3
certificate=$4

for tool in wrangler rclone openssl tar; do
  command -v "$tool" >/dev/null || { printf 'Missing command: %s\n' "$tool" >&2; exit 1; }
done
[ -f "$certificate" ] || { printf '%s\n' 'Recipient certificate does not exist.' >&2; exit 1; }
[ -d "$output_dir" ] || { printf '%s\n' 'Output directory must already exist.' >&2; exit 1; }
repo_root=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
output_dir=$(cd "$output_dir" && pwd -P)
case "$output_dir/" in
  "$repo_root/"*) printf '%s\n' 'Backup destination must be outside the repository.' >&2; exit 1 ;;
esac

work_dir=$(mktemp -d "${TMPDIR:-/tmp}/froststory-backup.XXXXXXXX")
trap 'rm -rf "$work_dir"' EXIT
mkdir "$work_dir/media"
wrangler d1 export "$database" --remote --output "$work_dir/database.sql"
rclone copy "$media_source" "$work_dir/media"
archive="froststory-$(date -u +%Y%m%dT%H%M%SZ)-$(basename "$work_dir").tar.cms"
temporary="$output_dir/.$archive.tmp"
trap 'rm -rf "$work_dir"; rm -f "$temporary"' EXIT

tar -C "$work_dir" -cf - database.sql media | openssl cms -encrypt -binary -aes256 -outform DER -out "$temporary" "$certificate"
chmod 600 "$temporary"
mv "$temporary" "$output_dir/$archive"
printf 'Encrypted backup created: %s\n' "$output_dir/$archive"
