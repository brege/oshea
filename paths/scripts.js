// scripts.js - Scripts Path Registry
// Generated: 2025-07-18T17:27:27.107Z
// Architecture: Feature-based
// Regenerate: npm run paths
// Auto-generated - do not edit manually

const path = require('path');

// ==========================================
// ARCHITECTURE
// ==========================================

// --- Project Foundation ---
const projectRoot = path.resolve(__dirname, '..');
const scriptsRoot = path.join(projectRoot, 'scripts');

// ==========================================
// FEATURES (by dependency rank)
// ==========================================

// --- Rank 0: user-facing interfaces ---

// AI Tooling
const aiRoot = path.join(projectRoot, 'scripts/ai/');
const aiContextGeneratorPath = path.join(projectRoot, 'scripts/ai/ai-context-generator.js');

// --- Rank 1: essential operations ---

// Batch Processing Scripts
const batchRoot = path.join(projectRoot, 'scripts/batch/');
const batchConvertHugoRecipesPath = path.join(projectRoot, 'scripts/batch/batch_convert_hugo_recipes.js');
const batchConvertHugoRecipesShPath = path.join(projectRoot, 'scripts/batch/batch_convert_hugo_recipes.sh');
const makeScreenshotsShPath = path.join(projectRoot, 'scripts/batch/make-screenshots.sh');

// CLI Tab Completion Scripts
const completionRoot = path.join(projectRoot, 'scripts/completion/');
const generateCompletionCachePath = path.join(projectRoot, 'scripts/completion/generate-completion-cache.js');
const generateCompletionDynamicCachePath = path.join(projectRoot, 'scripts/completion/generate-completion-dynamic-cache.js');

// Documentation Helpers
const docsRoot = path.join(projectRoot, 'scripts/docs/');
const generateTocPath = path.join(projectRoot, 'scripts/docs/generate-toc.js');

// --- Rank 2: supportive operations ---

// Shared Script Utilities
const sharedRoot = path.join(projectRoot, 'scripts/shared/');
const fileHelpersPath = path.join(projectRoot, 'scripts/shared/file-helpers.js');
const findPathVariablePath = path.join(projectRoot, 'scripts/shared/find-path-variable.js');

// ==========================================
// EXPORTS
// ==========================================

module.exports = {

  // --- Architecture ---
  projectRoot,
  scriptsRoot,

  // --- user-facing interfaces ---
  aiRoot,
  aiContextGeneratorPath,

  // --- essential operations ---
  batchRoot,
  batchConvertHugoRecipesPath,
  batchConvertHugoRecipesShPath,
  makeScreenshotsShPath,
  completionRoot,
  generateCompletionCachePath,
  generateCompletionDynamicCachePath,
  docsRoot,
  generateTocPath,

  // --- supportive operations ---
  sharedRoot,
  fileHelpersPath,
  findPathVariablePath,

};