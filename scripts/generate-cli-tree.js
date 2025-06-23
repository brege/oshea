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

function isMultiCommandModule(mod) {
    // Heuristic: has multiple keys, each with a 'command' property
    return Object.values(mod).every(
        v => v && typeof v === 'object' && 'command' in v
    );
}

function discoverCommandTree(dir, prefixParts = []) {
    let tree = [];
    const entries = fs.readdirSync(dir);

    for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        if (fs.statSync(fullPath).isDirectory()) {
            // Group command: recurse into subdirectory
            const groupName = path.basename(fullPath);
            tree.push({
                name: groupName,
                children: discoverCommandTree(fullPath, [...prefixParts, groupName])
            });
        } else if (entry.endsWith('Cmd.js')) {
            const commandModule = require(fullPath);

            // --- Multi-Command Module ---
            if (
                typeof commandModule === 'object' &&
                !Array.isArray(commandModule) &&
                Object.keys(commandModule).length > 0 &&
                isMultiCommandModule(commandModule)
            ) {
                for (const [key, cmdObj] of Object.entries(commandModule)) {
                    const commandDefinition = cmdObj.command;
                    const commandName = parseBaseCommand(commandDefinition);

                    // Collect options/flags and positionals if available
                    const yargsStub = createYargsStub();
                    if (typeof cmdObj.builder === 'function') {
                        try {
                            cmdObj.builder(yargsStub);
                        } catch (e) {}
                    }
                    const options = Object.keys(yargsStub.options || {});
                    const positionals = (yargsStub.positionals || []).map(p => `<${p.key}>`);

                    tree.push({
                        name: commandName,
                        options,
                        positionals,
                        children: []
                    });
                }
                continue;
            }

            // --- Simple/Group Command Module ---
            if (!commandModule.command) continue;
            let commandDefinition = commandModule.command;
            const commandName = parseBaseCommand(commandDefinition);

            // If this is a group command (e.g., plugin <subcommand>), recurse into subdir if present
            if (
                /<subcommand>/.test(commandDefinition) &&
                fs.existsSync(path.join(dir, commandName))
            ) {
                tree.push({
                    name: commandName,
                    children: discoverCommandTree(
                        path.join(dir, commandName),
                        [...prefixParts, commandName]
                    )
                });
                continue;
            }

            // Collect options/flags and positionals if available
            const yargsStub = createYargsStub();
            if (typeof commandModule.builder === 'function') {
                try {
                    commandModule.builder(yargsStub);
                } catch (e) {}
            }
            const options = Object.keys(yargsStub.options || {});
            const positionals = (yargsStub.positionals || []).map(p => `<${p.key}>`);

            tree.push({
                name: commandName,
                options,
                positionals,
                children: []
            });
        }
    }
    return tree;
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
            for (const opt of node.options) {
                console.log(indent + '  ' + chalk.gray('--' + opt));
            }
        }
        if (node.children && node.children.length) {
            printTree(node.children, indent + '  ');
        }
    }
}

// --- Run ---
const commandTree = discoverCommandTree(COMMANDS_DIR);
console.log(chalk.cyan('md-to-pdf command tree:'));
printTree(commandTree);

