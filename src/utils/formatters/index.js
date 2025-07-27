// src/utils/formatters/index.js
// Central registry of all formatters
require('module-alias/register');
const {
  appFormatterPath,
  lintFormatterPath,
  inlineFormatterPath,
  pathsFormatterPath,
  rawFormatterPath,
  tableFormatterPath,
  pluginListFormatterPath,
  collectionListFormatterPath,
} = require('@paths');
const { formatLint } = require(lintFormatterPath);
const { formatApp } = require(appFormatterPath);
const { formatInline } = require(inlineFormatterPath);
const { formatRaw } = require(rawFormatterPath);
const { formatPathFinderOutput } = require(pathsFormatterPath);
const { formatTable } = require(tableFormatterPath);
const { formatPluginList } = require(pluginListFormatterPath);
const { formatCollectionList } = require(collectionListFormatterPath);

// Export formatters
module.exports = {
  app: formatApp,
  lint: formatLint,
  inline: formatInline,
  raw: formatRaw,
  paths: formatPathFinderOutput,
  table: formatTable,
  pluginList: formatPluginList,
  collectionList: formatCollectionList
};
