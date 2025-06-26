// src/tab-completion/engine.js

const fs = require('fs');
const path = require('path');
const completionTracker = require('./tracker');

const CACHE_PATH = path.join(process.env.HOME || process.env.USERPROFILE, '.cache/md-to-pdf/cli-tree.json');

function loadCache() {
    try {
        return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
    } catch (e) {
        return [];
    }
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
    const commandPathParts = argv._.slice(1).filter(Boolean);
    const cache = loadCache();
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

    // --- LOGICAL CHANGE START ---
    // Check if the PREVIOUS argument was a flag that needs a value.
    if (previousArg && previousArg.startsWith('--')) {
        const prevOptionName = previousArg.substring(2);
        const prevOptionDef = allOptions.find(opt => opt.name === prevOptionName);

        if (prevOptionDef && prevOptionDef.completionKey) {
            targetCompletionKey = prevOptionDef.completionKey;
        } else if (prevOptionDef && prevOptionDef.choices) {
            targetChoices = prevOptionDef.choices;
        }
    }
    // --- LOGICAL CHANGE END ---


    if (current.startsWith('-')) {
        suggestions.push(...(currentNode.options || []).map(opt => `--${opt.name}`));
        suggestions.push(...globalOptionsAsFlags);
    } else {
        if (!targetCompletionKey && !targetChoices) {
            const numCommandPartsInArgv = commandPathParts.length;
            const positionalIndexInNode = argv._.length - (numCommandPartsInArgv + 1);

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
                if (currentNode.positionals) {
                    const unconsumedPositionals = currentNode.positionals.slice(positionalIndexInNode);
                    suggestions.push(...unconsumedPositionals.filter(p => !p.choices && !p.completionKey).map(p => p.key));
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
