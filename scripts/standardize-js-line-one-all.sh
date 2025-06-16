#!/bin/bash
# Find all files ending in .js, excluding specified directories
find . -path './node_modules' -prune -o \
       -path './.git' -prune -o \
       -path './dev' -prune -o \
       -path './assets' -prune -o \
       -type f -name "*.js" -print | while read -r filepath; do
  
  # Remove the leading './' from the path for a cleaner header
  clean_filepath=$(echo "$filepath" | sed 's|^\./||')

  # Read the first line of the file
  first_line=$(head -n 1 "$filepath")

  # Check if the first line is a shebang
  if [[ "$first_line" == "#!"* ]]; then
    # It's a shebang. Preserve it and work on the second line.
    second_line=$(sed -n '2p' "$filepath")
    if [[ "$second_line" == "//"* ]]; then
      # If the second line is already a path comment, replace it.
      sed -i "2s|.*|// ${clean_filepath}|" "$filepath"
    else
      # Otherwise, insert the new path comment on the second line.
      sed -i "2i// ${clean_filepath}" "$filepath"
    fi
  else
    # No shebang found. Use the original logic for the first line.
    if [[ "$first_line" == "//"* ]]; then
      # If the first line is a comment, replace it.
      sed -i "1s|.*|// ${clean_filepath}|" "$filepath"
    else
      # If not, insert the new comment at the top.
      sed -i "1i// ${clean_filepath}" "$filepath"
    fi
  fi
done

echo "Header standardization complete for all applicable project .js files."
