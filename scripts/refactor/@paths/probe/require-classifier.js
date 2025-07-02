// scripts/refactor/require-classifier.js

/**
 * Classifies a require() call as 'pathlike', 'package', or null (not a require).
 * Returns an object: { type, requiredPath } or null.
 */
function classifyRequireLine(line) {
  const code = line.replace(/\/\/.*$/, '').trim();
  if (!code.includes('require(')) return null;

  // Match require('...') or require("...") or require(`...`)
  const match = code.match(/require\((['"`])(.*?)\1\)/);
  if (!match) return null;
  const requiredPath = match[2];

  if (requiredPath.startsWith('.') || requiredPath.startsWith('/')) {
    return { type: 'pathlike', requiredPath };
  } else {
    return { type: 'package', requiredPath };
  }
}

module.exports = { classifyRequireLine };

