#!/bin/bash

echo "Running bash batch conversion for Hugo recipes..."
# Exit on any error
set -e

# --- Script Usage ---
if [ "$#" -ne 3 ] && [ "$#" -ne 4 ]; then
    echo "Usage: $0 <source_dir> <output_dir> <base_plugin> [<md_to_pdf_cli_path>]"
    echo "Example: $0 ./examples/hugo-example ./batch_output/hugo_recipes_bash recipe"
    echo "Example with custom cli.js: $0 ../my_docs ../my_pdfs default ../dist/cli.js"
    exit 1
fi

# --- Configuration from Arguments ---
SOURCE_BASE_DIR_ARG="$1"
OUTPUT_BASE_DIR_ARG="$2"
BASE_PLUGIN_ARG="$3"
MD_TO_PDF_CLI_PATH_ARG="${4:-$(dirname "$0")/../../cli.js}" # Default path relative to this script

# Resolve to absolute paths
SOURCE_BASE_DIR=$(readlink -f "$SOURCE_BASE_DIR_ARG")
OUTPUT_BASE_DIR=$(readlink -f "$OUTPUT_BASE_DIR_ARG")
BASE_PLUGIN="$BASE_PLUGIN_ARG"
MD_TO_PDF_CMD="node $(readlink -f "$MD_TO_PDF_CLI_PATH_ARG")"


# --- Helper Functions ---
# Simple slugify function (replace non-alphanumeric with hyphen)
generate_slug() {
    echo "$1" | tr '[:upper:]' '[:lower:]' | sed -e 's/[^a-z0-9]\+/-/g' -e 's/^-*//' -e 's/-*$//'
}

# Function to extract front matter value using yq (preferred) or grep/sed
get_fm_value() {
    local file_path="$1"
    local key="$2"
    local value=""

    if command -v yq &> /dev/null; then
        value=$(yq eval ".$key // \"\"" "$file_path")
        value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e 's/^null$//' -e "s/^''$//")
    else
        value=$(grep -m1 "^${key}:" "$file_path" | sed -E "s/^${key}:[[:space:]]*['\"]?([^'\"]*)['\"]?/\1/")
    fi
    echo "$value"
}

# Function to extract author from body (example)
extract_author_from_content() {
    local content_file="$1"
    local author_line=$(grep -m1 -iE '^\*\*Chef:[[:space:]]+\*?(.*)\*?' "$content_file")
    if [[ -n "$author_line" ]]; then
        local author_name=$(echo "$author_line" | sed -E 's/^\*\*Chef:[[:space:]]+\*?(.*)\*?/\1/' | sed 's/\*$//' | xargs)
        generate_slug "$author_name"
    else
        echo ""
    fi
}

# --- Main Script Logic ---
echo "Starting batch conversion for Hugo recipes (Bash script)..."
echo "Source directory: $SOURCE_BASE_DIR"
echo "Output directory: $OUTPUT_BASE_DIR"
echo "Base plugin: $BASE_PLUGIN"
echo "md-to-pdf CLI command: $MD_TO_PDF_CMD"


if [ ! -d "$SOURCE_BASE_DIR" ]; then
    echo "ERROR: Source directory does not exist: $SOURCE_BASE_DIR"
    exit 1
fi

mkdir -p "$OUTPUT_BASE_DIR"

if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js (node) command not found. Please install Node.js."
    exit 1
fi
if [ ! -f "$(echo $MD_TO_PDF_CMD | cut -d' ' -f2)" ]; then
    echo "ERROR: md-to-pdf cli.js not found at $(echo $MD_TO_PDF_CMD | cut -d' ' -f2)"
    echo "Please check the path or provide it as the 4th argument to the script."
    exit 1
fi


# Find all index.md files in subdirectories of SOURCE_BASE_DIR
find "$SOURCE_BASE_DIR" -mindepth 2 -name "index.md" -type f | while IFS= read -r markdown_file_path; do
    echo "Processing: $markdown_file_path"

    item_slug=$(basename "$(dirname "$markdown_file_path")")

    title_fm=$(get_fm_value "$markdown_file_path" "title")
    author_credit_fm=$(get_fm_value "$markdown_file_path" "author_credit")
    date_fm_raw=$(get_fm_value "$markdown_file_path" "date")

    title=${title_fm:-$item_slug}

    author_slug=""
    if [[ -n "$author_credit_fm" ]]; then
        author_slug=$(generate_slug "$author_credit_fm")
    else
        author_slug=$(extract_author_from_content "$markdown_file_path")
    fi

    date_slug=""
    if [[ -n "$date_fm_raw" ]]; then
        date_slug=$(echo "$date_fm_raw" | cut -d'T' -f1)
    fi

    output_filename_base=$(generate_slug "$title")
    [[ -n "$author_slug" ]] && output_filename_base="${output_filename_base}-${author_slug}"
    [[ -n "$date_slug" ]] && output_filename_base="${output_filename_base}-${date_slug}"
    output_filename="${output_filename_base//--/-}.pdf"
    output_filename=${output_filename#-}
    output_filename=${output_filename%-}

    item_output_dir="$OUTPUT_BASE_DIR/$item_slug"
    mkdir -p "$item_output_dir"

    output_pdf_path="$item_output_dir/$output_filename"

    echo "  Generating PDF: $output_pdf_path"
    set -x
    $MD_TO_PDF_CMD convert "$markdown_file_path" \
        --plugin "$BASE_PLUGIN" \
        --outdir "$item_output_dir" \
        --filename "$output_filename" \
        --no-open
    set +x

    if [ $? -eq 0 ]; then
        echo "  Successfully generated: $output_pdf_path"
    else
        echo "  ERROR converting $markdown_file_path"
    fi
done

echo "Bash batch processing complete."
