// src/cli/update.command.js
// Alias to collection update command to eliminate duplication
require('module-alias/register');
const { collectionsUpdateCommandPath } = require('@paths');
module.exports = require(collectionsUpdateCommandPath);
