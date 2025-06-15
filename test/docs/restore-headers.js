const fs = require('fs');
const path = require('path');

// Helper to parse headers and test_ids from the original file
function parseOriginalHeaders(originalFile) {
  const lines = fs.readFileSync(originalFile, 'utf8').split('\n');
  let currentHeaders = [];
  const testIdToHeaders = {};

  for (const line of lines) {
    const headerMatch = line.match(/^(#+\s+.+)$/); // Match any header line
    if (headerMatch) {
      if (line.startsWith('## ')) {
        currentHeaders = [line];
      } else if (line.startsWith('### ')) {
        currentHeaders = currentHeaders.filter(h => !h.startsWith('### '));
        currentHeaders.push(line);
      } else {
        currentHeaders.push(line);
      }
    }
    const checklist = line.match(/^\*\s*\[[ xS]\]\s+(\d+\.\d+\.\d+)/);
    if (checklist) {
      const testId = checklist[1];
      testIdToHeaders[testId] = [...currentHeaders];
    }
  }
  return testIdToHeaders;
}

function restoreHeaders(originalFile, geminiFile, outputFile) {
  const testIdToHeaders = parseOriginalHeaders(originalFile);

  const lines = fs.readFileSync(geminiFile, 'utf8').split('\n');
  const output = [];
  const printedHeaderCombos = new Set();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const testIdMatch = line.match(/^\*\s*\[[ xS]\]\s+(\d+\.\d+\.\d+)/);
    if (testIdMatch) {
      const testId = testIdMatch[1];
      const headers = testIdToHeaders[testId];
      if (headers) {
        const headerKey = headers.join('|');
        if (!printedHeaderCombos.has(headerKey)) {
          // Add blank lines after ## header, one after ###, none after others
          headers.forEach((h, idx) => {
            output.push(h);
            if (h.startsWith('## ')) {
              output.push('');
            }
            // Only add a blank line after the last header, unless it's a ## (already handled)
            if (idx === headers.length - 1 && !h.startsWith('## ')) {
              output.push('');
            }
          });
          printedHeaderCombos.add(headerKey);
        }
      }
      // No blank line between checklist and its children
    }
    output.push(line);

    // If this is a checklist line, check if the next line is a key-value line (starts with "  -")
    // If so, do NOT add a blank line. If not, add a blank line (i.e., between blocks).
    if (testIdMatch) {
      // Look ahead to next line
      const nextLine = lines[i + 1] || '';
      if (!nextLine.match(/^\s{2,}-/)) {
        output.push('');
      }
    }
  }

  // Remove any trailing blank lines
  while (output.length > 0 && output[output.length - 1].trim() === '') output.pop();

  fs.writeFileSync(outputFile, output.join('\n'), 'utf8');
  console.log(`Done! Output written to ${outputFile}`);
}

// === Usage: node restore-headers.js <original.md> <gemini.md> <output.md> ===
if (process.argv.length < 5) {
  console.error('Usage: node restore-headers.js <original.md> <gemini.md> <output.md>');
  process.exit(1);
}

restoreHeaders(process.argv[2], process.argv[3], process.argv[4]);

