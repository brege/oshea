#!/bin/bash

# Default number of lines to show
n=100

# Parse -n argument
while getopts "n:" opt; do
  case $opt in
    n)
      n="$OPTARG"
      ;;
    *)
      echo "Usage: $0 [-n number_of_lines]"
      exit 1
      ;;
  esac
done

shift $((OPTIND -1))

tmpfile=$(mktemp)
cat > "$tmpfile"

total=$(wc -l < "$tmpfile")

# Calculate counts
head_count=$(( n / 4 ))
tail_count=$(( n / 4 ))
middle_count=$(( n - head_count - tail_count ))

# Handle small files
if (( total < n )); then
    head_count=$(( total / 4 ))
    tail_count=$(( total / 4 ))
    middle_count=$(( total - head_count - tail_count ))
    n=$total
fi

echo
echo "--- FIRST $head_count LINES ---"
echo
head -n $head_count "$tmpfile"

start=$(( head_count + 1 ))
end=$(( total - tail_count ))
middle_lines=$(( end - start + 1 ))

if (( middle_count > 0 && middle_lines > 0 )); then
    nth=$(( middle_lines / middle_count ))
    if (( nth < 1 )); then nth=1; fi

    echo
    echo "--- $middle_count EVENLY SPACED LINES FROM MIDDLE ---"
    echo
    awk -v start=$start -v end=$end -v nth=$nth -v count=$middle_count '
        NR >= start && NR <= end {
            if (((NR - start) % nth == 0) && (printed < count)) {
                print
                printed++
            }
        }
    ' "$tmpfile"
else
    echo
    echo "--- NO MIDDLE LINES TO PRINT ---"
    echo
fi

echo
echo "--- LAST $tail_count LINES ---"
echo
tail -n $tail_count "$tmpfile"

rm "$tmpfile"

echo
echo "better-cat: Shows the first $head_count lines, $middle_count evenly spaced lines from the middle, and the last $tail_count lines of a stream or file. (Total lines: $total)"

