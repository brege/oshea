#!/bin/bash

# Extract path patterns from .mocharc.js
patterns=$(grep -E "^\s*[a-zA-Z_]+: '.*\.js'" .mocharc.js | sed -E "s/.*: '(.*)'.*/\1/")

echo "Validating test paths in .mocharc.js:"
echo "-------------------------------------"

for pattern in $patterns; do
    # If the pattern contains a wildcard, use globbing
    if [[ "$pattern" == *'*'* ]]; then
        # Use globbing to expand the pattern
        matches=( $pattern )
        # If glob didn't match anything, the pattern is returned as-is
        if [[ "${matches[0]}" == "$pattern" ]]; then
            echo "✗ MISSING: $pattern"
        else
            echo "✓ FOUND (${#matches[@]} files): $pattern"
        fi
    else
        # Exact file, check if it exists
        if [[ -f "$pattern" ]]; then
            echo "✓ FOUND: $pattern"
        else
            echo "✗ MISSING: $pattern"
        fi
    fi
done

echo "-------------------------------------"
echo "Validation complete"

