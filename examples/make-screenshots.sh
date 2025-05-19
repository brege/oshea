#!/bin/bash

set -e

# check if imagemagick is installed
command -v convert >/dev/null 2>&1 || { 
  echo >&2 "I require imagemagick but it's not installed.  Aborting.";
  echo "debian:   sudo apt-get install imagemagick";
  echo "fedora:   sudo dnf install ImageMagick";
exit 1; }

mkdir -p ./screenshots

md-to-pdf convert example-recipe.md \
          --plugin recipe \
          --filename example-recipe.pdf \
          --outdir screenshots \
          --no-open

md-to-pdf convert example-cv.md \
          --plugin cv \
          --filename example-cv.pdf \
          --outdir screenshots \
          --no-open

md-to-pdf convert example-cover-letter.md \
          --plugin cover-letter --filename \
          example-cover-letter.pdf \
          --outdir screenshots \
          --no-open

for f in ./screenshots/*.pdf; do 
  convert -density 150 "$f[0]" \
          -background white \
          -alpha remove -alpha off \
          +repage \
          -quality 92 \
          "./screenshots/$(basename "$f" .pdf).png"
done

rm screenshots/example-recipe.pdf
rm screenshots/example-cv.pdf
rm screenshots/example-cover-letter.pdf
