#!/bin/bash

# Usage:
#   ./better_anchor_grep.sh paths.example.js [--anchor <name>] [--not-anchor] [--pretty]

anchor_file="$1"
shift

mode="anchor"
pretty=0
specific_anchor=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --not-anchor) mode="not-anchor"; shift ;;
        --anchor) specific_anchor="$2"; shift 2 ;;
        --pretty) pretty=1; shift ;;
        *) echo "Unknown option: $1" >&2; exit 1 ;;
    esac
done

# Extract anchors from the export block
if [[ -n "$specific_anchor" ]]; then
    anchors="$specific_anchor"
else
    anchors=$(awk '/module\.exports *= *{/,/};/ {
        if ($1 ~ /^[a-zA-Z_][a-zA-Z0-9_]*,?$/ && $1 !~ /^\/\//) {
            gsub(",", "", $1); print $1;
        }
    }' "$anchor_file" | paste -sd'|' -)
fi

if [[ "$mode" == "anchor" ]]; then
    grep -E "\b($anchors)\b"
else
    grep -Ev "\b($anchors)\b"
fi

if (( pretty )); then
    echo "Anchor regex: \b($anchors)\b" >&2
fi

