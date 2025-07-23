// src/utils/formatters/index.js
// Central registry of all formatters
require('module-alias/register');
const { lintFormatterPath } = require('@paths');
const { formatLint } = require(lintFormatterPath);

module.exports = {
  lint: formatLint
  // Future formatters go here:
  // inline: formatInline,
  // debug: formatDebug,
  // etc.
};
