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
  validationFormatterPath,
  yamlTestFormatterPath,
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
  formatValidationHeader,
  formatValidationStep,
  formatValidationTest,
  formatValidationSummary
} = require(validationFormatterPath);
const {
  formatWorkflowSuiteHeader,
  formatWorkflowStep,
  formatWorkflowHeader,
  formatWorkflowWarning,
  formatWorkflowList,
  formatWorkflowResults,
  formatYamlShowSession,
  formatYamlShowSuite,
  formatYamlShowScenario,
  formatYamlShowSeparator,
  formatYamlShowOutput,
  formatYamlShowError
} = require(yamlTestFormatterPath);

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
  'validation-header': formatValidationHeader,
  'validation-step': formatValidationStep,
  'validation-test': formatValidationTest,
  'validation-summary': formatValidationSummary,
  'workflow-header': formatWorkflowHeader,
  'workflow-suite': formatWorkflowSuiteHeader,
  'workflow-step': formatWorkflowStep,
  'workflow-warning': formatWorkflowWarning,
  'workflow-list': formatWorkflowList,
  'workflow-results': formatWorkflowResults,
  'yaml-show-session': formatYamlShowSession,
  'yaml-show-suite': formatYamlShowSuite,
  'yaml-show-scenario': formatYamlShowScenario,
  'yaml-show-separator': formatYamlShowSeparator,
  'yaml-show-output': formatYamlShowOutput,
  'yaml-show-error': formatYamlShowError
};
