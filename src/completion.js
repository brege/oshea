// src/completion.js

const fs = require('fs');
const path = require('path');
const completionProvider = require('./completion_provider');

const CACHE_PATH = path.join(process.env.HOME || process.env.USERPROFILE, '.cache/md-to-pdf/cli-tree.json');

/**
 * Loads the command tree cache from the specified path.
 * @returns {Array<Object>} The parsed command tree, or an empty array if loading fails.
 */
function loadCache() {
    try {
        return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
    } catch (e) {
        console.error(`Error loading cache: ${e.message}`);
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
    if (rest.length === 0) {
        return { children: tree, name: '$partial_match_parent', options: [], positionals: [] };
    }
    return null;
}

/**
 * Get dynamic suggestions for a given command context.
 * This function is now SYNCHRONOUS.
 * @param {string} commandPathStr The string representation of the command path (e.g., 'plugin help').
 * @param {Object} argv Parsed arguments object.
 * @returns {Array<string>|null} An array of dynamic suggestions, or null if none.
 */
function getDynamicSuggestions(commandPathStr, argv) { // Removed 'async' keyword
    switch (commandPathStr) {
        case 'plugin help':
        case 'generate':
        case 'config --plugin':
            return completionProvider.getUsablePlugins(argv); // Removed 'await'
            
        case 'convert':
            if (argv.plugin === '' || (argv.p && argv.p === '')) {
                return completionProvider.getUsablePlugins(argv); // Removed 'await'
            }
            break;

        case 'plugin disable':
            return completionProvider.getEnabledPlugins(argv); // Removed 'await'
            
        case 'plugin enable':
            return completionProvider.getAvailablePlugins(argv); // Removed 'await'

        case 'collection remove':
        case 'collection update':
        case 'update':
            return completionProvider.getDownloadedCollections(argv); // Removed 'await'
    }
    return null; // No dynamic provider for this context
}

/**
 * Generates completion suggestions based on the current CLI arguments and input.
 * This function is now SYNCHRONOUS.
 * @param {Object} argv Parsed arguments object from Yargs.
 * @param {string} current The string currently being typed by the user.
 * @returns {Array<string>} An array of suggested completion strings.
 */
function getSuggestions(argv, current) { // Removed 'async' keyword
    const commandPathParts = argv._.slice(1).filter(Boolean);
    const commandPathStr = commandPathParts.join(' ');
    
    // Attempt to get dynamic suggestions first if not typing a flag
    if (!current.startsWith('-')) {
        const dynamicSuggestions = getDynamicSuggestions(commandPathStr, argv); // Removed 'await'
        if (dynamicSuggestions !== null && Array.isArray(dynamicSuggestions)) {
            return dynamicSuggestions.filter(s => s.startsWith(current));
        }
    }
    
    // Fallback to Static Completion Logic
    const cache = loadCache();
    let suggestions = [];
    const globalNode = cache.find(n => n.name === '$0');
    let globalOptionsAsFlags = (globalNode?.options || []).map(opt => `--${opt}`);

    if (current.startsWith('-')) {
        let commandOptionsAsFlags = [];
        let currentNode = findNode(cache, commandPathParts);
        if (currentNode && currentNode.options) {
            commandOptionsAsFlags = currentNode.options.map(opt => `--${opt}`);
        }
        suggestions = [...new Set([...commandOptionsAsFlags, ...globalOptionsAsFlags])];
    } else {
        let currentNode = findNode(cache, commandPathParts);
        if (currentNode && (currentNode.name === '$partial_match_parent' || currentNode.isRoot)) {
            if (currentNode.children) suggestions.push(...currentNode.children.map(n => n.name).filter(n => n !== '$0'));
            if (currentNode.isRoot && globalNode && globalNode.positionals) {
                suggestions.push(...globalNode.positionals);
            }
        } else if (currentNode) {
            if (currentNode.children && currentNode.children.length > 0) {
                suggestions.push(...currentNode.children.map(n => n.name));
            } else if (currentNode.positionals) {
                suggestions.push(...currentNode.positionals);
            }
        }
    }
    return [...new Set(suggestions)].filter(s => s.startsWith(current));
}

module.exports = { getSuggestions, loadCache };
