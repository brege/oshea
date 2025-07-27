### Error Group Registry from Paths YAML

#### Path Structure = Error Taxonomy

The paths registry in [`paths/paths-config.yaml`](../../paths/paths-config.yaml) already contains a categorization system.
I suggest we use this for the "`context: `" field of our error registry.

The hard work of refactoring all tests two months ago by value-propagation
(cf. [`test/archive/test-generation-priority-order.md`](../../test/archive/docs/test-generation-priority-order.md))
led to an inherited structure:

1. the implementation and human-focus on which tests to ensure coverage on first
  [`*-priority-order.md`](../../test/archive/docs/test-generation-priority-order.md)
2. the structur in the mocha tests [`.mocharc.js`](../../.mocharc.js)
3. the re-organization and un-flattening of `src/` 
4. the pathing registry in `paths/paths-config.yaml`, and
5. the error registry that's prototyped in [`src/utils/logger-enhancer.js`](../../src/utils/logger-enhancer.js)

#### Rank 0: User-Facing Interfaces
```yaml
cli:
  comment: "Command Line Interface"
  pattern: "src/cli/**/*.js"
  rank: 0
```
**Error Contexts**: `CLI` \
**Typical Errors**: Command parsing, argument validation, interface setup

#### Rank 1: Essential Operations  
```yaml
core:
  comment: "Core Processing Engine" 
  pattern: "src/core/**/*.js"
  rank: 1

config:
  comment: "Configuration System"
  pattern: "src/config/**/*.js" 
  rank: 1
```
**Error Contexts**: `CoreProcessing`, `Configuration` \
**Typical Errors**: PDF generation, document processing, config loading/parsing

#### Rank 2: Supportive Operations
```yaml
plugins:
  comment: "Plugin System"
  pattern: "src/plugins/**/*.js"
  rank: 2

collections:
  comment: "Collections Management" 
  pattern: "src/collections/**/*.js"
  rank: 2

validators:
  comment: "Validation Framework"
  pattern: "src/validators/**/*.js"
  rank: 2
```
**Error Contexts**: `PluginSystem`, `Collections`, `Validation` \
**Typical Errors**: Plugin loading, contract validation, collection sync

#### Rank 3: Enhancements & Utilities
```yaml
completion:
  comment: "CLI Completion Engine"
  pattern: "src/completion/**/*.js"
  rank: 3

utils:
  comment: "Utilities & Helpers"
  pattern: "src/utils/**/*.js" 
  rank: 3
```
**Error Contexts**: `Completion`, `Utilities` \
**Typical Errors**: Tab completion, helper functions

### Auto-Generated Error Group Registry

```javascript
// Generated from paths/paths-config.yaml
const ERROR_GROUPS = {
  // Rank 0: User-facing interfaces (highest priority)
  'src/cli/': { 
    context: 'CLI', 
    rank: 0, 
    comment: 'Command Line Interface',
    priority: 'critical'
  },
  
  // Rank 1: Essential operations  
  'src/core/': { 
    context: 'CoreProcessing', 
    rank: 1, 
    comment: 'Core Processing Engine',
    priority: 'high' 
  },
  'src/config/': { 
    context: 'Configuration', 
    rank: 1, 
    comment: 'Configuration System',
    priority: 'high'
  },
  
  // Rank 2: Supportive operations
  'src/plugins/': { 
    context: 'PluginSystem', 
    rank: 2, 
    comment: 'Plugin System',
    priority: 'medium'
  },
  'src/collections/': { 
    context: 'Collections', 
    rank: 2, 
    comment: 'Collections Management',
    priority: 'medium' 
  },
  'src/validators/': { 
    context: 'Validation', 
    rank: 2, 
    comment: 'Validation Framework',
    priority: 'medium'
  },
  
  // Rank 3: Enhancements & utilities
  'src/completion/': { 
    context: 'Completion', 
    rank: 3, 
    comment: 'CLI Completion Engine',
    priority: 'low'
  },
  'src/utils/': { 
    context: 'Utilities', 
    rank: 3, 
    comment: 'Utilities & Helpers', 
    priority: 'low'
  }
};
```

### Enriched Logger Integration

```javascript
// In src/utils/logger.js
function deriveErrorGroupFromCaller(callerFile) {
  for (const [pathPattern, group] of Object.entries(ERROR_GROUPS)) {
    if (callerFile.includes(pathPattern)) {
      return {
        context: group.context,
        rank: group.rank,
        priority: group.priority,
        category: group.comment
      };
    }
  }
  return { context: 'System', rank: 99, priority: 'unknown', category: 'Unclassified' };
}

// Usage in the enriched logger
function enhanceMessage(message, options = {}, level = 'info') {
  const enhanced = {};
  
  if (loggerConfig.showCaller) {
    const caller = getCallerInfo();
    enhanced.caller = `${caller.file}:${caller.line}`;
    
    // Auto-derive error group from path structure
    const errorGroup = deriveErrorGroupFromCaller(caller.file);
    enhanced.context = enhanced.context || errorGroup.context;
    enhanced.rank = errorGroup.rank;
    enhanced.priority = errorGroup.priority;
  }
  
  return enhanced;
}
```

### Contextual Naming from YAML

The YAML also provides **contextual_naming** which gives you precise context mappings:

```yaml
contextual_naming:
  "add.command.js":
    cli/commands/collection: "collections_add_command"
    cli/commands/plugin: "plugin_add_command"
  "list.command.js":
    cli/commands/collection: "collections_list_command"  
    cli/commands/plugin: "plugin_list_command"
```

This means you can get **ultra-specific contexts** like
- `CollectionsAddCommand` vs `PluginAddCommand`
- `ConfigResolver` vs `PluginConfigLoader`

### Benefits of Path-Based Error Registry

1. **Rank-Based**
2. **Self-Maintaining**
3. **Declarative**

### Implementation Strategy

1. **Generate error registry** from paths YAML during `npm run paths`
2. **Remove synthetic error patterns** completely 
3. **Auto-derive context** from caller file path
4. **Use rank for error priority** (rank 0 errors = page immediately)
5. **Leverage contextual_naming** for precise error attribution

### Example Output

```javascript
// Before (brittle)
logger.error(`ERROR (ConfigResolver): loading plugin base configuration from '${configFilePath}' for ${pluginName}: ${error.message}`)

// After (path-derived)
logger.error('Failed to load plugin configuration', {
  plugin: pluginName,
  configFile: configFilePath, 
  error: error.message
  // Auto-added by enriched logger:
  // context: 'Configuration' (from src/config/ path)
  // rank: 1 (essential operation)
  // priority: 'high'
  // caller: './src/config/config-resolver.js:142'
});
```

