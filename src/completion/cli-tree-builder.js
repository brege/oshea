// src/completion/cli-tree-builder.js
require('module-alias/register');

const fs = require('node:fs');
const path = require('node:path');
const { convertCommandPath, loggerPath } = require('@paths');
const logger = require(loggerPath);

// Dynamic Proxy Yargs Stub
function createYargsStub() {
  const stub = new Proxy(
    {
      options: {},
      positionals: [],
      option(key, opt) {
        this.options[key] = {
          ...opt,
          completionKey: opt.completionKey,
          choices: opt.choices,
        };
        return stub;
      },
      positional(key, opt) {
        this.positionals.push({
          key,
          ...opt,
          completionKey: opt.completionKey,
          choices: opt.choices,
        });
        return stub;
      },
    },
    {
      get(target, prop) {
        if (prop in target) return target[prop];
        const yargsChainableMethods = [
          'command',
          'demandCommand',
          'epilog',
          'help',
          'version',
          'alias',
          'strictCommands',
          'usage',
          'middleware',
          'completion',
          'fail',
        ];
        if (yargsChainableMethods.includes(prop)) {
          return (..._args) => stub;
        }
        if (prop === 'argv') return {};
        if (prop === 'showHelp') return () => {};
        return (..._args) => stub;
      },
    },
  );
  return stub;
}

// Command Tree Discovery
function parseBaseCommand(commandDef) {
  const cmdString = Array.isArray(commandDef) ? commandDef[0] : commandDef;
  return cmdString.split(' ')[0];
}

// Command Tree Discovery
function discoverCommandTree(dir, prefixParts = []) {
  const nodesMap = new Map();
  const entries = fs.readdirSync(dir);

  if (prefixParts.length === 0) {
    const globalOptionsList = [
      'config',
      'factory-defaults',
      'plugins-root',
      'help',
      'version',
      'h',
      'v',
    ];
    let defaultCommandPositionals = [];
    let defaultCommandOptions = [];

    try {
      const convertCommandModule = require(convertCommandPath);
      const defaultCommandStub = createYargsStub();
      if (typeof convertCommandModule.defaultCommand.builder === 'function') {
        convertCommandModule.defaultCommand.builder(defaultCommandStub);
      }
      defaultCommandPositionals = (defaultCommandStub.positionals || []).map(
        (p) => ({
          key: p.key,
          completionKey: p.completionKey,
          choices: p.choices,
        }),
      );
      defaultCommandOptions = Object.keys(defaultCommandStub.options || {}).map(
        (optKey) => ({
          name: optKey,
          completionKey: defaultCommandStub.options[optKey].completionKey,
          choices: defaultCommandStub.options[optKey].choices,
        }),
      );
    } catch (builderError) {
      logger.warn('Could not extract default command builder info', {
        context: 'CLITreeBuilder',
        node: '$0',
        error: builderError.message,
      });
    }

    const globalOptionsFormatted = globalOptionsList.map((name) => ({ name }));
    const allOptionsFor$0 = [
      ...new Set([...globalOptionsFormatted, ...defaultCommandOptions]),
    ];
    const finalOptionsFor$0 = allOptionsFor$0.sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    const finalPositionalsFor$0 = [...new Set([...defaultCommandPositionals])];

    nodesMap.set('$0', {
      name: '$0',
      options: finalOptionsFor$0,
      positionals: finalPositionalsFor$0,
      children: [],
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
        positionals: [],
      });
    } else if (entry.endsWith('.command.js')) {
      const commandModule = require(fullPath);

      const processAndAddCommand = (cmdObj) => {
        if (!cmdObj || !cmdObj.command) return;
        const commandDefinition = cmdObj.command;

        const commandName = parseBaseCommand(commandDefinition);
        const yargsStub = createYargsStub();

        if (typeof cmdObj.builder === 'function') {
          try {
            cmdObj.builder(yargsStub);
          } catch {
            // logger.warn(`Could not extract command builder info for ${commandName} node: ${e.message}`, { module: 'src/completion/cli-tree-builder.js' });
          }
        }
        const options = Object.keys(yargsStub.options || {}).map((optKey) => ({
          name: optKey,
          completionKey: yargsStub.options[optKey].completionKey,
          choices: yargsStub.options[optKey].choices,
        }));
        const positionals = (yargsStub.positionals || []).map((p) => ({
          key: p.key,
          completionKey: p.completionKey,
          choices: p.choices,
        }));

        let children = [];
        if (
          /<subcommand>/.test(commandDefinition) &&
          fs.existsSync(path.join(dir, commandName))
        ) {
          children = discoverCommandTree(path.join(dir, commandName), [
            ...prefixParts,
            commandName,
          ]);
        }

        if (nodesMap.has(commandName)) {
          const existingNode = nodesMap.get(commandName);
          const mergedOptions = new Map();
          [...existingNode.options, ...options].forEach((opt) => {
            mergedOptions.set(opt.name, opt);
          });
          existingNode.options = Array.from(mergedOptions.values());

          const mergedPositionals = new Map();
          [...existingNode.positionals, ...positionals].forEach((pos) => {
            mergedPositionals.set(pos.key, pos);
          });
          existingNode.positionals = Array.from(mergedPositionals.values());

          if (children.length > 0 && existingNode.children.length === 0) {
            existingNode.children = children;
          }
        } else {
          nodesMap.set(commandName, {
            name: commandName,
            options,
            positionals,
            children,
          });
        }
      };

      const isMultiCommandModule =
        typeof commandModule === 'object' &&
        !Array.isArray(commandModule) &&
        Object.keys(commandModule).length > 0 &&
        Object.values(commandModule).every(
          (v) => v && typeof v === 'object' && 'command' in v,
        );

      if (isMultiCommandModule) {
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
