// scripts/generate-help-checklist.js
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

// --- Configuration ---
const COMMANDS_DIR = path.resolve(__dirname, '../src/commands');
const CHECKLIST_PATH = path.resolve(__dirname, '../test/docs/help-text-checklist.md');
const ROOT_CMD_NAME = 'md-to-pdf';
const CLI_PATH = path.resolve(__dirname, '../cli.js');

const START_MARKER = '<!-- help-checklist-start -->';
const END_MARKER = '<!-- help-checklist-end -->';


// --- Discovery Logic ---

function parseBaseCommand(commandDef) {
    const cmdString = Array.isArray(commandDef) ? commandDef[0] : commandDef;
    return cmdString.split(' ')[0];
}

function discoverCommands(dir, prefixParts = []) {
    let commands = [];
    const entries = fs.readdirSync(dir);

    for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        if (fs.statSync(fullPath).isDirectory()) {
            const groupName = path.basename(fullPath);
            commands.push([...prefixParts, groupName]);
            commands.push(...discoverCommands(fullPath, [...prefixParts, groupName]));
        } else if (entry.endsWith('Cmd.js')) {
            const commandModule = require(fullPath);
            if (!commandModule.command) continue;

            let commandDefinition = commandModule.command;
            if (commandModule.explicitConvert && commandModule.explicitConvert.command) {
                commandDefinition = commandModule.explicitConvert.command;
            }

            const commandName = parseBaseCommand(commandDefinition);
            if (commandName === '$0' || commandName === 'plugin' || commandName === 'collection') {
                continue;
            }
            commands.push([...prefixParts, commandName]);
        }
    }
    return commands;
}

// --- Checklist Interaction Logic ---

function getExistingChecklistStates(content) {
    const states = new Map();
    const checklistRegex = /-\s\[([ x])\]\s`(.+?) --help`/g;
    let match;
    while ((match = checklistRegex.exec(content)) !== null) {
        const status = match[1];
        const command = match[2];
        states.set(command, status);
    }
    return states;
}

function updateChecklistFile() {
    if (!fs.existsSync(CHECKLIST_PATH)) {
        console.error(`ERROR: Checklist file not found at ${CHECKLIST_PATH}`);
        return;
    }
    const commandPartsList = discoverCommands(COMMANDS_DIR);
    commandPartsList.push([]);
    const allCommands = Array.from(new Set(commandPartsList.map(p => [ROOT_CMD_NAME, ...p].join(' ')))).sort();
    const originalContent = fs.readFileSync(CHECKLIST_PATH, 'utf8');
    const existingStates = getExistingChecklistStates(originalContent);
    const newChecklistItems = allCommands.map(cmd => {
        const status = existingStates.get(cmd) || ' ';
        return `- [${status}] \`${cmd} --help\``;
    });
    const newChecklistBlock = newChecklistItems.join('\n');
    const fullSection = `${START_MARKER}\n\n${newChecklistBlock}\n\n${END_MARKER}`;
    const replacementRegex = new RegExp(`${START_MARKER}[\\s\\S]*${END_MARKER}`, 'g');
    if (!replacementRegex.test(originalContent)) {
        console.error(`ERROR: Could not find markers in ${CHECKLIST_PATH}.`);
        return;
    }
    const finalContent = originalContent.replace(replacementRegex, fullSection);
    fs.writeFileSync(CHECKLIST_PATH, finalContent, 'utf8');
    console.log(`✔ Successfully updated checklist in ${CHECKLIST_PATH}`);
}

function executeNextUnchecked() {
    if (!fs.existsSync(CHECKLIST_PATH)) {
        console.error(`ERROR: Checklist file not found at ${CHECKLIST_PATH}`);
        return;
    }
    const content = fs.readFileSync(CHECKLIST_PATH, 'utf8');
    const checklistRegex = /-\s\[([ x])\]\s`(.+?) --help`/g;
    let match;
    let nextCommandToRun = null;

    while ((match = checklistRegex.exec(content)) !== null) {
        const status = match[1];
        if (status === ' ') {
            nextCommandToRun = match[2];
            break;
        }
    }

    if (nextCommandToRun) {
        console.log(`\n➜ Executing next unchecked help command: ${nextCommandToRun} --help\n`);
        const commandArgs = nextCommandToRun.replace(ROOT_CMD_NAME, '').trim();
        exec(`node "${CLI_PATH}" ${commandArgs} --help`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Execution failed: ${error.message}`);
                console.error(stderr);
                return;
            }
            console.log(stdout);
        });
    } else {
        console.log('✔ All items in the checklist are complete. Nothing to do!');
    }
}

// --- CLI Setup ---

yargs(hideBin(process.argv))
    .scriptName("generate-help-checklist")
    .command('$0', 'Prints a new checklist to stdout.', () => {}, (argv) => {
        // Default behavior is to show help
        yargs.showHelp();
    })
    .command('list', 'Prints a new checklist to stdout (same as default).', () => {}, (argv) => {
        const commandPartsList = discoverCommands(COMMANDS_DIR);
        commandPartsList.push([]);
        const allCommands = Array.from(new Set(commandPartsList.map(p => [ROOT_CMD_NAME, ...p].join(' ')))).sort();
        console.log(allCommands.map(cmd => `- [ ] \`${cmd} --help\``).join('\n'));
    })
    .command('update', 'Updates the checklist file in test/docs/.', () => {}, (argv) => {
        updateChecklistFile();
    })
    .command('next', 'Finds the next unchecked item in the checklist and executes its --help command.', () => {}, (argv) => {
        executeNextUnchecked();
    })
    .demandCommand(1, 'Please specify a command: `list`, `update`, or `next`.')
    .help()
    .argv;

