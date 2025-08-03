// src/utils/formatters/plugin-list.formatter.js
// Plugin list formatter - handles both table and detailed views

const { colorThemePath, tableFormatterPath } = require('@paths');
const { theme } = require(colorThemePath);

// Format detailed plugin entry (card view)
function formatPluginEntry(plugin) {
  const lines = [];

  lines.push(`  ${theme.success('Name:')} ${plugin.name}`);

  let statusText = plugin.status || 'N/A';
  if (plugin.status === 'Enabled (CM)') {
    statusText = plugin.status;
  } else if (plugin.status && plugin.status.startsWith('Registered')) {
    statusText = plugin.status;
  } else if (plugin.status === 'Available (CM)') {
    statusText = plugin.status;
  }
  lines.push(`    ${theme.info('Status:')} ${statusText}`);

  if (plugin.cmCollection || plugin.cmOriginalCollection) {
    const collection = plugin.cmCollection || plugin.cmOriginalCollection;
    const pluginId = plugin.cmPluginId || plugin.cmOriginalPluginId;
    if (collection && pluginId) {
      lines.push(`    ${theme.detail('CM Origin:')} ${collection}/${pluginId}`);
    }
    if (plugin.cmInvokeName && plugin.cmInvokeName !== plugin.name && plugin.status === 'Enabled (CM)') {
      lines.push(`    ${theme.detail('CM Invoke Name:')} ${plugin.cmInvokeName}`);
    }
  }

  lines.push(`    ${theme.detail('Description:')} ${plugin.description}`);

  let sourceDisplayMessage = plugin.registrationSourceDisplay;
  if (plugin.status === 'Enabled (CM)' && plugin.cmCollection && plugin.cmPluginId) {
    sourceDisplayMessage = `CollectionsManager (CM: ${plugin.cmCollection}/${plugin.cmPluginId})`;
  } else if (plugin.registrationSourceDisplay && plugin.registrationSourceDisplay.includes('(CM:')) {
    const parts = plugin.registrationSourceDisplay.split('(CM:');
    const cmDetails = parts[1].replace(')','').split('/');
    const cmCollectionName = cmDetails[0];
    const cmPluginIdName = cmDetails.slice(1).join('/');
    sourceDisplayMessage = `${parts[0].trim()} (CM:${cmCollectionName}/${cmPluginIdName})`;
  } else {
    sourceDisplayMessage = plugin.registrationSourceDisplay;
  }
  lines.push(`    ${theme.detail('Source:')} ${sourceDisplayMessage}`);
  lines.push(`    ${theme.detail('Config Path:')} ${plugin.configPath}`);

  if (plugin.cmAddedOn && plugin.status === 'Enabled (CM)') {
    lines.push(`    ${theme.detail('CM Enabled On:')} ${plugin.cmAddedOn}`);
  }

  lines.push(`  ${theme.info('---')}`);

  return lines.join('\n');
}

// Generate context message based on list type and filter
function generateContextMessage(listData) {
  const { type, filter, plugins } = listData;

  if (type === 'enabled') {
    const filterMsg = filter ? ` (filtered for CM collection '${filter}')` : '';
    return `Enabled plugins${filterMsg}`;
  }

  if (type === 'available') {
    const filterMsg = filter ? ` in collection "${filter}"` : '';
    return `Available CM-managed plugins${filterMsg}`;
  }

  if (type === 'disabled') {
    const filterMsg = filter ? ` in collection "${filter}"` : '';
    return `Disabled (but available) CM-managed plugins${filterMsg}`;
  }

  // Default/all type
  if (listData.format === 'table') {
    const context = filter ? `CM plugins in collection "${filter}"` : 'all known plugins';
    return `Summary for ${context}`;
  } else {
    const usableCount = plugins.filter(p =>
      (p.status && p.status.startsWith('Registered')) || p.status === 'Enabled (CM)' || p.status === 'Enabled (Created)' || p.status === 'Enabled (Added)'
    ).length;
    return `Found ${usableCount} plugin(s) usable by md-to-pdf`;
  }
}

// Generate empty state message
function generateEmptyMessage(listData) {
  const { type, filter } = listData;

  if (type === 'enabled') {
    const filterMsg = filter ? ` matching filter '${filter}'` : '';
    return `No plugins are currently enabled${filterMsg}.`;
  }

  if (type === 'available') {
    const filterMsg = filter ? ` in collection "${filter}"` : '';
    return `No CM-managed plugins found${filterMsg}.`;
  }

  if (type === 'disabled') {
    const filterMsg = filter ? ` in collection "${filter}"` : '';
    return `No disabled (but available) CM-managed plugins found${filterMsg}.`;
  }

  return 'No plugins found or registered as usable.';
}

// Main formatter function
function formatPluginList(level, message, meta = {}) {
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
    const rows = listData.plugins.map(plugin => {
      return {
        status: plugin.status || 'N/A',
        statusType: plugin.status === 'Enabled (CM)' ? 'enabled'
          : plugin.status === 'Enabled (Created)' ? 'enabled'
            : plugin.status === 'Enabled (Added)' ? 'enabled'
              : plugin.status && plugin.status.startsWith('Registered') ? 'registered'
                : plugin.status === 'Available (CM)' ? 'available'
                  : plugin.status === 'Available (Created)' ? 'available'
                    : plugin.status === 'Available (Added)' ? 'available'
                      : 'unknown',
        name: plugin.name,
        origin: (plugin.cmCollection && plugin.cmPluginId)
          ? `${plugin.cmCollection}/${plugin.cmPluginId}`
          : 'n/a'
      };
    });

    const columns = [
      { key: 'status', header: 'Status' },
      { key: 'name', header: 'Name/Invoke Key' },
      { key: 'origin', header: 'CM Origin' }
    ];

    const tableFormatter = require(tableFormatterPath);
    const tableTitle = generateContextMessage(listData);
    tableFormatter.formatTable(level, '', {
      rows,
      columns,
      showBorders: true,
      title: tableTitle
    });

  } else {
    // Detailed card view - show context header for non-table format
    const contextMsg = generateContextMessage(listData);
    console.log(''); // spacing
    console.log(theme.info(contextMsg));
    console.log(''); // spacing after header

    listData.plugins.forEach(plugin => {
      console.log(formatPluginEntry(plugin));
    });
  }
}

module.exports = {
  formatPluginList,
  formatPluginEntry,
  generateContextMessage,
  generateEmptyMessage
};
