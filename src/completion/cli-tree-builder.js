// src/completion/cli-tree-builder.js

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// --- Configuration ---
const COMMANDS_DIR = path.resolve(__dirname, '../commands');

// --- Dynamic Proxy Yargs Stub ---
function createYargsStub() {
    const stub = new Proxy({
        options: {},
        positionals: [],
        option(key, opt) {
            this.options[key] = { ...opt, completionKey: opt.completionKey, choices: opt.choices };
            return stub;
        },
        positional(key, opt) {
            this.positionals.push({ key, ...opt, completionKey: opt.completionKey, choices: opt.choices });
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

    if (prefixParts.length === 0) {
        let globalOptionsList = [
            'config', 'factory-defaults', 'coll-root',
            'help', 'version', 'h', 'v'
        ];
        let defaultCommandPositionals = [];
        let defaultCommandOptions = [];

        try {
            const convertCmdModule = require('../cli/commands/convertCmd');
            const defaultCmdStub = createYargsStub();
            if (typeof convertCmdModule.defaultCmd.builder === 'function') {
                convertCmdModule.defaultCmd.builder(defaultCmdStub);
            }
            defaultCommandPositionals = (defaultCmdStub.positionals || []).map(p => ({key: p.key, completionKey: p.completionKey, choices: p.choices}));
            defaultCommandOptions = Object.keys(defaultCmdStub.options || {}).map(optKey => ({name: optKey, completionKey: defaultCmdStub.options[optKey].completionKey, choices: defaultCmdStub.options[optKey].choices}));
        } catch (builderError) {
            console.warn(chalk.yellow(`WARN: Could not extract default command builder info for $0 node: ${builderError.message}`));
        }

        const finalOptionsFor$0 = [...new Set([...globalOptionsList.map(name => ({name})), ...defaultCommandOptions])].sort((a,b) => a.name.localeCompare(b.name));
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
                if (!cmdObj || !cmdObj.command) return;
                const commandDefinition = cmdObj.command;

                const commandName = parseBaseCommand(commandDefinition);
                const yargsStub = createYargsStub();

                if (typeof cmdObj.builder === 'function') {
                    try {
                        cmdObj.builder(yargsStub);
                    } catch (e) {
                         // console.error(chalk.yellow(`WARN: Error in builder for ${commandName}: ${e.message}`));
                    }
                }
                const options = Object.keys(yargsStub.options || {}).map(optKey => ({name: optKey, completionKey: yargsStub.options[optKey].completionKey, choices: yargsStub.options[optKey].choices}));
                const positionals = (yargsStub.positionals || []).map(p => ({key: p.key, completionKey: p.completionKey, choices: p.choices}));

                let children = [];
                if (/<subcommand>/.test(commandDefinition) && fs.existsSync(path.join(dir, commandName))) {
                    children = discoverCommandTree(
                        path.join(dir, commandName),
                        [...prefixParts, commandName]
                    );
                }

                if (nodesMap.has(commandName)) {
                    const existingNode = nodesMap.get(commandName);
                    const mergedOptions = new Map();
                    [...existingNode.options, ...options].forEach(opt => mergedOptions.set(opt.name, opt));
                    existingNode.options = Array.from(mergedOptions.values());

                    const mergedPositionals = new Map();
                    [...existingNode.positionals, ...positionals].forEach(pos => mergedPositionals.set(pos.key, pos));
                    existingNode.positionals = Array.from(mergedPositionals.values());

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

module.exports = { discoverCommandTree };
