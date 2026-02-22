// src/utils/formatters/collection-list.formatter.js
// Collection list formatter - handles table and detailed views for collections

const { colorThemePath, tableFormatterPath } = require('@paths');
const { theme } = require(colorThemePath);

// Helper function to determine collection type
function getCollectionType(collection) {
  if (collection.special_type === 'singleton_container') return 'Managed Dir';
  if (
    collection.source &&
    (collection.source.startsWith('http') || collection.source.endsWith('.git'))
  )
    return 'Git';
  return 'Local Path';
}

// Format detailed collection entry (card view)
function formatCollectionEntry(collection) {
  const lines = [];

  lines.push(`  ${theme.success('Collection Name:')} ${collection.name}`);

  if (collection.special_type === 'singleton_container') {
    lines.push(
      `    ${theme.detail('Type:')} Managed Directory (for user-added singleton plugins)`,
    );
    lines.push(`    ${theme.detail('Managed Path:')} ${collection.source}`);
    lines.push(
      `    ${theme.context('(To see individual singletons, run:')} ${theme.highlight(`'oshea plugin list --available ${collection.name}'`)}`,
    );
  } else {
    lines.push(`    ${theme.detail('Source:')} ${collection.source}`);
    if (collection.added_on && collection.added_on !== 'N/A (Container)') {
      lines.push(
        `    ${theme.detail('Added On:')} ${new Date(collection.added_on).toLocaleString()}`,
      );
    }
    if (collection.updated_on) {
      lines.push(
        `    ${theme.detail('Updated On:')} ${new Date(collection.updated_on).toLocaleString()}`,
      );
    }
  }

  return lines.join('\n');
}

// Format available plugin entry
function formatAvailablePluginEntry(plugin) {
  const lines = [];

  lines.push(`  ${theme.success('- Plugin ID:')} ${plugin.plugin_id}`);
  lines.push(`    ${theme.detail('Description:')} ${plugin.description}`);

  if (plugin.is_singleton) {
    let originalSourceDisplay = plugin.original_source || 'N/A';
    if (plugin.is_original_source_missing) {
      originalSourceDisplay += theme.warn(' (MISSING)');
    }
    lines.push(
      `    ${theme.detail('Original Source:')} ${originalSourceDisplay}`,
    );
    if (plugin.added_on) {
      lines.push(
        `    ${theme.detail('Added On:')} ${new Date(plugin.added_on).toLocaleString()}`,
      );
    }
    if (plugin.updated_on) {
      lines.push(
        `    ${theme.detail('Updated On:')} ${new Date(plugin.updated_on).toLocaleString()}`,
      );
    }
  }

  if (plugin.config_path)
    lines.push(`    ${theme.detail('Config Path:')} ${plugin.config_path}`);
  if (plugin.base_path)
    lines.push(`    ${theme.detail('Base Path:')} ${plugin.base_path}`);
  if (plugin.metadata_error)
    lines.push(
      `    ${theme.error('Metadata Error:')} ${plugin.metadata_error}`,
    );

  return lines.join('\n');
}

// Format enabled plugin entry
function formatEnabledPluginEntry(plugin) {
  const lines = [];

  lines.push(`  ${theme.success('- Invoke Name:')} ${plugin.invoke_name}`);
  lines.push(`    ${theme.detail('Plugin ID:')} ${plugin.plugin_id}`);
  lines.push(`    ${theme.detail('Collection:')} ${plugin.collection_name}`);

  if (plugin.is_singleton) {
    let originalSourceDisplay = plugin.original_source || 'N/A';
    if (plugin.is_original_source_missing) {
      originalSourceDisplay += theme.warn(' (MISSING)');
    }
    lines.push(
      `    ${theme.detail('Original Source:')} ${originalSourceDisplay}`,
    );
    if (plugin.added_on) {
      lines.push(
        `    ${theme.detail('Added On:')} ${new Date(plugin.added_on).toLocaleString()}`,
      );
    }
    if (plugin.updated_on) {
      lines.push(
        `    ${theme.detail('Updated On:')} ${new Date(plugin.updated_on).toLocaleString()}`,
      );
    }
  }

  if (plugin.config_path)
    lines.push(`    ${theme.detail('Config Path:')} ${plugin.config_path}`);

  return lines.join('\n');
}

// Generate context message based on list type and filter
function generateContextMessage(listData) {
  const { type, filter } = listData;

  if (type === 'downloaded') {
    return 'Downloaded plugin collections';
  }

  if (type === 'available' || type === 'all') {
    return `Available plugins${filter ? ` in collection "${filter}"` : ''}`;
  }

  if (type === 'enabled') {
    return `Enabled plugins${filter ? ` in collection "${filter}"` : ''}`;
  }

  return 'Collections:';
}

// Generate empty state message
function generateEmptyMessage(listData) {
  const { type, filter } = listData;

  if (type === 'downloaded') {
    return 'No downloaded collections found';
  }

  if (type === 'available' || type === 'all') {
    return `No available plugins found ${filter ? `in collection "${filter}"` : 'in any collection'}`;
  }

  if (type === 'enabled') {
    return `No enabled plugins found${filter ? ` in collection "${filter}"` : ''}`;
  }

  return 'No results found';
}

// Main formatter function
function formatCollectionList(level, message, meta = {}) {
  const listData = message; // Structured data from command

  if (!listData || !listData.items) {
    console.log(theme.warn('No collection data provided'));
    return;
  }

  // Handle empty state
  if (listData.items.length === 0) {
    const emptyMsg = generateEmptyMessage(listData);
    console.log(theme.warn(emptyMsg));
    return;
  }

  // Format based on type and display format
  if (listData.type === 'downloaded') {
    if (listData.format === 'table') {
      // Use table formatter for short display
      const rows = listData.items.map((coll) => ({
        name: coll.name,
        type: getCollectionType(coll),
        source: coll.source || 'N/A',
      }));

      const columns = [
        { key: 'name', header: 'Name' },
        { key: 'type', header: 'Type' },
        { key: 'source', header: 'Source' },
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
      // Detailed collection view - show context header for non-table format
      const contextMsg = generateContextMessage(listData);
      console.log(''); // spacing
      console.log(theme.info(contextMsg));
      console.log(''); // spacing after header

      listData.items.forEach((collection) => {
        console.log(''); // spacing between entries
        console.log(formatCollectionEntry(collection));
      });
    }
  } else if (listData.type === 'available' || listData.type === 'all') {
    // Available plugins detailed view - show context header
    const contextMsg = generateContextMessage(listData);
    console.log(''); // spacing
    console.log(theme.info(contextMsg));
    console.log(''); // spacing after header

    listData.items.forEach((plugin) => {
      console.log(formatAvailablePluginEntry(plugin));
    });
  } else if (listData.type === 'enabled') {
    // Enabled plugins detailed view - show context header
    const contextMsg = generateContextMessage(listData);
    console.log(''); // spacing
    console.log(theme.info(contextMsg));
    console.log(''); // spacing after header

    listData.items.forEach((plugin) => {
      console.log(formatEnabledPluginEntry(plugin));
    });
  }
}

module.exports = {
  formatCollectionList,
  formatCollectionEntry,
  formatAvailablePluginEntry,
  formatEnabledPluginEntry,
  generateContextMessage,
  generateEmptyMessage,
  getCollectionType,
};
