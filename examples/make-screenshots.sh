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
            --config ../test/config.test.yaml \
            --filename example-business-card.pdf \
            --outdir ../docs/images/screenshots \
            --no-open

md-to-pdf convert ./custom_plugin_showcase/advanced-card/advanced-card-example.md \
            --plugin advanced-card \
            --config ./screenshot-config.yaml \
            --filename advanced-business-card.pdf \
            --outdir ../docs/images/screenshots \
            --no-open

# only do these next two if they are present at the specified relative location
# if present, the plugin discovery is self-activating, using the contents of the
# shared root of their corresponding *.md file

# --- D3 Histogram Slide Example ---
if [ -d "../../md-to-pdf-plugins/d3-histogram-slide" ]; then
  md-to-pdf convert ../../md-to-pdf-plugins/d3-histogram-slide/d3-histogram-slide.md \
            --config ./screenshot-config.yaml \
            --filename d3-histogram-slide.pdf \
            --outdir ../docs/images/screenshots \
            --no-open
fi

# --- Restaurant Menu Example (Single View) ---
if [ -d "../../md-to-pdf-plugins/restaurant-menu" ]; then
  md-to-pdf ../../md-to-pdf-plugins/restaurant-menu/restaurant-menu-example.md \
            --config ./screenshot-config.yaml \
            --filename restaurant-menu.pdf \
            --outdir ../docs/images/screenshots \
            --no-open
fi

# alternatively, you could use the --plugin flag if you performed the steps to add
# the collection via
# md-to-pdf-cm add https://github.com/brege/md-to-pdf-plugins.git --name brege-plugins
# md-to-pdf plugin list --short
# md-to-pdf plugin enable brege-plugins/d3-histogram-slide --name d3-histogram-slide
# md-to-pdf plugin enable brege-plugins/restaurant-menu --name restaurant-menu
# e.g.:
# md-to-pdf convert path/to/d3-histogram-slide.md --plugin d3-histogram-slide # [ ... ]
# md-to-pdf convert ../../relative/path/to/restaurant-menu.md --plugin restaurant-menu # [ ... ]

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

# only try to remove these if their corresponding md files are present
if [ -f "../../md-to-pdf-plugins/d3-histogram-slide/d3-histogram-slide.md" ]; then
  rm ../docs/images/screenshots/d3-histogram-slide.pdf
fi
if [ -f "../../md-to-pdf-plugins/restaurant-menu/restaurant-menu-example.md" ]; then
  rm ../docs/images/screenshots/restaurant-menu.pdf
fi
