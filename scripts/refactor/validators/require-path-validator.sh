#!/bin/bash

# --- Defaults and Setup ---
REPO_ROOT=$(realpath .)
QUIET=0
ignore_patterns=()
file_args=()

# --- Determine Script Directory ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# --- Config File Logic ---
CONFIG_FILE=""

# 1. Check for config file via -c/--config
while [[ $# -gt 0 ]]; do
    case "$1" in
        -I|--ignore)
            shift
            ignore_patterns+=("$1")
            ;;
        -c|--config)
            shift
            CONFIG_FILE="$1"
            ;;
        -q|--quiet)
            QUIET=1
            ;;
        *)
            file_args+=("$1")
            ;;
    esac
    shift
done

# 2. If no config file specified, check in script dir or standard locations
if [ -z "$CONFIG_FILE" ]; then
    # Try sibling config.ini
    if [ -f "$SCRIPT_DIR/config.ini" ]; then
        CONFIG_FILE="$SCRIPT_DIR/config.ini"
    # Try scripts/repo-health/fix-require-paths/config.ini (relative to script)
    elif [ -f "$SCRIPT_DIR/repo-health/fix-require-paths/config.ini" ]; then
        CONFIG_FILE="$SCRIPT_DIR/repo-health/fix-require-paths/config.ini"
    # Try scripts/repo-health/fix-require-paths/config.ini (relative to repo root)
    elif [ -f "$REPO_ROOT/scripts/repo-health/fix-require-paths/config.ini" ]; then
        CONFIG_FILE="$REPO_ROOT/scripts/repo-health/fix-require-paths/config.ini"
    fi
fi

# --- Read Config File if Found ---
if [ -n "$CONFIG_FILE" ] && [ -f "$CONFIG_FILE" ]; then
    # Helper to read config values
    get_config() {
        grep "^$1" "$CONFIG_FILE" | sed -e 's/.*= *//' -e 's/,/ /g'
    }
    # Only use config dirs and files if no command-line args were given
    if [ ${#file_args[@]} -eq 0 ]; then
        # Add dirs and files from config
        for dir in $(get_config "dirs"); do
            file_args+=("$REPO_ROOT/$dir")
        done
        for file in $(get_config "files"); do
            file_args+=("$REPO_ROOT/$file")
        done
    fi
    # Always use exclude patterns from config
    for exclude in $(get_config "exclude"); do
        ignore_patterns+=("$exclude")
    done
fi

# --- Separate Files and Directories ---
dirs_to_find=()
files_to_process=()

for arg in "${file_args[@]}"; do
    if [ -d "$arg" ]; then
        dirs_to_find+=("$arg")
    elif [ -f "$arg" ]; then
        files_to_process+=("$arg")
    fi
done

# --- Build Find Command for Directories ---
find_cmd=(find)
if [ ${#dirs_to_find[@]} -eq 0 ]; then
    # Default to current directory if no args
    dirs_to_find+=("$REPO_ROOT")
fi

for dir in "${dirs_to_find[@]}"; do
    find_cmd+=("$dir")
done
find_cmd+=(-type f -name '*.js')

# Add ignore patterns
for pat in "${ignore_patterns[@]}"; do
    find_cmd+=('!' -path "*/$pat*")
done

# --- Collect All Files to Process ---
jsfiles=$("${find_cmd[@]}")
# Add explicitly specified files
if [ ${#files_to_process[@]} -gt 0 ]; then
    jsfiles+=$'\n'"$(printf '%s\n' "${files_to_process[@]}")"
fi

# --- Process Files ---
echo "$jsfiles" | while read -r jsfile; do
    # Skip empty lines
    [ -z "$jsfile" ] && continue
    # Normalize jsfile path to be relative to repo root
    jsfile_rel=$(realpath --relative-to="$REPO_ROOT" "$jsfile")

    grep -E "require\(['\"]" "$jsfile" | \
    sed -n "s/.*require(['\"]\([^'\"]*\)['\"]).*/\1/p" | \
    while read -r path; do
        # Only check relative paths
        if [[ "$path" == ./* || "$path" == ../* ]]; then
            base_dir=$(dirname "$jsfile")
            # Resolve the required path relative to the file's directory
            abs_path=$(realpath -m "$base_dir/$path")
            
            # Check for file existence with and without .js extension
            if [ -f "$abs_path" ] || [ -f "$abs_path.js" ] || { [ -d "$abs_path" ] && [ -f "$abs_path/index.js" ]; }; then
                if [ "$QUIET" -eq 0 ]; then
                    echo "OK: $jsfile_rel => $path"
                fi
            else
                echo "MISSING: $jsfile_rel => $path"
            fi
        fi
    done
done

