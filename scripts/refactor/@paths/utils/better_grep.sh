#!/bin/bash

show_pathlike=0
show_not_pathlike=0
show_pretty=0

# Parse arguments
for arg in "$@"; do
    case "$arg" in
        --pathlike) show_pathlike=1 ;;
        --not-pathlike) show_not_pathlike=1 ;;
        --pretty) show_pretty=1 ;;
        *) echo "Unknown option: $arg" >&2; exit 1 ;;
    esac
done

# Only one mode at a time
if (( show_pathlike + show_not_pathlike != 1 )); then
    echo "Usage: $0 --pathlike|--not-pathlike [--pretty]" >&2
    exit 1
fi

awk_pathlike='
{
    for(i=2;i<=NF;i+=2)
        if($i ~ /\// || $i ~ /^\./)
            {print $0; break}
}
'

awk_not_pathlike='
{
    pathlike=0
    for(i=2;i<=NF;i+=2)
        if($i ~ /\// || $i ~ /^\./)
            pathlike=1
    if(!pathlike) print $0
}
'

if (( show_pathlike )); then
    awk -F"['\"]" "$awk_pathlike"
    if (( show_pretty )); then
        echo
        echo "=== better_grep --pathlike AWK logic ===" >&2
        echo "$awk_pathlike" >&2
        echo "Field separator: -F\"['\\\"\"]\" (single or double quote)" >&2
        echo "Matches any quoted argument containing \"/\" or starting with \".\"" >&2
    fi
elif (( show_not_pathlike )); then
    awk -F"['\"]" "$awk_not_pathlike"
    if (( show_pretty )); then
        echo
        echo "=== better_grep --not-pathlike AWK logic ===" >&2
        echo "$awk_not_pathlike" >&2
        echo "Field separator: -F\"['\\\"\"]\" (single or double quote)" >&2
        echo "Matches lines where no quoted argument contains \"/\" or starts with \".\"" >&2
    fi
fi

