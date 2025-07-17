// scripts/scriptsPaths.js
const path = require('path');

// Root
const scriptsRoot = path.join(__dirname);

// AI
const aiRoot = path.join(scriptsRoot, 'ai');
const aiContextGeneratorPath = path.join(aiRoot, 'ai-context-generator.js');

// Batch
const batchRoot = path.join(scriptsRoot, 'batch');
const batchConvertHugoRecipesJsPath = path.join(batchRoot, 'batch_convert_hugo_recipes.js');
const batchConvertHugoRecipesShPath = path.join(batchRoot, 'batch_convert_hugo_recipes.sh');
const makeScreenshotsShPath = path.join(batchRoot, 'make-screenshots.sh');

// Completion
const completionRoot = path.join(scriptsRoot, 'completion');
const generateCompletionCachePath = path.join(completionRoot, 'generate-completion-cache.js');
const generateCompletionDynamicCachePath = path.join(completionRoot, 'generate-completion-dynamic-cache.js');

// Docs
const docsRoot = path.join(scriptsRoot, 'docs');
const generateHelpChecklistPath = path.join(docsRoot, 'generate-help-checklist.js');
const generateTocPath = path.join(docsRoot, 'generate-toc.js');

// Shared
const sharedRoot = path.join(scriptsRoot, 'shared');
const commentSurfacerPath = path.join(sharedRoot, 'comment-surfacer.js');
const fileHelpersPath = path.join(sharedRoot, 'file-helpers.js');

// Generate
const generatePathsBeautifulPath = path.join(scriptsRoot, 'generate-paths-beautiful.js');

// Linting
const lintingRoot = path.join(scriptsRoot, 'linting');
const lintingHarnessPath = path.join(lintingRoot, 'lint-harness.js');
const lintingConfigPath = path.join(lintingRoot, 'config.yaml');
const lintingIndexMdPath = path.join(lintingRoot, 'index.md');
const lintJsPath = path.join(lintingRoot, 'lint.js');

// Linting: Code Linters
const lintingCodeRoot = path.join(lintingRoot, 'code');
const loggingLintPath = path.join(lintingCodeRoot, 'logging-lint.js');
const noRelativePathsPath = path.join(lintingCodeRoot, 'no-relative-paths.js');
const removeAutoDocPath = path.join(lintingCodeRoot, 'remove-auto-doc.js');
const standardizeJsLineOneAllPath = path.join(lintingCodeRoot, 'standardize-js-line-one-all.js');
const stripTrailingWhitespacePath = path.join(lintingCodeRoot, 'strip-trailing-whitespace.js');

// Linting: Docs
const lintingDocsRoot = path.join(lintingRoot, 'docs');
const postmanPath = path.join(lintingDocsRoot, 'postman.js');
const postmanHelpersPath = path.join(lintingDocsRoot, 'postman-helpers.js');
const updateProjectIndicesPath = path.join(lintingDocsRoot, 'update-project-indices.js');

// Linting: Lib
const lintingLibRoot = path.join(lintingRoot, 'lib');
const formattersPath = path.join(lintingLibRoot, 'formatters.js');
const lintHelpersPath = path.join(lintingLibRoot, 'lint-helpers.js');

// Linting: Validators
const lintingValidatorsRoot = path.join(lintingRoot, 'validators');
const mochaPathValidatorPath = path.join(lintingValidatorsRoot, 'mocha-path-validator.js');
const pathsJsValidatorPath = path.join(lintingValidatorsRoot, 'paths-js-validator.js');
const pathsUsageValidatorPath = path.join(lintingValidatorsRoot, 'paths-usage-validator.js');

// Export all scripts-related paths
module.exports = {
  scriptsRoot,

  // AI
  aiRoot,
  aiContextGeneratorPath,

  // Batch
  batchRoot,
  batchConvertHugoRecipesJsPath,
  batchConvertHugoRecipesShPath,
  makeScreenshotsShPath,

  // Completion
  completionRoot,
  generateCompletionCachePath,
  generateCompletionDynamicCachePath,

  // Docs
  docsRoot,
  generateHelpChecklistPath,
  generateTocPath,

  // Shared
  sharedRoot,
  commentSurfacerPath,
  fileHelpersPath,

  // Generate
  generatePathsBeautifulPath,

  // Linting
  lintingRoot,
  lintingHarnessPath,
  lintingConfigPath,
  lintingIndexMdPath,
  lintJsPath,

  // Linting: Code
  lintingCodeRoot,
  loggingLintPath,
  noRelativePathsPath,
  removeAutoDocPath,
  standardizeJsLineOneAllPath,
  stripTrailingWhitespacePath,

  // Linting: Docs
  lintingDocsRoot,
  postmanHelpersPath,
  postmanPath,
  updateProjectIndicesPath,

  // Linting: Lib
  lintingLibRoot,
  formattersPath,
  lintHelpersPath,

  // Linting: Validators
  lintingValidatorsRoot,
  mochaPathValidatorPath,
  pathsJsValidatorPath,
  pathsUsageValidatorPath,
};

