#!/usr/bin/env node
// scripts/generate-paths-beautiful.js

const fs = require('fs');
const path = require('path');

class BeautifulPathsGenerator {
  constructor(projectRoot = process.cwd()) {
    this.projectRoot = projectRoot;
    this.pathsFile = path.join(projectRoot, 'paths.js');

    // Architecture-driven organization
    this.architecture = {
      // Core system paths (foundation)
      foundation: {
        comment: 'Project Foundation',
        items: {
          projectRoot: '__dirname',
          pathsPath: 'path.join(__dirname, \'paths.js\')',
          nodeModulesPath: 'path.join(projectRoot, \'node_modules\')',
          configExamplePath: 'path.join(projectRoot, \'config.example.yaml\')',
          defaultConfigPath: 'path.join(projectRoot, \'config.yaml\')',
          factoryDefaultConfigPath: 'path.join(projectRoot, \'config.example.yaml\')',
        }
      },

      // Entry points and interfaces
      interfaces: {
        comment: 'CLI & External Interfaces',
        items: {
          cliPath: 'path.join(projectRoot, \'cli.js\')',
          templateBasicPlugin: 'path.join(projectRoot, \'plugins\', \'template-basic\')',
        }
      },

      // Directory roots (architectural boundaries)
      boundaries: {
        comment: 'Architectural Boundaries',
        items: {
          srcRoot: 'path.join(projectRoot, \'src\')',
          assetsRoot: 'path.join(projectRoot, \'assets\')',
          scriptsRoot: 'path.join(projectRoot, \'scripts\')',
          testRoot: 'path.join(projectRoot, \'test\')',
          cliCommandsPath: 'path.join(srcRoot, \'cli\', \'commands\')',
          collectionsCommandsRoot: 'path.join(srcRoot, \'collections\', \'commands\')',
          scriptsSharedRoot: 'path.join(scriptsRoot, \'shared\')',
          testSharedRoot: 'path.join(testRoot, \'shared\')',
        }
      },

      // Development and build tooling
      tooling: {
        comment: 'Development & Build Tools',
        items: {
          eslintPath: 'path.join(nodeModulesPath, \'.bin\', \'eslint\')',
          mochaPath: 'path.join(nodeModulesPath, \'.bin\', \'mocha\')',
          mocharcPath: 'path.join(projectRoot, \'.mocharc.js\')',
          fileHelpersPath: 'path.join(scriptsSharedRoot, \'file-helpers.js\')',
          testFileHelpersPath: 'path.join(testSharedRoot, \'test-helpers.js\')',
          dynamicCompletionScriptPath: 'path.join(scriptsRoot, \'completion\', \'generate-completion-dynamic-cache.js\')',
        }
      },

      // Specific file paths that are easier to manage statically
      statics: {
        comment: 'Key Static File Paths',
        items: {
          katexPath: 'path.join(assetsRoot, \'katex.min.css\')',
          basePluginSchemaPath: 'path.join(srcRoot, \'validators\', \'base-plugin.schema.json\')',
        }
      }
    };

    // Feature-based grouping
    this.features = {
      cli: {
        comment: 'Command Line Interface',
        pattern: 'src/cli/**/*.js',
        rank: 0 // user-facing
      },
      core: {
        comment: 'Core Processing Engine',
        pattern: 'src/core/**/*.js',
        rank: 1 // essential operations
      },
      plugins: {
        comment: 'Plugin System',
        pattern: 'src/plugins/**/*.js',
        rank: 2 // extensibility
      },
      collections: {
        comment: 'Collections Management',
        pattern: 'src/collections/**/*.js',
        rank: 2 // supportive operations
      },
      config: {
        comment: 'Configuration System',
        pattern: 'src/config/**/*.js',
        rank: 1 // essential operations
      },
      completion: {
        comment: 'CLI Completion Engine',
        pattern: 'src/completion/**/*.js',
        rank: 3 // enhancement
      },
      utils: {
        comment: 'Utilities & Helpers',
        pattern: 'src/utils/**/*.js',
        rank: 3 // support
      },
      validators: {
        comment: 'Validation Framework',
        pattern: 'src/validators/**/*.js',
        rank: 2 // supportive operations
      }
    };

    // Degenerate handling with context
    this.contextualNaming = {
      'addCmd.js': {
        'cli/commands/collection': 'collectionsAddCmd',
        'cli/commands/plugin': 'pluginAddCmd',
        'collections/commands': 'collectionsAdd'
      },
      'listCmd.js': {
        'cli/commands/collection': 'collectionsListCmd',
        'cli/commands/plugin': 'pluginListCmd',
        'collections/commands': 'collectionsList'
      },
      'removeCmd.js': {
        'cli/commands/collection': 'collectionsRemoveCmd',
        'collections/commands': 'collectionsRemove'
      },
      'updateCmd.js': {
        'cli/commands/collection': 'collectionsUpdateCmd',
        'collections/commands': 'collectionsUpdate'
      }
    };
  }

  scanFeature(featureName, feature) {
    // Only returns scanDirectory result
    const pattern = feature.pattern;
    const baseDir = pattern.split('**')[0];
    return this.scanDirectory(baseDir, featureName);
  }

  scanDirectory(dir, featureName = '') {
    const files = [];
    const fullPath = path.join(this.projectRoot, dir);

    if (!fs.existsSync(fullPath)) return files;

    const items = fs.readdirSync(fullPath);

    for (const item of items) {
      const itemPath = path.join(fullPath, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        files.push(...this.scanDirectory(path.join(dir, item), featureName));
      } else if (item.endsWith('.js')) {
        files.push({
          name: item,
          relativePath: path.join(dir, item).replace(/\\/g, '/'),
          directory: dir,
          feature: featureName
        });
      }
    }

    return files;
  }

  getVariableName(file) {
    // Check contextual naming first
    if (this.contextualNaming[file.name]) {
      const contexts = this.contextualNaming[file.name];
      for (const [contextPath, varName] of Object.entries(contexts)) {
        if (file.directory.includes(contextPath)) {
          return `${varName}Path`;
        }
      }
    }

    // Default camelCase conversion
    const baseName = path.basename(file.name, '.js');
    const camelCase = baseName
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace(/\s/g, '')
      .replace(/^\w/, l => l.toLowerCase());

    return `${camelCase}Path`;
  }

  generateBeautifulRegistry() {
    const content = [];

    // Header with metadata
    content.push('// paths.js - Project Path Registry');
    content.push(`// Generated: ${new Date().toISOString()}`);
    content.push('// Architecture: Feature-based with dependency ranking');
    content.push('// Regenerate: npm run generate:paths');
    content.push('');
    content.push('const path = require(\'path\');');
    content.push('const scriptsPaths = require(\'./scripts/scriptsPaths\');');
    content.push('');

    // Architecture section (foundation, interfaces, boundaries, tooling)
    content.push('// ==========================================');
    content.push('// ARCHITECTURE');
    content.push('// ==========================================');
    content.push('');

    for (const [_sectionName, section] of Object.entries(this.architecture)) { // eslint-disable-line no-unused-vars
      content.push(`// --- ${section.comment} ---`);
      for (const [varName, pathDef] of Object.entries(section.items)) {
        content.push(`const ${varName} = ${pathDef};`);
      }
      content.push('');
    }

    // Features section
    content.push('// ==========================================');
    content.push('// FEATURES (by dependency rank)');
    content.push('// ==========================================');
    content.push('');

    // Scan and organize features
    const featureFiles = {};
    for (const [featureName, feature] of Object.entries(this.features)) {
      featureFiles[featureName] = this.scanFeature(featureName, feature);
    }

    // Group by rank
    const ranks = {};
    for (const [featureName, feature] of Object.entries(this.features)) {
      const rank = feature.rank;
      if (!ranks[rank]) ranks[rank] = [];
      ranks[rank].push({ featureName, feature, files: featureFiles[featureName] });
    }

    // Output by rank
    for (const rankNum of Object.keys(ranks).sort()) {
      const rankComment = {
        0: 'user-facing interfaces',
        1: 'essential operations',
        2: 'supportive operations',
        3: 'enhancements & utilities'
      }[rankNum];

      content.push(`// --- Rank ${rankNum}: ${rankComment} ---`);
      content.push('');

      for (const { featureName, feature, files } of ranks[rankNum]) {
        if (files.length === 0) continue;

        content.push(`// ${feature.comment}`);
        content.push(`const ${featureName}Root = path.join(srcRoot, '${featureName}');`);

        // Sort files within feature
        const sortedFiles = files.sort((a, b) => {
          // Sort by directory depth first, then alphabetically
          const aDepth = a.directory.split('/').length;
          const bDepth = b.directory.split('/').length;
          if (aDepth !== bDepth) return aDepth - bDepth;
          return a.name.localeCompare(b.name);
        });

        for (const file of sortedFiles) {
          const varName = this.getVariableName(file);
          content.push(`const ${varName} = path.join(projectRoot, '${file.relativePath}');`);
        }
        content.push('');
      }
    }

    // Export section
    content.push('// ==========================================');
    content.push('// EXPORTS');
    content.push('// ==========================================');
    content.push('');
    content.push('module.exports = {');
    content.push('');

    // Architecture exports
    content.push('  // --- Architecture ---');
    for (const section of Object.values(this.architecture)) {
      for (const varName of Object.keys(section.items)) {
        content.push(`  ${varName},`);
      }
    }
    content.push('');

    // Feature exports by rank
    for (const rankNum of Object.keys(ranks).sort()) {
      const rankComment = {
        0: 'User Interfaces',
        1: 'Essential Operations',
        2: 'Supportive Operations',
        3: 'Enhancements'
      }[rankNum];

      content.push(`  // --- Rank ${rankNum}: ${rankComment} ---`);

      for (const { featureName, files } of ranks[rankNum]) {
        if (files.length === 0) continue;

        content.push(`  ${featureName}Root,`);
        for (const file of files) {
          const varName = this.getVariableName(file);
          content.push(`  ${varName},`);
        }
      }
      content.push('');
    }

    // Scripts registry
    content.push('  // --- Scripts Registry ---');
    content.push('  ...scriptsPaths,');
    content.push('');
    content.push('};');

    return content.join('\n');
  }

  writeRegistry(dryRun = false) {
    const newContent = this.generateBeautifulRegistry();

    if (dryRun) {
      console.log(' DRY RUN - Generated content:');
      console.log('='.repeat(50));
      console.log(newContent);
      console.log('='.repeat(50));
      return;
    }

    let hasChanged = true;
    if (fs.existsSync(this.pathsFile)) {
      const oldContent = fs.readFileSync(this.pathsFile, 'utf8');
      // Compare content without the first 4 header lines (which include the timestamp)
      const oldContentBody = oldContent.split('\n').slice(4).join('\n');
      const newContentBody = newContent.split('\n').slice(4).join('\n');
      if (oldContentBody === newContentBody) {
        hasChanged = false;
      }
    }

    if (hasChanged) {
      fs.writeFileSync(this.pathsFile, newContent);
      console.log('Generated beautiful paths registry');
      console.log('Architecture: Foundation → Interfaces → Boundaries → Tooling → Statics');
      console.log('Features: Ranked by dependency (0=user-facing, 3=utilities)');
      console.log('Structure: Mirrors mocha file elegance');
    } else {
      console.log('No changes detected in path registry. File not updated.');
    }
  }
}

// CLI usage
if (require.main === module) {
  const generator = new BeautifulPathsGenerator();
  const dryRun = process.argv.includes('--dry-run');
  generator.writeRegistry(dryRun);
}

module.exports = BeautifulPathsGenerator;

