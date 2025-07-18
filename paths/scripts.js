// scripts.js - Scripts Path Registry
// Generated: 2025-07-18T03:43:40.742Z
// Architecture: Directory-based
// Regenerate: npm run paths

const path = require('path');

// ==========================================
// SCANNED ENTRIES
// ==========================================

const scriptsRoot = path.join(__dirname, '..', 'scripts');
// --- scripts/ai ---
const aiContextGeneratorPath = path.join(scriptsRoot, 'ai/ai-context-generator.js');

// --- scripts/batch ---
const batchConvertHugoRecipesPath = path.join(scriptsRoot, 'batch/batch_convert_hugo_recipes.js');
const batchConvertHugoRecipesShPath = path.join(scriptsRoot, 'batch/batch_convert_hugo_recipes.sh');
const makeScreenshotsShPath = path.join(scriptsRoot, 'batch/make-screenshots.sh');

// --- scripts/completion ---
const generateCompletionCachePath = path.join(scriptsRoot, 'completion/generate-completion-cache.js');
const generateCompletionDynamicCachePath = path.join(scriptsRoot, 'completion/generate-completion-dynamic-cache.js');

// --- scripts/docs ---
const generateHelpChecklistPath = path.join(scriptsRoot, 'docs/generate-help-checklist.js');
const generateTocPath = path.join(scriptsRoot, 'docs/generate-toc.js');

// --- scripts/linting/code ---
const loggingLintPath = path.join(scriptsRoot, 'linting/code/logging-lint.js');
const noRelativePathsPath = path.join(scriptsRoot, 'linting/code/no-relative-paths.js');
const removeAutoDocPath = path.join(scriptsRoot, 'linting/code/remove-auto-doc.js');
const standardizeJsLineOneAllPath = path.join(scriptsRoot, 'linting/code/standardize-js-line-one-all.js');
const stripTrailingWhitespacePath = path.join(scriptsRoot, 'linting/code/strip-trailing-whitespace.js');

// --- scripts/linting/docs ---
const findLitterPath = path.join(scriptsRoot, 'linting/docs/find-litter.js');
const postmanHelpersPath = path.join(scriptsRoot, 'linting/docs/postman-helpers.js');
const postmanPath = path.join(scriptsRoot, 'linting/docs/postman.js');
const updateProjectIndicesPath = path.join(scriptsRoot, 'linting/docs/update-project-indices.js');

// --- scripts/linting/lib ---
const formattersPath = path.join(scriptsRoot, 'linting/lib/formatters.js');
const lintHelpersPath = path.join(scriptsRoot, 'linting/lib/lint-helpers.js');

// --- scripts/linting ---
const lintHarnessPath = path.join(scriptsRoot, 'linting/lint-harness.js');
const lintPath = path.join(scriptsRoot, 'linting/lint.js');

// --- scripts/linting/validators ---
const mochaPathValidatorPath = path.join(scriptsRoot, 'linting/validators/mocha-path-validator.js');
const pathsJsValidatorPath = path.join(scriptsRoot, 'linting/validators/paths-js-validator.js');
const pathsUsageValidatorPath = path.join(scriptsRoot, 'linting/validators/paths-usage-validator.js');

// --- scripts/shared ---
const commentSurfacerPath = path.join(scriptsRoot, 'shared/comment-surfacer.js');
const fileHelpersPath = path.join(scriptsRoot, 'shared/file-helpers.js');

// ==========================================
// EXPORTS
// ==========================================

module.exports = {

  scriptsRoot,
  aiContextGeneratorPath,
  batchConvertHugoRecipesPath,
  batchConvertHugoRecipesShPath,
  makeScreenshotsShPath,
  generateCompletionCachePath,
  generateCompletionDynamicCachePath,
  generateHelpChecklistPath,
  generateTocPath,
  loggingLintPath,
  noRelativePathsPath,
  removeAutoDocPath,
  standardizeJsLineOneAllPath,
  stripTrailingWhitespacePath,
  findLitterPath,
  postmanHelpersPath,
  postmanPath,
  updateProjectIndicesPath,
  formattersPath,
  lintHelpersPath,
  lintHarnessPath,
  lintPath,
  mochaPathValidatorPath,
  pathsJsValidatorPath,
  pathsUsageValidatorPath,
  commentSurfacerPath,
  fileHelpersPath,

};