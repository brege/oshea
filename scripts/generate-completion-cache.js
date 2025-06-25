// scripts/generate-completion-cache.js

const fs = require('fs');
const path = require('path');
const os = require('os');
const chalk = require('chalk'); // Added chalk for consistent logging

// Import the tree discovery logic from generate-cli-tree.js
const { discoverCommandTree } = require('./generate-cli-tree'); 

// Define the directory where your command modules reside
const COMMANDS_DIR = path.resolve(__dirname, '../src/commands');

/**
 * Determines the correct cache file path based on XDG_CACHE_HOME or user's home directory.
 * @returns {string} The full path to the completion cache file.
 */
function getCachePath() {
    const xdg = process.env.XDG_CACHE_HOME;
    if (xdg) {
        return path.join(xdg, 'md-to-pdf', 'cli-tree.json');
    }
    return path.join(os.homedir(), '.cache', 'md-to-pdf', 'cli-tree.json');
}

/**
 * Main function to discover the command tree and write it to a cache file.
 */
function main() {
    try {
        console.log(chalk.blue('Generating CLI completion cache...'));
        const commandTree = discoverCommandTree(COMMANDS_DIR); // Use the imported discovery function
        const cachePath = getCachePath();

        // Ensure the directory exists
        fs.mkdirSync(path.dirname(cachePath), { recursive: true });

        // Write the discovered tree to the cache file
        fs.writeFileSync(cachePath, JSON.stringify(commandTree, null, 2));

        console.log(chalk.green(`Completion cache successfully written to: ${cachePath}`));
    } catch (error) {
        console.error(chalk.red(`ERROR: Failed to generate completion cache: ${error.message}`));
        if (error.stack) {
            console.error(chalk.red(error.stack));
        }
        process.exit(1); // Exit with an error code
    }
}

// Execute the main function when the script is run
if (require.main === module) {
    main();
}

// If you need to export anything from this file (unlikely for a script like this), do so here.
