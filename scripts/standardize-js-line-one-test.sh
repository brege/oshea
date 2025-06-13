find test/integration -type f -name "*.js" | while read -r filepath; do
  # Read the first line of the file
  first_line=$(head -n 1 "$filepath")

  # Check if the first line is a comment
  if [[ "$first_line" == "//"* ]]; then
    # If it is, replace the existing first line
    sed -i "1s|.*|// ${filepath}|" "$filepath"
  else
    # If not, insert the new path comment at the top
    sed -i "1i// ${filepath}" "$filepath"
  fi
done

echo "Header standardization complete for all .js files in test/integration/"
