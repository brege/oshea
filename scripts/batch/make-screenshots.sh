#!/bin/bash

set -e

# --- Path Variables for Portability ---
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
EXAMPLES_DIR="$REPO_ROOT/examples"
SCREENSHOTS_DIR="$REPO_ROOT/docs/images/screenshots"
# The external plugins directory is a sibling to the project root
PLUGIN_DIR_EXTERNAL="$REPO_ROOT/../md-to-pdf-plugins"

# Change to the project root to ensure md-to-pdf command is found
cd "$REPO_ROOT" || exit 1

# --- Configuration ---
USE_PDFTOPPM=true
SAVE_PDFS_FOR_DEBUGGING=false

# --- Check for required tools ---
command -v magick >/dev/null 2>&1 || {
  echo >&2 "I require imagemagick but it's not installed.  Aborting.";
  echo "debian:   sudo apt-get install imagemagick";
  echo "fedora:   sudo dnf install ImageMagick";
  exit 1;
}

if [ "$USE_PDFTOPPM" = true ]; then
  command -v pdftoppm >/dev/null 2>&1 || {
    echo >&2 "You've chosen to use pdftoppm but it's not installed. Aborting.";
    echo "pdftoppm is part of poppler-utils.";
    echo "debian:   sudo apt-get install poppler-utils";
    echo "fedora:   sudo dnf install poppler-utils";
    exit 1;
  }
fi

mkdir -p "$SCREENSHOTS_DIR"

# --- Run md-to-pdf commands from the 'examples' directory ---
# This ensures that the paths inside screenshot-config.yaml are resolved correctly.
cd "$EXAMPLES_DIR" || exit 1

# --- Single Page Examples ---
node ../cli.js convert "example-recipe.md" \
           --plugin recipe \
           --config "./screenshot-config.yaml" \
           --filename example-recipe.pdf \
           --outdir "$SCREENSHOTS_DIR" \
           --no-open

node ../cli.js convert "example-cv.md" \
           --plugin cv \
           --config "./screenshot-config.yaml" \
           --filename example-cv.pdf \
           --outdir "$SCREENSHOTS_DIR" \
           --no-open

node ../cli.js convert "example-cover-letter.md" \
           --plugin cover-letter \
           --config "./screenshot-config.yaml" \
           --filename example-cover-letter.pdf \
           --outdir "$SCREENSHOTS_DIR" \
           --no-open

# --- Business Card Example ---
node ../cli.js convert "custom_plugin_showcase/advanced-card/advanced-card-example.md" \
             --plugin advanced-card \
             --config "./screenshot-config.yaml" \
             --filename advanced-business-card.pdf \
             --outdir "$SCREENSHOTS_DIR" \
             --no-open

# --- External Plugin Examples ---
echo "Checking for external plugins..."

D3_MD_PATH="$PLUGIN_DIR_EXTERNAL/d3-histogram-slide/d3-histogram-slide.md"
RESTAURANT_MD_PATH="$PLUGIN_DIR_EXTERNAL/restaurant-menu/restaurant-menu-example.md"

if [ -f "$D3_MD_PATH" ]; then
  echo "Generating D3 Histogram Slide..."
  node ../cli.js convert "$D3_MD_PATH" \
            --config "./screenshot-config.yaml" \
            --filename d3-histogram-slide.pdf \
            --outdir "$SCREENSHOTS_DIR" \
            --no-open
else
  echo "Skipping D3 Histogram Slide generation: Markdown file not found at $D3_MD_PATH"
fi

if [ -f "$RESTAURANT_MD_PATH" ]; then
  echo "Generating Restaurant Menu (Single View)..."
  node ../cli.js convert "$RESTAURANT_MD_PATH" \
            --config "./screenshot-config.yaml" \
            --filename restaurant-menu.pdf \
            --outdir "$SCREENSHOTS_DIR" \
            --no-open
else
  echo "Skipping Restaurant Menu generation: Markdown file not found at $RESTAURANT_MD_PATH"
fi

# Return to project root before image conversion
cd "$REPO_ROOT" || exit 1

# --- Convert PDFs to PNGs ---
for f in "$SCREENSHOTS_DIR"/*.pdf; do 
  output_base="$SCREENSHOTS_DIR/$(basename "$f" .pdf)"
  output_png="${output_base}.png"
  
  if [ "$USE_PDFTOPPM" = true ]; then
    echo "Converting '$f' to PNG using pdftoppm and magick..."
    temp_pdftoppm_output_prefix="/tmp/$(basename "$f" .pdf)" 
    expected_output_file="${temp_pdftoppm_output_prefix}-1.png" 

    pdftoppm_output=$(pdftoppm -png -r 600 "$f" "${temp_pdftoppm_output_prefix}" 2>&1)
    pdftoppm_exit_status=$?

    if [ "$pdftoppm_exit_status" -ne 0 ]; then
      echo "ERROR: pdftoppm failed for $f. Exit status: $pdftoppm_exit_status"
      echo "pdftoppm output/errors:"
      echo "$pdftoppm_output"
    elif [ -f "$expected_output_file" ]; then 
      magick "$expected_output_file" -background white -alpha remove -alpha off -quality 92 "$output_png"
      rm "$expected_output_file" 
    else
      echo "WARN: pdftoppm did not produce the expected PNG output for $f."
    fi
  else
    echo "Converting '$f' to PNG using magick's PDF delegate..."
    magick -density 600 "$f[0]" -background white -alpha remove -alpha off +repage -define pdf:TextAlphaBits=4 -define pdf:GraphicsAlphaBits=4 -quality 92 "$output_png"
  fi
done

# --- Clean up PDFs ---
if [ "$SAVE_PDFS_FOR_DEBUGGING" = false ]; then
  rm -f "$SCREENSHOTS_DIR"/*.pdf
fi
