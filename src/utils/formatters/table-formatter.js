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
  } = meta;

  if (rows.length === 0 || columns.length === 0) {
    return;
  }

  // Calculate column widths
  const columnWidths = columns.map((col, index) => {
    const headerWidth = stripAnsi(col.header || col).length;
    const maxDataWidth = Math.max(
      ...rows.map(row => {
        const key = col.key || col;
        const value = row[key] || '';

        // For status column, account for Unicode indicator that will be prepended
        if (key === 'status' && row.statusType && row.statusType !== 'unknown') {
          return stripAnsi(`● ${String(value)}`).length; // ● and ○ are same width
        }

        return stripAnsi(String(value)).length;
      })
    );
    return Math.max(headerWidth, maxDataWidth);
  });

  const prefixPadding = '  '; // Standard CLI indentation

  // Display title if provided
  if (title) {
    console.log(''); // spacing before title
    console.log(`${prefixPadding}${theme.info(title)}`);
  }

  // Calculate total table width for full-width borders
  const totalTableWidth = columnWidths.reduce((sum, width) => sum + width, 0) +
                           (columns.length - 1) * 1;

  // Display top border
  if (showBorders) {
    console.log(`${prefixPadding}${theme.border('─'.repeat(totalTableWidth))}`);
  }

  // Display header
  if (showBorders) {
    const headerRow = columns.map((col, index) => {
      const header = col.header || col;
      const paddedHeader = header.padEnd(columnWidths[index]);
      return theme.header(paddedHeader);
    }).join(` ${theme.border('')} `);

    console.log(`${prefixPadding}${headerRow}`);

    // Display header separator line
    console.log(`${prefixPadding}${theme.border('─'.repeat(totalTableWidth))}`);
  }

  // Display data rows with semantic coloring
  rows.forEach(row => {
    const dataRow = columns.map((col, index) => {
      const key = col.key || col;
      const value = row[key] || '';
      const displayValue = col.transform ? col.transform(value, row) : String(value);
      const paddedValue = displayValue.padEnd(columnWidths[index]);

      // Apply semantic colors and indicators based on column type and status
      if (key === 'status') {
        const statusType = row.statusType || 'unknown';
        let statusIndicator = '';
        let coloredStatus = displayValue;

        if (statusType === 'enabled') {
          statusIndicator = '●';
          coloredStatus = theme.enabled(`${statusIndicator} ${displayValue}`);
        } else if (statusType === 'registered') {
          statusIndicator = '●';
          coloredStatus = theme.registered(`${statusIndicator} ${displayValue}`);
        } else if (statusType === 'available') {
          statusIndicator = '○';
          coloredStatus = theme.disabled(`${statusIndicator} ${displayValue}`);
        }

        // Calculate padding based on text length without colors, then apply colors
        const rawLength = stripAnsi(`${statusIndicator} ${displayValue}`).length;
        const paddingNeeded = Math.max(0, columnWidths[index] - rawLength);
        return coloredStatus + ' '.repeat(paddingNeeded);
      }

      // Default: no coloring for data content
      return paddedValue;
    }).join(` ${theme.border('')} `);

    console.log(`${prefixPadding}${dataRow}`);
  });

  // Display bottom border
  if (showBorders) {
    console.log(`${prefixPadding}${theme.border('─'.repeat(totalTableWidth))}`);
  }
}

module.exports = {
  formatTable
};
