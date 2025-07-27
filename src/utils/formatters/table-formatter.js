// src/utils/formatters/table-formatter.js

// Table formatter for user-facing CLI outputs
// Formats tabular data for CLI display with proper column alignment
const stripAnsi = require('strip-ansi');
const { colorThemePath } = require('@paths');
const { theme } = require(colorThemePath);

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
    console.log(`\n${theme.highlight(title)}:`);
  }

  // Display header
  if (showBorders) {
    const headerRow = columns.map((col, index) => {
      const header = col.header || col;
      const paddedHeader = header.padEnd(columnWidths[index]);
      return theme.header(paddedHeader);
    }).join(` ${theme.border(separator)} `);

    console.log(`${prefixPadding}${headerRow}`);

    // Display separator line
    const separatorRow = columnWidths.map(width => theme.border('-'.repeat(width))).join(` ${theme.border(separator)} `);
    console.log(`${prefixPadding}${separatorRow}`);
  }

  // Display data rows with semantic coloring
  rows.forEach(row => {
    const dataRow = columns.map((col, index) => {
      const key = col.key || col;
      const value = row[key] || '';
      const displayValue = col.transform ? col.transform(value, row) : String(value);
      const paddedValue = displayValue.padEnd(columnWidths[index]);

      // Apply semantic colors based on column type and value
      if (key === 'status') {
        if (displayValue.includes('Enabled') || displayValue.includes('Registered')) {
          return theme.enabled(paddedValue);
        } else if (displayValue.includes('Available')) {
          return theme.pending(paddedValue);
        } else if (displayValue.includes('Disabled')) {
          return theme.disabled(paddedValue);
        }
      }

      // Default: no coloring for data content
      return paddedValue;
    }).join(` ${separator} `);

    console.log(`${prefixPadding}${dataRow}`);
  });
}

module.exports = {
  formatTable
};
