#!/bin/bash

set -e
cd "$(dirname "$0")" || exit 1

# check if imagemagick is installed
command -v magick >/dev/null 2>&1 || { 
  echo >&2 "I require imagemagick but it's not installed.  Aborting.";
  echo "debian:   sudo apt-get install imagemagick";
  echo "fedora:   sudo dnf install ImageMagick";
exit 1; }

mkdir -p ../docs/images/screenshots

# --- Single Page Examples ---
md-to-pdf convert example-recipe.md \
          --plugin recipe \
          --config ./screenshot-config.yaml \
          --filename example-recipe.pdf \
          --outdir ../docs/images/screenshots \
          --no-open

md-to-pdf convert example-cv.md \
          --plugin cv \
          --config ./screenshot-config.yaml \
          --filename example-cv.pdf \
          --outdir ../docs/images/screenshots \
          --no-open

md-to-pdf convert example-cover-letter.md \
          --plugin cover-letter \
          --config ./screenshot-config.yaml \
          --filename example-cover-letter.pdf \
          --outdir ../docs/images/screenshots \
          --no-open

# --- Business Card Examples ---
md-to-pdf convert ../test/assets/example-business-card.md \
            --plugin business-card \
            --config ./screenshot-config.yaml \
            --filename example-business-card.pdf \
            --outdir ../docs/images/screenshots \
            --no-open

md-to-pdf convert ./custom_plugin_showcase/advanced-card/advanced-card-example.md \
            --plugin advanced-card \
            --config ./screenshot-config.yaml \
            --filename advanced-business-card.pdf \
            --outdir ../docs/images/screenshots \
            --no-open

# --- Convert PDFs to PNGs ---
for f in ../docs/images/screenshots/*.pdf; do 
  magick -density 150 "$f[0]" \
         -background white \
         -alpha remove -alpha off \
         +repage \
         -quality 92 \
         "../docs/images/screenshots/$(basename "$f" .pdf).png"
done

# --- Clean up ---
rm ../docs/images/screenshots/example-recipe.pdf
rm ../docs/images/screenshots/example-cv.pdf
rm ../docs/images/screenshots/example-cover-letter.pdf
rm ../docs/images/screenshots/example-business-card.pdf
rm ../docs/images/screenshots/advanced-business-card.pdf
