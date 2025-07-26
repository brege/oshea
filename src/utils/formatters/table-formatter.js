// src/utils/formatters/table-formatter.js
// Table formatter for user-facing CLI outputs

const stripAnsi = require('strip-ansi');

/**
 * Formats tabular data for CLI display with proper column alignment
 * @param {string} level - Log level (info, success, etc.)
 * @param {string} message - Main message (ignored for table format)
 * @param {Object} meta - Table metadata
 * @param {Array<Object>} meta.rows - Array of row objects
 * @param {Array<string>} meta.columns - Column definitions with headers
 * @param {string} [meta.title] - Optional table title
 * @param {boolean} [meta.showBorders=true] - Whether to show table borders
 * @param {string} [meta.separator='|'] - Column separator
 * @param {number} [meta.padding=1] - Column padding
 * @returns {void}
 */
function formatTable(level, message, meta = {}) {
  const {
    rows = [],
    columns = [],
    title,
    showBorders = true,
    separator = '|',
    padding = 1
  } = meta;

  if (rows.length === 0 || columns.length === 0) {
    return;
  }

  // Calculate column widths
  const columnWidths = columns.map((col, index) => {
    const headerWidth = stripAnsi(col.header || col).length;
    const maxDataWidth = Math.max(
      ...rows.map(row => {
        const value = row[col.key || col] || '';
        return stripAnsi(String(value)).length;
      })
    );
    return Math.max(headerWidth, maxDataWidth);
  });

  const paddingStr = ' '.repeat(padding);
  const prefixPadding = '  '; // Standard CLI indentation

  // Display title if provided
  if (title) {
    console.log(`\n${title}:`);
  }

  // Display header
  if (showBorders) {
    const headerRow = columns.map((col, index) => {
      const header = col.header || col;
      return header.padEnd(columnWidths[index]);
    }).join(` ${separator} `);

    console.log(`${prefixPadding}${headerRow}`);

    // Display separator line
    const separatorRow = columnWidths.map(width => '-'.repeat(width)).join(` ${separator} `);
    console.log(`${prefixPadding}${separatorRow}`);
  }

  // Display data rows
  rows.forEach(row => {
    const dataRow = columns.map((col, index) => {
      const key = col.key || col;
      const value = row[key] || '';
      const displayValue = col.transform ? col.transform(value, row) : String(value);
      return displayValue.padEnd(columnWidths[index]);
    }).join(` ${separator} `);

    console.log(`${prefixPadding}${dataRow}`);
  });
}

module.exports = {
  formatTable
};
