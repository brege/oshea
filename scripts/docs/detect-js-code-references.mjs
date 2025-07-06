// scripts/docs/detect-js-code-references.mjs

// --- Ensure script runs from project root, even if launched from scripts/ ---
import path from 'path';
import { fileURLToPath } from 'url';
import process from 'process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// If running from scripts/, move to project root
if (path.basename(__dirname) === 'scripts') {
  process.chdir(path.resolve(__dirname, '../..'));
}

// --- Other imports ---
import fs from 'fs';
import { minimatch } from 'minimatch';
import { remark } from 'remark';
import { visitParents } from 'unist-util-visit-parents';

// --- Configuration ---
const EXCLUDE_PATTERNS = [
  'docs-devel/**',
  'node_modules/**',
  '.git/**',
  '**/checklist-level-*.md',
  '**/changelog*.md',
  '**/current-vs-proposed-test-structure.md',
  '**/dream-board-v0.*.md',
  '**/roadmap*.md',
];

const FILTER_REJECTS = [
  'index.js',
  // Add more patterns or filenames here
];

const FILTER_REJECTS_REGEX = [
  /^node\s+\w+\.js$/,  // matches "node cli.js", "node foo.js"
  /^node\s+\.\//,      // matches "node ./something.js"
  /\*|\?|\[.*\]/,      // matches any glob-like pattern (e.g. *.js, foo-*.js)
];

const FILTER_REJECTS_FN = [
  ref => ref.startsWith('node '),
];

// --- CLI flags ---
const args = process.argv.slice(2);
const rewrite = args.includes('--rewrite');
const muteMissing = args.includes('--mute-missing');
const verboseMissing = args.includes('--verbose-missing');
const fileArgIndex = args.indexOf('--file');
const singleFile = fileArgIndex !== -1 ? args[fileArgIndex + 1] : null;

// --- Exclude logic ---
function isExcluded(filePath) {
  let relPath = path.relative(process.cwd(), filePath);
  relPath = relPath.split(path.sep).join('/');
  return EXCLUDE_PATTERNS.some(pattern => minimatch(relPath, pattern));
}

// --- Filter logic ---
function isRejected(reference) {
  const base = path.basename(reference);
  if (FILTER_REJECTS.some(pattern => minimatch(base, pattern))) return true;
  if (FILTER_REJECTS_REGEX.some(re => re.test(reference))) return true;
  if (FILTER_REJECTS_FN.some(fn => fn(reference))) return true;
  return false;
}

// --- Js file collection ---
function getJsFilesWithDegeneracy(dir, excludes = []) {
  const basenameMap = {};
  function walk(currentDir) {
    for (const entry of fs.readdirSync(currentDir)) {
      const fullPath = path.join(currentDir, entry);
      if (isExcluded(fullPath)) continue;
      if (fs.statSync(fullPath).isDirectory()) {
        walk(fullPath);
      } else if (entry.endsWith('.js')) {
        // DO NOT skip dotfiles!
        if (isRejected(entry)) continue;
        if (!basenameMap[entry]) {
          basenameMap[entry] = [];
        }
        basenameMap[entry].push(path.relative(process.cwd(), fullPath).split(path.sep).join('/'));
      }
    }
  }
  walk(dir);
  return basenameMap;
}

// --- Markdown file collection ---
function getMdFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    if (isExcluded(fullPath)) continue;
    if (fs.statSync(fullPath).isDirectory()) {
      getMdFiles(fullPath, files);
    } else if (entry.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

// --- Helper: get full context line ---
function getLineForNode(node, lines) {
  if (!node.position) return null;
  const { start, end } = node.position;
  if (start.line === end.line) {
    return lines[start.line - 1];
  } else {
    return lines.slice(start.line - 1, end.line).join('\n');
  }
}

// --- Table detection ---
function isInTable(ancestors) {
  return ancestors.some(node => node.type === 'table');
}

// --- Known js file check (with robust path resolution) ---
function isKnownJsFile(reference, basenameMap, mdFilePath) {
  const base = path.basename(reference);

  // If the basename is not in the index, it's not known
  if (!basenameMap[base]) return false;

  // If the basename is unique, accept any reference to it
  if (basenameMap[base].length === 1) return true;

  // Try to resolve the reference as a path relative to the Markdown file
  let resolved;
  try {
    const abs = path.resolve(path.dirname(mdFilePath), reference);
    resolved = path.relative(process.cwd(), abs).split(path.sep).join('/');
  } catch {
    resolved = null;
  }

  // If the resolved path matches any candidate, it's found
  if (resolved && basenameMap[base].some(relPath => relPath === resolved)) {
    return true;
  }

  // Otherwise, it's ambiguous (degenerate) and doesn't match a specific file
  return false;
}

// --- Best link text: filename if unique, short path if ambiguous ---
function getBestLinkText(jsFilePath, basenameMap) {
  const base = path.basename(jsFilePath);
  if (basenameMap[base] && basenameMap[base].length === 1) {
    return base;
  }
  // Use last two segments (short path)
  const parts = jsFilePath.split('/');
  return parts.length >= 2 ? parts.slice(-2).join('/') : jsFilePath;
}

// --- Always tick link text ---
function ticked(text) {
  return '`' + text.replace(/^`+|`+$/g, '') + '`';
}

// --- Proposed link generator ---
function getProposedLink(mdFile, jsFilePath, basenameMap) {
  const bestText = getBestLinkText(jsFilePath, basenameMap);
  const tickedText = ticked(bestText);
  // Get the relative path from the markdown file's directory to the JS file
  const mdDir = path.dirname(mdFile);
  const relLink = path.relative(mdDir, path.join(process.cwd(), jsFilePath)).split(path.sep).join('/');
  return `[${tickedText}](${relLink})`;
}

// --- Extract original link from source ---
function getOriginalLinkFromSource(content, node) {
  if (!node.position) return null;
  const { start, end } = node.position;
  const lines = content.split('\n');
  if (start.line === end.line) {
    return lines[start.line - 1].slice(start.column - 1, end.column - 1);
  } else {
    // For multi-line links (rare), join the lines
    const firstLine = lines[start.line - 1].slice(start.column - 1);
    const lastLine = lines[end.line - 1].slice(0, end.column - 1);
    const middleLines = lines.slice(start.line, end.line - 1);
    return [firstLine, ...middleLines, lastLine].join('\n');
  }
}

// --- Main scan function ---
async function scanMarkdownForJsRefs(mdPath, basenameMap) {
  const content = fs.readFileSync(mdPath, 'utf8');
  const lines = content.split('\n');
  const results = [];
  const substitutions = [];

  const tree = await remark().parse(content);

  function isJsReference(val) {
    return val && val.endsWith('.js') && !isRejected(val);
  }

  visitParents(tree, (node, ancestors) => {
    if (isInTable(ancestors)) return; // Skip JS references in tables

    // Inline code: `something.js`
    if (node.type === 'inlineCode' && isJsReference(node.value)) {
      const known = isKnownJsFile(node.value, basenameMap, mdPath);
      let proposed = null;
      let jsFilePath = null;
      if (known && basenameMap[path.basename(node.value)].length === 1) {
        jsFilePath = basenameMap[path.basename(node.value)][0];
        proposed = getProposedLink(mdPath, jsFilePath, basenameMap);
      }
      // For substitution
      if (proposed && node.position && node.position.start.offset !== undefined && node.position.end.offset !== undefined) {
        substitutions.push({
          startOffset: node.position.start.offset,
          endOffset: node.position.end.offset,
          proposed,
        });
      }
      results.push({
        mdPath,
        lineNum: node.position?.start.line,
        reference: node.value,
        context: getLineForNode(node, lines),
        format: 'inlineCode',
        knownJsFile: known,
        proposed,
        originalLink: getOriginalLinkFromSource(content, node),
      });
    }
    // Markdown link: [something.js](../something.js)
    if (node.type === 'link' && isJsReference(node.url)) {
      let jsFilePath = null;
      let bestText = '';
      const base = path.basename(node.url);
      if (basenameMap[base] && basenameMap[base].length === 1) {
        jsFilePath = basenameMap[base][0];
        bestText = getBestLinkText(jsFilePath, basenameMap);
      } else if (basenameMap[base]) {
        // Try to resolve the path as in isKnownJsFile
        let resolved;
        try {
          const abs = path.resolve(path.dirname(mdPath), node.url);
          resolved = path.relative(process.cwd(), abs).split(path.sep).join('/');
        } catch {
          resolved = null;
        }
        if (resolved && basenameMap[base].includes(resolved)) {
          jsFilePath = resolved;
          bestText = getBestLinkText(jsFilePath, basenameMap);
        }
      }
      if (!bestText) {
        // Fallback to link text as written
        if (node.children && node.children.length === 1 && node.children[0].type === 'text') {
          bestText = node.children[0].value;
        } else {
          bestText = node.url;
        }
      }
      const known = isKnownJsFile(node.url, basenameMap, mdPath);
      let proposed = null;
      if (known && jsFilePath) {
        proposed = getProposedLink(mdPath, jsFilePath, basenameMap);
      }
      // For substitution
      if (proposed && node.position && node.position.start.offset !== undefined && node.position.end.offset !== undefined) {
        substitutions.push({
          startOffset: node.position.start.offset,
          endOffset: node.position.end.offset,
          proposed,
        });
      }
      results.push({
        mdPath,
        lineNum: node.position?.start.line,
        reference: node.url,
        context: getLineForNode(node, lines),
        format: 'link',
        linkText: bestText,
        knownJsFile: known,
        originalLink: getOriginalLinkFromSource(content, node),
        proposed,
      });
    }
  });

  return { results, substitutions };
}

// --- Apply substitutions to file ---
function applySubstitutionsToFile(mdPath, substitutions) {
  let content = fs.readFileSync(mdPath, 'utf8');
  // Sort by start offset descending
  substitutions.sort((a, b) => b.startOffset - a.startOffset);

  for (const sub of substitutions) {
    content =
      content.slice(0, sub.startOffset) +
      sub.proposed +
      content.slice(sub.endOffset);
  }
  fs.writeFileSync(mdPath, content, 'utf8');
}

// --- Main logic ---

async function main() {
  const basenameMap = getJsFilesWithDegeneracy(process.cwd(), EXCLUDE_PATTERNS);

  let mdFiles;
  if (singleFile) {
    if (!fs.existsSync(singleFile)) {
      console.error(`File not found: ${singleFile}`);
      process.exit(1);
    }
    mdFiles = [singleFile];
  } else {
    mdFiles = getMdFiles(process.cwd());
  }

  let allResults = [];
  let fileSubs = {};

  for (const mdFile of mdFiles) {
    const { results, substitutions } = await scanMarkdownForJsRefs(mdFile, basenameMap);
    allResults = allResults.concat(results);
    if (substitutions.length > 0) {
      fileSubs[mdFile] = substitutions;
    }
  }

  if (allResults.length === 0) {
    console.log('No JS references found in Markdown.');
  } else {
    console.log('Detected JS references in Markdown:');
    for (const hit of allResults) {
      // Show missing references only if not muted or if verbose
      if (!hit.knownJsFile && muteMissing && !verboseMissing) continue;

      let output =
        `File: ${hit.mdPath}\n  Line: ${hit.lineNum}\n  Reference: ${hit.reference}\n  Format: ${hit.format}` +
        (hit.linkText ? `\n  Link text: ${hit.linkText}` : '') +
        `\n  Context: ${hit.context}`;

      if (hit.originalLink) {
        output += `\n  Original Link:  ${hit.originalLink}`;
      }
      if (hit.proposed) {
        output += `\n  Proposed:       ${hit.proposed}`;
      }
      if (hit.knownJsFile === false) {
        output += '\n  WARNING: Reference not found in codebase!';
      }
      output += '\n';
      console.log(output);
    }
  }

  if (rewrite) {
    for (const [mdFile, substitutions] of Object.entries(fileSubs)) {
      console.log(`\n[rewrite] Updating: ${mdFile}`);
      applySubstitutionsToFile(mdFile, substitutions);
    }
    console.log('\nAll eligible substitutions have been written to disk.');
  } else if (Object.keys(fileSubs).length > 0) {
    console.log('\nDry run: No files were changed. Use --rewrite to apply substitutions.');
    if (singleFile) {
      console.log(`To rewrite: node detect-js-reference-contexts.mjs --rewrite --file ${singleFile}`);
    } else {
      console.log('To rewrite all: node detect-js-reference-contexts.mjs --rewrite');
    }
  }
}

main();
