// src/utils/formatters/index.js
// Central registry of all formatters
require('module-alias/register');
const {
  appFormatterPath,
  lintFormatterPath,
  inlineFormatterPath,
  pathsFormatterPath,
  rawFormatterPath,
} = require('@paths');
const { formatLint } = require(lintFormatterPath);
const { formatApp } = require(appFormatterPath);
const { formatInline } = require(inlineFormatterPath);
const { formatRaw } = require(rawFormatterPath);
const { formatPathFinderOutput } = require(pathsFormatterPath);

// Export formatters
module.exports = {
  app: formatApp,
  lint: formatLint,
  inline: formatInline,
  raw: formatRaw,
  paths: formatPathFinderOutput
};
