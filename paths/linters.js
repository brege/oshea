// paths/linters.js
// linters.js - Linting Tools Registry
// Generated: 2025-07-24T01:54:54.255Z
// Architecture: Feature-based linting infrastructure
// Regenerate: npm run paths
// Auto-generated - do not edit manually

const path = require('path');

// ==========================================
// Architecture
// ==========================================

// --- Project Foundation ---
const projectRoot = path.resolve(__dirname, '..');
const scriptsRoot = path.join(projectRoot, 'scripts');
const lintingRoot = path.join(scriptsRoot, 'linting');

// ==========================================
// Features (by dependency rank)
// ==========================================

// --- Rank 0: user-facing interfaces ---

// Core Linting Infrastructure
const coreRoot = path.join(projectRoot, 'scripts/linting/lint*.js');
const lintHarnessPath = path.join(projectRoot, 'scripts/linting/lint-harness.js');
const lintPath = path.join(projectRoot, 'scripts/linting/lint.js');

// --- Rank 1: essential operations ---

// Code Quality Linters
const codeRoot = path.join(projectRoot, 'scripts/linting/code/');
const loggingLintPath = path.join(projectRoot, 'scripts/linting/code/logging-lint.js');
const noRelativePathsPath = path.join(projectRoot, 'scripts/linting/code/no-relative-paths.js');
const removeJsdocPath = path.join(projectRoot, 'scripts/linting/code/remove-jsdoc.js');
const standardizeJsLineOneAllPath = path.join(projectRoot, 'scripts/linting/code/standardize-js-line-one-all.js');
const stripTrailingWhitespacePath = path.join(projectRoot, 'scripts/linting/code/strip-trailing-whitespace.js');

// Documentation Linters
const docsRoot = path.join(projectRoot, 'scripts/linting/docs/');
const findLitterPath = path.join(projectRoot, 'scripts/linting/docs/find-litter.js');
const postmanPath = path.join(projectRoot, 'scripts/linting/docs/postman.js');
const updateProjectIndicesPath = path.join(projectRoot, 'scripts/linting/docs/update-project-indices.js');

// --- Rank 2: supportive operations ---

// Validation Linters
const validatorsRoot = path.join(projectRoot, 'scripts/linting/validators/');
const mochaPathValidatorPath = path.join(projectRoot, 'scripts/linting/validators/mocha-path-validator.js');

// --- Rank 3: enhancements & utilities ---

// Linting Utilities & Helpers
const libRoot = path.join(projectRoot, 'scripts/linting/lib/');
const dataAdaptersPath = path.join(projectRoot, 'scripts/linting/lib/data-adapters.js');
const fileDiscoveryPath = path.join(projectRoot, 'scripts/linting/lib/file-discovery.js');
const findLintSkipsPath = path.join(projectRoot, 'scripts/linting/lib/find-lint-skips.js');
const lintHelpersPath = path.join(projectRoot, 'scripts/linting/lib/lint-helpers.js');
const skipSystemPath = path.join(projectRoot, 'scripts/linting/lib/skip-system.js');
const visualRenderersPath = path.join(projectRoot, 'scripts/linting/lib/visual-renderers.js');

// ==========================================
// Exports
// ==========================================

module.exports = {

  // --- Architecture ---
  projectRoot,
  scriptsRoot,
  lintingRoot,

  // --- user-facing interfaces ---
  coreRoot,
  lintHarnessPath,
  lintPath,

  // --- essential operations ---
  codeRoot,
  loggingLintPath,
  noRelativePathsPath,
  removeJsdocPath,
  standardizeJsLineOneAllPath,
  stripTrailingWhitespacePath,
  docsRoot,
  findLitterPath,
  postmanPath,
  updateProjectIndicesPath,

  // --- supportive operations ---
  validatorsRoot,
  mochaPathValidatorPath,

  // --- enhancements & utilities ---
  libRoot,
  dataAdaptersPath,
  fileDiscoveryPath,
  findLintSkipsPath,
  lintHelpersPath,
  skipSystemPath,
  visualRenderersPath,

};