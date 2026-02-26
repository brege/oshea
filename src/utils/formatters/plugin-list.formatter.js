// src/utils/formatters/plugin-list.formatter.js
// Plugin list formatter - handles both table and detailed views

const { colorThemePath, tableFormatterPath } = require('@paths');
const { theme } = require(colorThemePath);

// Format detailed plugin entry (card view)
function formatPluginEntry(plugin) {
  const lines = [];

  lines.push(`  ${theme.success('Name:')} ${plugin.name}`);

  let statusText = plugin.status || 'N/A';
  if (plugin.status === 'Enabled (Installed)') {
    statusText = plugin.status;
  } else if (plugin.status?.startsWith('Registered')) {
    statusText = plugin.status;
  } else if (plugin.status === 'Available (Installed)') {
    statusText = plugin.status;
  }
  lines.push(`    ${theme.info('Status:')} ${statusText}`);

  lines.push(`    ${theme.detail('Description:')} ${plugin.description}`);

  const sourceDisplayMessage = plugin.registrationSourceDisplay;
  lines.push(`    ${theme.detail('Source:')} ${sourceDisplayMessage}`);
  lines.push(`    ${theme.detail('Config Path:')} ${plugin.configPath}`);

  lines.push(`  ${theme.info('---')}`);

  return lines.join('\n');
}

// Generate context message based on list type and filter
function generateContextMessage(listData) {
  const { type, plugins } = listData;

  if (type === 'enabled') {
    return 'Enabled plugins';
  }

  if (type === 'available') {
    return 'Installed plugins (enabled and disabled)';
  }

  if (type === 'disabled') {
    return 'Disabled installed plugins';
  }

  // Default/all type
  if (listData.format === 'table') {
    const context = 'all known plugins';
    return `Summary for ${context}`;
  } else {
    const usableCount = plugins.filter(
      (p) =>
        p.status?.startsWith('Registered') ||
        p.status === 'Enabled (Installed)',
    ).length;
    return `Found ${usableCount} plugin(s) usable by oshea`;
  }
}

// Generate empty state message
function generateEmptyMessage(listData) {
  const { type } = listData;

  if (type === 'enabled') {
    return 'No plugins are currently enabled.';
  }

  if (type === 'available') {
    return 'No installed plugins found.';
  }

  if (type === 'disabled') {
    return 'No disabled installed plugins found.';
  }

  return 'No plugins found or registered as usable.';
}

// Main formatter function
function formatPluginList(level, message, _meta = {}) {
  const listData = message; // Structured data from command

  if (!listData || !listData.plugins) {
    console.log(theme.warn('No plugin data provided'));
    return;
  }

  // Handle empty state
  if (listData.plugins.length === 0) {
    const emptyMsg = generateEmptyMessage(listData);
    console.log(theme.warn(emptyMsg));
    return;
  }

  // Format based on display type
  if (listData.format === 'table') {
    // Use existing table formatter with structured data
    const rows = listData.plugins.map((plugin) => {
      return {
        status: plugin.status || 'N/A',
        statusType:
          plugin.status === 'Enabled (Installed)'
            ? 'enabled'
            : plugin.status?.startsWith('Registered')
              ? 'registered'
              : plugin.status === 'Available (Installed)'
                ? 'available'
                : 'unknown',
        name: plugin.name,
        origin: 'n/a',
      };
    });

    const columns = [
      { key: 'status', header: 'Status' },
      { key: 'name', header: 'Name/Invoke Key' },
      { key: 'origin', header: 'Origin' },
    ];

    const tableFormatter = require(tableFormatterPath);
    const tableTitle = generateContextMessage(listData);
    tableFormatter.formatTable(level, '', {
      rows,
      columns,
      showBorders: true,
      title: tableTitle,
    });
  } else {
    // Detailed card view - show context header for non-table format
    const contextMsg = generateContextMessage(listData);
    console.log(''); // spacing
    console.log(theme.info(contextMsg));
    console.log(''); // spacing after header

    listData.plugins.forEach((plugin) => {
      console.log(formatPluginEntry(plugin));
    });
  }
}

module.exports = {
  formatPluginList,
  formatPluginEntry,
  generateContextMessage,
  generateEmptyMessage,
};
