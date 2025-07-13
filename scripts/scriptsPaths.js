// scripts/scriptsPaths.js
const path = require('path');

// Root of the scripts directory
const scriptsRoot = path.join(__dirname);

// Linting
const lintingRoot = path.join(scriptsRoot, 'linting');
const lintingConfigPath = path.join(lintingRoot, 'config.yaml');

// Linting: Code Linters
const lintingCodeRoot = path.join(lintingRoot, 'code');
const loggingLintPath = path.join(lintingCodeRoot, 'logging-lint.js');
const removeAutoDocPath = path.join(lintingCodeRoot, 'remove-auto-doc.js');
const standardizeJsLineOneAllPath = path.join(lintingCodeRoot, 'standardize-js-line-one-all.js');
const stripTrailingWhitespacePath = path.join(lintingCodeRoot, 'strip-trailing-whitespace.js');

// Linting: Docs
const lintingDocsRoot = path.join(lintingRoot, 'docs');
const postmanHelpersPath = path.join(lintingDocsRoot, 'postman-helpers.js');
const postmanPath = path.join(lintingDocsRoot, 'postman.js');
const updateProjectIndicesPath = path.join(lintingDocsRoot, 'update-project-indices.js');

// Linting: Shared
const sharedRoot = path.join(scriptsRoot, 'shared');
const lintConfigLoaderPath = path.join(sharedRoot, 'lint-config-loader.js');

// Linting: Validators
const lintingValidatorsRoot = path.join(lintingRoot, 'validators');
const mochaPathValidatorPath = path.join(lintingValidatorsRoot, 'mocha-path-validator.js');
const pathsJsValidatorPath = path.join(lintingValidatorsRoot, 'paths-js-validator.js');

// Export all scripts-related paths
module.exports = {
  scriptsRoot,

  // Linting
  lintingRoot,
  lintingConfigPath,

  // Linting: Code
  lintingCodeRoot,
  loggingLintPath,
  removeAutoDocPath,
  standardizeJsLineOneAllPath,
  stripTrailingWhitespacePath,

  // Linting: Docs
  lintingDocsRoot,
  postmanHelpersPath,
  postmanPath,
  updateProjectIndicesPath,

  // Linting: Shared
  sharedRoot,
  lintConfigLoaderPath,

  // Linting: Validators
  lintingValidatorsRoot,
  mochaPathValidatorPath,
  pathsJsValidatorPath,
};

