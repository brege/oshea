// src/utils/formatters/table-formatter.js

// Table formatter for user-facing CLI outputs
// Formats tabular data for CLI display with proper column alignment
const stripAnsi = require('strip-ansi');

function formatTable(level, message, meta = {}) {
  const {
    rows = [],
    columns = [],
    title,
    showBorders = true,
    separator = '|',
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
