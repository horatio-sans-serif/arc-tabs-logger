#!/bin/bash
# log-arc-tabs.sh — Collect open Arc tab URLs into a deduplicated file.
# Designed to be run by launchd every minute.
# Compatible with macOS system Bash 3.2.

set -euo pipefail

DATA_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/arc-tabs"
TABS_FILE="$DATA_DIR/tabs-visited.txt"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# launchd doesn't source shell profiles, so we need explicit paths.
for candidate in \
    "$HOME/.nvm/versions/node/v24.12.0/bin/node" \
    "/opt/homebrew/bin/node" \
    "/usr/local/bin/node"; do
    if [ -x "$candidate" ]; then
        NODE="$candidate"
        break
    fi
done

if [ -z "${NODE:-}" ]; then
    logger -t arc-tabs-logger "ERROR: node not found"
    exit 1
fi

mkdir -p "$DATA_DIR"
touch "$TABS_FILE"

# Get current open tab URLs (silently exit if Arc isn't running or errors)
urls=$("$NODE" "$SCRIPT_DIR/arc_tabs.js" --urls-only 2>/dev/null) || exit 0

[ -z "$urls" ] && exit 0

# Append only URLs not already in the file.
# grep -Fxq does fixed-string, whole-line matching — perfect for exact URL dedup.
new_count=0
while IFS= read -r url; do
    [ -z "$url" ] && continue
    if ! grep -Fxq "$url" "$TABS_FILE"; then
        echo "$url" >> "$TABS_FILE"
        new_count=$((new_count + 1))
    fi
done <<< "$urls"

if [ "$new_count" -gt 0 ]; then
    logger -t arc-tabs-logger "Added $new_count new URL(s)"
fi
