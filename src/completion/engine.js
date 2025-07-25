// src/completion/engine.js
const { trackerPath } = require('@paths');

const fs = require('fs');
const path = require('path');
const completionTracker = require(trackerPath);

const CACHE_PATH = path.join(process.env.HOME || process.env.USERPROFILE, '.cache/md-to-pdf/cli-tree.json');

function loadCache() {
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
  } catch {
    return [];
  }
}

// This helper function correctly identifies the true command path by
// stopping when it encounters an argument that is not a defined
// subcommand.
function getCommandPath(tree, parts) {
  const commandPath = [];
  let currentTree = tree;
  // The `slice(1)` is crucial because `parts` from `argv._` includes the script name.
  for (const part of parts.slice(1)) {
    const node = currentTree.find(n => n.name === part);
    if (node) {
      commandPath.push(part);
      currentTree = node.children || [];
    } else {
      // This part is a positional argument, not a subcommand, so the command path ends.
      break;
    }
  }
  return commandPath;
}

function findNode(tree, parts) {
  if (!parts.length) {
    return { isRoot: true, children: tree, name: '$root', options: [], positionals: [] };
  }
  const [head, ...rest] = parts;
  let node = tree.find(n => n.name === head);
  if (node) {
    if (rest.length === 0) return node;
    if (node.children && node.children.length > 0) return findNode(node.children, rest);
    return node;
  }
  if (rest.length === 0 && tree.some(n => n.name.startsWith(head))) {
    return { children: tree, name: '$partial_match_parent', options: [], positionals: [] };
  }
  return null;
}

function getSuggestions(argv, current) {
  const rawArgv = argv._.filter(Boolean);
  const cache = loadCache();
  const commandPathParts = getCommandPath(cache, rawArgv);

  let suggestions = [];

  const globalNode = cache.find(n => n.name === '$0');
  let globalOptionsAsFlags = (globalNode?.options || []).map(opt => `--${opt.name}`);

  let currentNode = findNode(cache, commandPathParts);
  if (!currentNode) {
    if (current.startsWith('-')) {
      suggestions.push(...globalOptionsAsFlags);
    } else {
      suggestions.push(...cache.filter(n => n.name !== '$0').map(n => n.name));
      if (globalNode && globalNode.positionals) {
        suggestions.push(...globalNode.positionals.map(p => p.key));
      }
    }
    return [...new Set(suggestions)].filter(s => s.startsWith(current));
  }

  let targetCompletionKey = null;
  let targetChoices = null;

  const allOptions = [...(currentNode.options || []), ...(globalNode?.options || [])];
  const previousArg = process.argv[process.argv.length - 2];

  if (previousArg && previousArg.startsWith('--')) {
    const prevOptionName = previousArg.substring(2);
    const prevOptionDef = allOptions.find(opt => opt.name === prevOptionName);

    if (prevOptionDef && prevOptionDef.completionKey) {
      targetCompletionKey = prevOptionDef.completionKey;
    } else if (prevOptionDef && prevOptionDef.choices) {
      targetChoices = prevOptionDef.choices;
    }
  }

  if (current.startsWith('-')) {
    suggestions.push(...(currentNode.options || []).map(opt => `--${opt.name}`));
    suggestions.push(...globalOptionsAsFlags);
  } else {
    if (!targetCompletionKey && !targetChoices) {
      const numCommandPartsInArgv = commandPathParts.length;
      // The index is the count of positional args already typed for the current command.
      // It's the total args minus the script name and the command parts.
      const positionalIndexInNode = rawArgv.length - 1 - numCommandPartsInArgv;

      if (currentNode.positionals && currentNode.positionals[positionalIndexInNode]) {
        const positionalDef = currentNode.positionals[positionalIndexInNode];
        if (positionalDef.choices) {
          targetChoices = positionalDef.choices;
        } else if (positionalDef.completionKey) {
          targetCompletionKey = positionalDef.completionKey;
        }
      } else {
        if (currentNode.children && currentNode.name !== '$partial_match_parent') {
          suggestions.push(...currentNode.children.map(n => n.name).filter(n => n !== '$0'));
        }
      }
    }
  }

  if (targetChoices) {
    suggestions.push(...targetChoices);
  } else if (targetCompletionKey) {
    const dynamicSuggestionsFn = completionTracker[`get${targetCompletionKey.charAt(0).toUpperCase() + targetCompletionKey.slice(1)}`];
    if (typeof dynamicSuggestionsFn === 'function') {
      const dynamicCompletions = dynamicSuggestionsFn();
      suggestions.push(...dynamicCompletions);
    }
  }

  return [...new Set(suggestions)].filter(s => s.startsWith(current));
}

module.exports = { getSuggestions, loadCache };
