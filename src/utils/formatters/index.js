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
  smokeTestFormatterPath,
  validationFormatterPath,
} = require('@paths');
const { formatLint } = require(lintFormatterPath);
const { formatApp } = require(appFormatterPath);
const { formatInline } = require(inlineFormatterPath);
const { formatRaw } = require(rawFormatterPath);
const { formatPathFinderOutput } = require(pathsFormatterPath);
const { formatTable } = require(tableFormatterPath);
const { formatPluginList } = require(pluginListFormatterPath);
const { formatCollectionList } = require(collectionListFormatterPath);
const {
  formatSuiteHeader,
  formatScenarioProgress,
  formatScenarioWarning,
  formatSmokeResults,
  formatSmokeHeader
} = require(smokeTestFormatterPath);
const {
  formatValidationHeader,
  formatValidationStep,
  formatValidationTest,
  formatValidationSummary
} = require(validationFormatterPath);

// Export formatters
module.exports = {
  app: formatApp,
  lint: formatLint,
  inline: formatInline,
  raw: formatRaw,
  paths: formatPathFinderOutput,
  table: formatTable,
  'plugin-list': formatPluginList,
  'collection-list': formatCollectionList,
  'smoke-header': formatSmokeHeader,
  'smoke-suite': formatSuiteHeader,
  'smoke-scenario': formatScenarioProgress,
  'smoke-warning': formatScenarioWarning,
  'smoke-results': formatSmokeResults,
  'validation-header': formatValidationHeader,
  'validation-step': formatValidationStep,
  'validation-test': formatValidationTest,
  'validation-summary': formatValidationSummary
};
