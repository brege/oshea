// src/completion.js

const fs = require('fs');
const path = require('path');
const completionTracker = require('./completion_tracker');

const CACHE_PATH = path.join(process.env.HOME || process.env.USERPROFILE, '.cache/md-to-pdf/cli-tree.json');

/**
 * Loads the command tree cache from the specified path.
 * @returns {Array<Object>} The parsed command tree, or an empty array if loading fails.
 */
function loadCache() {
    try {
        return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
    } catch (e) {
        // Fail silently or log only in debug mode for completion
        return [];
    }
}

/**
 * Recursively finds the command node corresponding to the given command parts.
 * It prioritizes exact matches for subcommands, and handles the case where
 * the last part is a partial match for a subcommand.
 * @param {Array<Object>} tree The current level of the command tree to search within.
 * @param {Array<string>} parts An array of command parts (e.g., ['plugin', 'create']).
 * @returns {Object|null} The found command node, or an object representing the parent for partial matches.
 */
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
    // If it's a partial match for a command, return the parent's children
    if (rest.length === 0 && tree.some(n => n.name.startsWith(head))) {
        return { children: tree, name: '$partial_match_parent', options: [], positionals: [] };
    }
    return null;
}

/**
 * Generates completion suggestions based on the current CLI arguments and input.
 * This function is now SYNCHRONOUS.
 * @param {Object} argv Parsed arguments object from Yargs.
 * @param {string} current The string currently being typed by the user.
 * @returns {Array<string>} An array of suggested completion strings.
 */
function getSuggestions(argv, current) {
    const commandPathParts = argv._.slice(1).filter(Boolean); // Extract command/subcommand parts
    const cache = loadCache();
    let suggestions = [];

    const globalNode = cache.find(n => n.name === '$0');
    let globalOptionsAsFlags = (globalNode?.options || []).map(opt => `--${opt.name}`);

    let currentNode = findNode(cache, commandPathParts);
    if (!currentNode) {
        // If no matching command node, provide global options or top-level commands
        if (current.startsWith('-')) {
            suggestions.push(...globalOptionsAsFlags);
        } else {
            suggestions.push(...cache.filter(n => n.name !== '$0').map(n => n.name)); // Top-level commands
            if (globalNode && globalNode.positionals) {
                suggestions.push(...globalNode.positionals.map(p => p.key));
            }
        }
        return [...new Set(suggestions)].filter(s => s.startsWith(current));
    }

    let targetCompletionKey = null;
    let targetChoices = null;

    // Logic for completing Options (flags like --plugin)
    if (current.startsWith('-')) {
        const partialOptionName = current.substring(2);
        const allOptions = [...(currentNode.options || []), ...(globalNode?.options || [])];
        const matchedOption = allOptions.find(opt => opt.name === partialOptionName || opt.name.startsWith(partialOptionName));

        if (matchedOption) {
            if (matchedOption.choices) {
                targetChoices = matchedOption.choices;
            } else if (matchedOption.completionKey) {
                targetCompletionKey = matchedOption.completionKey;
            }
        }

        // Add static options (e.g., --help, --outdir)
        suggestions.push(...(currentNode.options || []).map(opt => `--${opt.name}`));
        suggestions.push(...globalOptionsAsFlags);

    } else {
        // Logic for completing Positional Arguments OR Subcommands
        const numCommandPartsInArgv = commandPathParts.length;
        const positionalIndexInNode = argv._.length - (numCommandPartsInArgv + 1);

        // Check if the current context implies a positional argument from the current command node
        if (currentNode.positionals && currentNode.positionals[positionalIndexInNode]) {
            const positionalDef = currentNode.positionals[positionalIndexInNode];
            if (positionalDef.choices) {
                targetChoices = positionalDef.choices;
            } else if (positionalDef.completionKey) {
                targetCompletionKey = positionalDef.completionKey;
            }

        } else {
            // If no specific positional is matched, suggest subcommands or general positional keys
            if (currentNode.children && currentNode.name !== '$partial_match_parent') {
                suggestions.push(...currentNode.children.map(n => n.name).filter(n => n !== '$0'));
            }
            // Add static positional keys that haven't been 'consumed' yet
            if (currentNode.positionals) {
                const unconsumedPositionals = currentNode.positionals.slice(positionalIndexInNode);
                suggestions.push(...unconsumedPositionals.filter(p => !p.choices && !p.completionKey).map(p => p.key));
            }
        }
    }

    // Prioritize suggestions based on targetChoices, then targetCompletionKey
    if (targetChoices) {
        suggestions.push(...targetChoices);
    } else if (targetCompletionKey) {
        const dynamicSuggestionsFn = completionTracker[`get${targetCompletionKey.charAt(0).toUpperCase() + targetCompletionKey.slice(1)}`];
        if (typeof dynamicSuggestionsFn === 'function') {
            const dynamicCompletions = dynamicSuggestionsFn();
            suggestions.push(...dynamicCompletions);
        } else {
            // console.warn(`WARN: No completion tracker function found for key: ${targetCompletionKey}`);
        }
    }
    
    return [...new Set(suggestions)].filter(s => s.startsWith(current));
}

module.exports = { getSuggestions, loadCache };
