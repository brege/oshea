// src/commands/convertCmd.js
const path = require('path'); // For executeConversion, if it were moved here
const os = require('os');     // For executeConversion, if it were moved here
const fs = require('fs');       // For executeConversion, if it were moved here
const fsp = require('fs').promises; // For executeConversion, if it were moved here
const { determinePluginToUse } = require('../plugin_determiner');
const PluginManager = require('../PluginManager');
// Note: commonCommandHandler, openPdf, and executeConversion are assumed to be in cli.js
// and will be called by the handler. If we decide to move them, these requires would change.

// This function defines the options for both 'convert' and the default '$0' command
const cliOptionsForConvert = (yargs) => {
  yargs
    .positional("markdownFile", { 
      describe: "Path to the input Markdown file.", 
      type: "string" 
    })
    .option("plugin", { 
      alias: "p", 
      describe: "Plugin to use (name or path). Overrides front matter and local .config.yaml.", 
      type: "string" 
    })
    .option("outdir", { 
      alias: "o", 
      describe: "Output directory. Defaults to a system temporary directory if not specified.", 
      type: "string" 
    })
    .option("filename", { 
      alias: "f", 
      describe: "Output PDF filename.", 
      type: "string" 
    })
    .option("open", { 
      describe: "Open PDF after generation.", 
      type: "boolean", 
      default: true 
    })
    .option("watch", { 
      alias: "w", 
      describe: "Watch for changes.", 
      type: "boolean", 
      default: false 
    });
};

module.exports = {
  // For the explicit 'convert' command
  explicitConvert: {
    command: "convert <markdownFile>",
    describe: "Convert a single Markdown file to PDF using a specified plugin.",
    builder: cliOptionsForConvert, // Re-use the options definition
    handler: async (args, /* cliMain */) => { // cliMain might be passed if helpers are there
      args.isLazyLoad = false;
      // commonCommandHandler will be called from cli.js, passing executeConversion
      // This handler in the command module essentially just sets context (isLazyLoad)
      // and the actual execution is orchestrated by cli.js's main yargs setup
      // which calls commonCommandHandler.
      // For now, the handler in cli.js will get these args.
    }
  },
  // For the default '$0' command
  defaultCmd: {
    command: '$0 [markdownFile]',
    describe: "Converts a Markdown file to PDF. If markdownFile is provided, implicitly acts as 'convert'.",
    builder: cliOptionsForConvert, // Re-use the options definition
    handler: async (args, /* cliMain */) => {
        // This handler in cli.js will check if args.markdownFile exists
        // and then call commonCommandHandler with executeConversion
        // args.isLazyLoad will be set to true there.
    }
  },
  // Expose for direct use if needed, or it can be kept in cli.js
  // For now, let's assume executeConversion remains in cli.js and is passed to commonCommandHandler
};
