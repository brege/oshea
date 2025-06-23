// src/collections-manager/commands/archetype.js
const { createArchetype } = require('../../plugin_archetyper');

module.exports = async function archetypePlugin(dependencies, sourcePluginIdentifier, newArchetypeName, options = {}) {
  // 'this' is the CollectionsManager instance. We pass its necessary context and methods
  // to the decoupled 'createArchetype' function.
  const managerContext = {
    collRoot: this.collRoot,
    debug: this.debug,
    listAvailablePlugins: this.listAvailablePlugins.bind(this),
  };
  
  // Call the decoupled logic from the new library module.
  return createArchetype(dependencies, managerContext, sourcePluginIdentifier, newArchetypeName, options);
};
