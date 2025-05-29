// dev/src/collections-manager/cm-utils.js
const path = require('path');

/**
 * Derives a sanitized collection name from a source URL or path.
 * @param {string} source - The source URL or local path.
 * @returns {string} A sanitized string suitable for use as a directory name.
 */
function deriveCollectionName(source) {
  if (!source || typeof source !== 'string') {
    return ''; // Or throw an error, depending on desired strictness
  }
  const baseName = path.basename(source);
  // Remove .git suffix, then replace non-alphanumeric (excluding hyphen/underscore) with hyphen
  return baseName.replace(/\.git$/, '').replace(/[^a-zA-Z0-9_-]/g, '-');
}

module.exports = {
  deriveCollectionName,
};
