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

  # Check if the first line is a comment
  if [[ "$first_line" == "//"* ]]; then
    # If it is, replace the existing first line with the clean path
    sed -i "1s|.*|// ${clean_filepath}|" "$filepath"
  else
    # If not, insert the new path comment at the top
    sed -i "1i// ${clean_filepath}" "$filepath"
  fi
done

echo "Header standardization complete for all applicable project .js files."
