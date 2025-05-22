#!/bin/bash

set -e

# check if imagemagick is installed
command -v magick >/dev/null 2>&1 || { 
  echo >&2 "I require imagemagick but it's not installed.  Aborting.";
  echo "debian:   sudo apt-get install imagemagick";
  echo "fedora:   sudo dnf install ImageMagick";
exit 1; }

mkdir -p ../docs/images/screenshots

md-to-pdf convert example-recipe.md \
          --plugin recipe \
          --filename example-recipe.pdf \
          --outdir ../docs/images/screenshots \
          --no-open

md-to-pdf convert example-cv.md \
          --plugin cv \
          --filename example-cv.pdf \
          --outdir ../docs/images/screenshots \
          --no-open

md-to-pdf convert example-cover-letter.md \
          --plugin cover-letter --filename \
          example-cover-letter.pdf \
          --outdir ../docs/images/screenshots \
          --no-open

for f in ../docs/images/screenshots/*.pdf; do 
  magick -density 150 "$f[0]" \
         -background white \
         -alpha remove -alpha off \
         +repage \
         -quality 92 \
         "../docs/images/screenshots/$(basename "$f" .pdf).png"
done

rm ../docs/images/screenshots/example-recipe.pdf
rm ../docs/images/screenshots/example-cv.pdf
rm ../docs/images/screenshots/example-cover-letter.pdf
