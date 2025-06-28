// src/commands/convertCmd.js
const path = require('path');
const os = require('os');
const fs = require('fs');
const fsp = require('fs').promises;
const { determinePluginToUse } = require('../plugin_determiner');
const PluginManager = require('../PluginManager');

const cliOptionsForConvert = (yargs) => {
  yargs
    .positional("markdownFile", { 
      describe: "path to the input markdown file", 
      type: "string" 
    })
    .option("plugin", { 
      alias: "p", 
      describe: "plugin to use (name or path)", 
      type: "string",
      completionKey: 'usablePlugins' 
    })
    .option("outdir", { 
      alias: "o", 
      describe: "output directory (defaults to system temp)", 
      type: "string" 
    })
    .option("filename", { 
      alias: "f", 
      describe: "output pdf filename", 
      type: "string" 
    })
    .option("open", { 
      describe: "open pdf after generation", 
      type: "boolean", 
      default: true 
    })
    .option("watch", { 
      alias: "w", 
      describe: "watch for changes and re-convert", 
      type: "boolean", 
      default: false 
    })
    .epilogue('Plugin precedence: --plugin flag > front matter > local .config.yaml > default.');
};

module.exports = {
  explicitConvert: {
    command: "convert <markdownFile>",
    describe: "convert a markdown file to PDF",
    builder: cliOptionsForConvert,
    handler: async (args) => {
      args.isLazyLoad = false;
    }
  },
  defaultCmd: {
    command: '$0 [markdownFile]',
    describe: "convert a markdown file to PDF (default command)",
    builder: cliOptionsForConvert,
    handler: async (args) => {}
  },
};
