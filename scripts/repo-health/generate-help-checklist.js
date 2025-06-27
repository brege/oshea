const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const chalk = require('chalk');

// --- Configuration ---
const COMMANDS_DIR = path.resolve(__dirname, '.../../src/commands');
const CHECKLIST_PATH = path.resolve(__dirname, '../../test/docs/help-text-checklist.md');
const ROOT_CMD_NAME = 'md-to-pdf';
const CLI_PATH = path.resolve(__dirname, '../../cli.js');
const START_MARKER = '<!-- help-checklist-start -->';
const END_MARKER = '<!-- help-checklist-end -->';

// --- Utility ---
function getRelativeChecklistPath() {
    return path.relative(process.cwd(), CHECKLIST_PATH);
}

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

// --- Epilogue Helper ---
function printChecklistEpilogue() {
    console.log(`\n(${chalk.bold('Checklist markdown')}: ${chalk.cyan(getRelativeChecklistPath())})`);
}

// --- CLI Setup ---
const yargsInstance = yargs(hideBin(process.argv))
    .scriptName("generate-help-checklist")
    .command('list', 'Prints the checklist with current state.', () => {}, (argv) => {
        printChecklistWithState();
        printChecklistEpilogue();
    })
    .command('update', 'Updates the checklist file in test/docs/.', () => {}, (argv) => {
        updateChecklistFile();
        printChecklistEpilogue();
    })
    .command('next', 'Finds the next unchecked item in the checklist and executes its --help command.', () => {}, (argv) => {
        executeNextUnchecked();
    })
    .command('all', 'Runs --help for every checklist item in order.', () => {}, (argv) => {
        executeAllHelp();
    })
    .command('group <group>', 'Show help for a group: base, plugin, or collection', (yargs) => {
        yargs.positional('group', {
            describe: 'Group to show: base, plugin, or collection',
            choices: ['base', 'plugin', 'collection']
        });
    }, (argv) => {
        executeGroupHelp(argv.group);
    })
    .help(false) // We'll handle epilogue ourselves
    .wrap(null);

const argv = yargsInstance.argv;

// If no command is provided, default to "list"
if (!argv._[0]) {
    yargsInstance.parse('list');
}

// --- Overriding Help Output to Add Epilogue ---
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    yargsInstance.showHelp();
    printChecklistEpilogue();
    process.exit(0);
}

// --- Checklist State-Aware List ---
function printChecklistWithState() {
    if (!fs.existsSync(CHECKLIST_PATH)) {
        console.error(`ERROR: Checklist file not found at ${CHECKLIST_PATH}`);
        return;
    }
    const originalContent = fs.readFileSync(CHECKLIST_PATH, 'utf8');
    const existingStates = getExistingChecklistStates(originalContent);

    const commandPartsList = discoverCommands(COMMANDS_DIR);
    commandPartsList.push([]);
    const allCommands = Array.from(new Set(commandPartsList.map(p => [ROOT_CMD_NAME, ...p].join(' ')))).sort();

    allCommands.forEach(cmd => {
        const status = existingStates.get(cmd) || ' ';
        console.log(`- [${status}] \`${cmd} --help\``);
    });
}

// --- Next Command with Gray Help Output ---
function executeNextUnchecked() {
    if (!fs.existsSync(CHECKLIST_PATH)) {
        console.error(`ERROR: Checklist file not found at ${CHECKLIST_PATH}`);
        printChecklistEpilogue();
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
                printChecklistEpilogue();
                return;
            }
            process.stdout.write(chalk.gray(stdout));
            printChecklistEpilogue();
        });
    } else {
        console.log('✔ All items in the checklist are complete. Nothing to do!');
        printChecklistEpilogue();
    }
}

// --- All Command: Run help for every checklist item ---
function executeAllHelp() {
    if (!fs.existsSync(CHECKLIST_PATH)) {
        console.error(`ERROR: Checklist file not found at ${CHECKLIST_PATH}`);
        printChecklistEpilogue();
        return;
    }
    const content = fs.readFileSync(CHECKLIST_PATH, 'utf8');
    const checklistRegex = /-\s\[([ x])\]\s`(.+?) --help`/g;
    let match;
    const commands = [];

    while ((match = checklistRegex.exec(content)) !== null) {
        commands.push(match[2]);
    }

    if (commands.length === 0) {
        console.log('No commands found in the checklist.');
        printChecklistEpilogue();
        return;
    }

    (function runNext(i) {
        if (i >= commands.length) {
            printChecklistEpilogue();
            return;
        }
        const cmd = commands[i];
        console.log(`\n➜ [${i + 1}/${commands.length}] ${cmd} --help\n`);
        const commandArgs = cmd.replace(ROOT_CMD_NAME, '').trim();
        exec(`node "${CLI_PATH}" ${commandArgs} --help`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Execution failed: ${error.message}`);
                console.error(stderr);
            } else {
                process.stdout.write(chalk.gray(stdout));
            }
            runNext(i + 1);
        });
    })(0);
}

// --- Group Command: Show help for a group of commands ---
function executeGroupHelp(group) {
    if (!['base', 'plugin', 'collection'].includes(group)) {
        console.error(`Unknown group: ${group}`);
        printChecklistEpilogue();
        return;
    }
    if (!fs.existsSync(CHECKLIST_PATH)) {
        console.error(`ERROR: Checklist file not found at ${CHECKLIST_PATH}`);
        printChecklistEpilogue();
        return;
    }
    const content = fs.readFileSync(CHECKLIST_PATH, 'utf8');
    const checklistRegex = /-\s\[([ x])\]\s`(.+?) --help`/g;
    let match;
    const commands = [];

    while ((match = checklistRegex.exec(content)) !== null) {
        const cmd = match[2];
        if (group === 'base') {
            // Only top-level commands (no space after root)
            if (!cmd.startsWith(`${ROOT_CMD_NAME} `) || cmd.split(' ').length === 2) {
                commands.push(cmd);
            }
        } else if (group === 'plugin') {
            if (cmd.startsWith(`${ROOT_CMD_NAME} plugin`)) {
                commands.push(cmd);
            }
        } else if (group === 'collection') {
            if (cmd.startsWith(`${ROOT_CMD_NAME} collection`)) {
                commands.push(cmd);
            }
        }
    }

    if (commands.length === 0) {
        console.log(`No commands found for group: ${group}`);
        printChecklistEpilogue();
        return;
    }

    (function runNext(i) {
        if (i >= commands.length) {
            printChecklistEpilogue();
            return;
        }
        const cmd = commands[i];
        console.log(`\n➜ [${i + 1}/${commands.length}] ${cmd} --help\n`);
        const commandArgs = cmd.replace(ROOT_CMD_NAME, '').trim();
        exec(`node "${CLI_PATH}" ${commandArgs} --help`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Execution failed: ${error.message}`);
                console.error(stderr);
            } else {
                process.stdout.write(chalk.gray(stdout));
            }
            runNext(i + 1);
        });
    })(0);
}

