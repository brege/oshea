// src/commands/plugin/listCmd.js
const PluginRegistryBuilder = require('../../PluginRegistryBuilder'); // Adjusted path
const path = require('path'); // For __dirname

module.exports = {
  command: 'list',
  describe: 'List all discoverable plugins.',
  builder: () => {}, // No specific options for list
  handler: async (args) => {
    try {
      console.log("Discovering plugins...");
      // Determine projectRoot relative to this file's new location
      const projectRoot = path.resolve(__dirname, '../../../'); 
      const builder = new PluginRegistryBuilder(
        projectRoot,
        null, 
        args.config,
        args.factoryDefaults,
        args.isLazyLoadMode || false
      );
      const pluginDetailsList = await builder.getAllPluginDetails();

      if (pluginDetailsList.length === 0) {
        console.log("No plugins found or registered.");
        return;
      }

      console.log(`\nFound ${pluginDetailsList.length} plugin(s):\n`);
      pluginDetailsList.forEach(plugin => {
        console.log(`  Name: ${plugin.name}`);
        console.log(`    Description: ${plugin.description}`);
        console.log(`    Source: ${plugin.registrationSourceDisplay}`);
        console.log(`    Config: ${plugin.configPath}`);
        console.log(`  ---`);
      });
    } catch (error) {
      console.error(`ERROR listing plugins: ${error.message}`);
      if (error.stack) console.error(error.stack);
      process.exit(1);
    }
  }
};
