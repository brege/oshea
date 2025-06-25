// scripts/generate-cli-tree.js

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// --- Configuration ---
const COMMANDS_DIR = path.resolve(__dirname, '../src/commands');

// --- Dynamic Proxy Yargs Stub ---
function createYargsStub() {
    const stub = new Proxy({
        options: {},
        positionals: [],
        option(key, opt) {
            this.options[key] = opt;
            return stub;
        },
        positional(key, opt) {
            this.positionals.push({ key, ...opt });
            return stub;
        }
    }, {
        get(target, prop) {
            if (prop in target) return target[prop];
            if (['command', 'demandCommand', 'epilog', 'help', 'version', 'alias', 'strictCommands', 'usage', 'middleware', 'completion', 'fail'].includes(prop)) {
                 return (...args) => stub;
            }
            if (prop === 'argv') return {};
            if (prop === 'showHelp') return () => {};
            return (...args) => stub;
        }
    });
    return stub;
}

// --- Command Tree Discovery ---
function parseBaseCommand(commandDef) {
    const cmdString = Array.isArray(commandDef) ? commandDef[0] : commandDef;
    return cmdString.split(' ')[0];
}

function discoverCommandTree(dir, prefixParts = []) {
    const nodesMap = new Map();
    const entries = fs.readdirSync(dir);

    // Get global options and default command info from the main cli.js if this is the top level discovery
    if (prefixParts.length === 0) {
        let globalOptionsList = [
            'config', 'factory-defaults', 'coll-root', // Explicitly known global options
            'help', 'version', 'h', 'v' // Standard Yargs global options and aliases
        ];
        let defaultCommandPositionals = [];
        let defaultCommandOptions = [];

        try {
            // Simulate the default command to extract its specific options/positionals
            // This is your implicit `convert` via markdown file.
            const convertCmdModule = require('../src/commands/convertCmd.js');
            const defaultCmdStub = createYargsStub();
            if (typeof convertCmdModule.defaultCmd.builder === 'function') {
                convertCmdModule.defaultCmd.builder(defaultCmdStub);
            }
            defaultCommandPositionals = (defaultCmdStub.positionals || []).map(p => `<${p.key}>`);
            defaultCommandOptions = Object.keys(defaultCmdStub.options || {});
        } catch (builderError) {
            console.warn(chalk.yellow(`WARN: Could not extract default command builder info for $0 node: ${builderError.message}`));
        }

        // Combine unique global options and default command options for $0
        const finalOptionsFor$0 = [...new Set([...globalOptionsList, ...defaultCommandOptions])].sort();
        const finalPositionalsFor$0 = [...new Set([...defaultCommandPositionals])];


        nodesMap.set('$0', {
            name: '$0',
            options: finalOptionsFor$0,
            positionals: finalPositionalsFor$0,
            children: []
        });
    }


    for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        if (fs.statSync(fullPath).isDirectory()) {
            const groupName = path.basename(fullPath);
            nodesMap.set(groupName, {
                name: groupName,
                children: discoverCommandTree(fullPath, [...prefixParts, groupName]),
                options: [],
                positionals: []
            });
        } else if (entry.endsWith('Cmd.js')) {
            const commandModule = require(fullPath);

            const processAndAddCommand = (cmdObj) => {
                const commandDefinition = cmdObj.command;
                if (!commandDefinition) return;

                const commandName = parseBaseCommand(commandDefinition);
                const yargsStub = createYargsStub();

                if (typeof cmdObj.builder === 'function') {
                    try {
                        cmdObj.builder(yargsStub);
                    } catch (e) {
                         // console.error(chalk.yellow(`WARN: Error in builder for ${commandName}: ${e.message}`));
                    }
                }
                const options = Object.keys(yargsStub.options || {});
                const positionals = (yargsStub.positionals || []).map(p => `<${p.key}>`);

                let children = [];
                if (/<subcommand>/.test(commandDefinition) && fs.existsSync(path.join(dir, commandName))) {
                    children = discoverCommandTree(
                        path.join(dir, commandName),
                        [...prefixParts, commandName]
                    );
                }

                if (nodesMap.has(commandName)) {
                    const existingNode = nodesMap.get(commandName);
                    existingNode.options = [...new Set([...existingNode.options, ...options])];
                    existingNode.positionals = [...new Set([...existingNode.positionals, ...positionals])];
                    if (children.length > 0 && existingNode.children.length === 0) {
                         existingNode.children = children;
                    }
                } else {
                    nodesMap.set(commandName, {
                        name: commandName,
                        options,
                        positionals,
                        children
                    });
                }
            };

            if (
                typeof commandModule === 'object' &&
                !Array.isArray(commandModule) &&
                Object.keys(commandModule).length > 0 &&
                Object.values(commandModule).every(v => v && typeof v === 'object' && 'command' in v)
            ) {
                for (const cmdObj of Object.values(commandModule)) {
                    processAndAddCommand(cmdObj);
                }
            } else {
                processAndAddCommand(commandModule);
            }
        }
    }
    return Array.from(nodesMap.values());
}

// --- Pretty Print Tree ---
function printTree(nodes, indent = '') {
    for (const node of nodes) {
        let line = indent + chalk.bold(node.name);
        if (node.positionals && node.positionals.length) {
            line += ' ' + node.positionals.join(' ');
        }
        console.log(line);
        if (node.options && node.options.length) {
            for (const opt of node.options.sort()) {
                console.log(indent + '  ' + chalk.gray('--' + opt));
            }
        }
        if (node.children && node.children.length) {
            printTree(node.children, indent + '  ');
        }
    }
}

// --- Run ---
if (require.main === module) {
    const commandTree = discoverCommandTree(COMMANDS_DIR);
    console.log(chalk.cyan('md-to-pdf command tree:'));
    printTree(commandTree);
}

// Export for use in generate-completion-cache.js
module.exports = { discoverCommandTree };
