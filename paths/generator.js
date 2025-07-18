#!/usr/bin/env node
// paths/generator.js

const fs = require('fs');
const path = require('path');

class BeautifulPathsGenerator {
  constructor(projectRoot = process.cwd()) {
    this.projectRoot = projectRoot;
    this.mainOutputFile = path.join(projectRoot, 'paths', 'index.js');
    this.scriptsOutputFile = path.join(projectRoot, 'paths', 'scripts.js');

    // Main application configuration
    this.mainConfig = {
      outputPath: this.mainOutputFile,
      header: {
        title: 'Project Path Registry',
        architecture: 'Feature-based with dependency ranking',
        regenerate: 'npm run paths',
      },
      imports: {
        scriptsPaths: './scripts.js',
      },
      architecture: {
        // Core system paths (foundation)
        foundation: {
          comment: 'Project Foundation',
          items: {
            projectRoot: 'path.resolve(__dirname, \'..\')',
            pathsPath: 'path.join(__dirname, \'index.js\')',
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
            findLitterRulesPath: 'path.join(assetsRoot, \'litter-list.txt\')',
            lintingConfigPath: 'path.join(scriptsRoot, \'linting\', \'config.yaml\')',
          }
        }
      },

      // Feature-based grouping
      features: {
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
      },

      // Degenerate handling with context
      contextualNaming: {
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
      },
    };

    // Scripts registry configuration
    this.scriptsConfig = {
      outputPath: this.scriptsOutputFile,
      header: {
        title: 'Scripts Path Registry',
        architecture: 'Directory-based',
        regenerate: 'npm run paths',
      },
      baseVar: 'scriptsRoot',
      basePath: 'scripts',
      scan: true, // Indicates this config should be based on a directory scan
      fileExtensions: ['.js', '.sh'],
      excludePatterns: ['scripts/scriptsPaths.js'], // Exclude the old, now-moved file
    };
  }

  scanFeature(featureName, feature) {
    // Only returns scanDirectory result
    const pattern = feature.pattern;
    const baseDir = pattern.split('**')[0];
    return this.scanDirectory(baseDir, featureName);
  }

  scanDirectory(dir, featureName = '', fileExtensions = ['.js', '.sh']) {
    const files = [];
    const fullPath = path.join(this.projectRoot, dir);

    if (!fs.existsSync(fullPath)) return files;

    const items = fs.readdirSync(fullPath);

    for (const item of items) {
      const itemPath = path.join(fullPath, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        files.push(...this.scanDirectory(path.join(dir, item), featureName, fileExtensions));
      } else if (fileExtensions.some(ext => item.endsWith(ext))) {
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

  getVariableName(file, contextualNaming = {}) {
    // Check contextual naming first
    if (contextualNaming[file.name]) {
      const contexts = contextualNaming[file.name];
      for (const [contextPath, varName] of Object.entries(contexts)) {
        if (file.directory.includes(contextPath)) {
          return `${varName}Path`;
        }
      }
    }

    // Default camelCase conversion
    const baseNameWithExt = file.name;
    const ext = path.extname(baseNameWithExt);
    const baseName = path.basename(baseNameWithExt, ext);
    const suffix = ext.replace('.', '');

    const camelCase = baseName
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace(/\s/g, '')
      .replace(/^\w/, l => l.toLowerCase());

    const suffixUpper = suffix.charAt(0).toUpperCase() + suffix.slice(1);
    return `${camelCase}${suffix.toLowerCase() === 'js' ? '' : suffixUpper}Path`;
  }

  generateRegistry(config) {
    const { header, imports, architecture, features, contextualNaming, baseVar, basePath, scan, fileExtensions, excludePatterns } = config;
    const content = [];

    // Header with metadata
    content.push(`// ${path.basename(config.outputPath)} - ${header.title}`);
    content.push(`// Generated: ${new Date().toISOString()}`);
    content.push(`// Architecture: ${header.architecture}`);
    content.push(`// Regenerate: ${header.regenerate}`);
    content.push('');
    content.push('const path = require(\'path\');');
    if (imports) {
      for (const [key, value] of Object.entries(imports)) {
        content.push(`const ${key} = require('${value}');`);
      }
    }
    content.push('');

    // Architecture section
    if (architecture) {
      content.push('// ==========================================');
      content.push('// ARCHITECTURE');
      content.push('// ==========================================');
      content.push('');
      for (const [_sectionName, section] of Object.entries(architecture)) { // eslint-disable-line no-unused-vars
        content.push(`// --- ${section.comment} ---`);
        for (const [varName, pathDef] of Object.entries(section.items)) {
          content.push(`const ${varName} = ${pathDef};`);
        }
        content.push('');
      }
    }

    // Scan-based section
    if(scan) {
      content.push('// ==========================================');
      content.push('// SCANNED ENTRIES');
      content.push('// ==========================================');
      content.push('');
      content.push(`const ${baseVar} = path.join(__dirname, '..', '${basePath}');`);
      const scannedFiles = this.scanDirectory(basePath, '', fileExtensions)
        .filter(file => !(excludePatterns || []).includes(file.relativePath));

      const filesByDir = scannedFiles.reduce((acc, file) => {
        const dir = path.dirname(file.relativePath);
        if (!acc[dir]) acc[dir] = [];
        acc[dir].push(file);
        return acc;
      }, {});

      for(const dir in filesByDir) {
        content.push(`// --- ${dir.replace(/\\/g, '/')} ---`);
        filesByDir[dir].forEach(file => {
          const varName = this.getVariableName(file);
          const relPath = path.relative(basePath, file.relativePath);
          content.push(`const ${varName} = path.join(${baseVar}, '${relPath.replace(/\\/g, '/')}');`);
        });
        content.push('');
      }
    }

    // Features section
    const featureFiles = {};
    if (features) {
      content.push('// ==========================================');
      content.push('// FEATURES (by dependency rank)');
      content.push('// ==========================================');
      content.push('');
      for (const [featureName, feature] of Object.entries(features)) {
        featureFiles[featureName] = this.scanFeature(featureName, feature);
      }
      const ranks = {};
      for (const [featureName, feature] of Object.entries(features)) {
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
            const aDepth = a.directory.split('/').length;
            const bDepth = b.directory.split('/').length;
            if (aDepth !== bDepth) return aDepth - bDepth;
            return a.name.localeCompare(b.name);
          });
          for (const file of sortedFiles) {
            const varName = this.getVariableName(file, contextualNaming);
            content.push(`const ${varName} = path.join(projectRoot, '${file.relativePath}');`);
          }
          content.push('');
        }
      }
    }

    // Export section
    content.push('// ==========================================');
    content.push('// EXPORTS');
    content.push('// ==========================================');
    content.push('');
    content.push('module.exports = {');
    content.push('');
    if (architecture) {
      content.push('  // --- Architecture ---');
      for (const section of Object.values(architecture)) {
        for (const varName of Object.keys(section.items)) {
          content.push(`  ${varName},`);
        }
      }
      content.push('');
    }

    if (scan) {
      const scannedFiles = this.scanDirectory(basePath, '', fileExtensions)
        .filter(file => !(excludePatterns || []).includes(file.relativePath));
      content.push(`  ${baseVar},`);
      scannedFiles.forEach(file => {
        content.push(`  ${this.getVariableName(file)},`);
      });
      content.push('');
    }

    if (features) {
      const ranks = {};
      for (const [featureName, feature] of Object.entries(features)) {
        const rank = feature.rank;
        if (!ranks[rank]) ranks[rank] = [];
        ranks[rank].push({ featureName, feature, files: featureFiles[featureName] });
      }
      for (const rankNum of Object.keys(ranks).sort()) {
        const rankComment = { 0: 'User Interfaces', 1: 'Essential Operations', 2: 'Supportive Operations', 3: 'Enhancements' }[rankNum];
        content.push(`  // --- Rank ${rankNum}: ${rankComment} ---`);
        for (const { featureName, files } of ranks[rankNum]) {
          if (files.length === 0) continue;
          content.push(`  ${featureName}Root,`);
          for (const file of files) {
            const varName = this.getVariableName(file, contextualNaming);
            content.push(`  ${varName},`);
          }
        }
        content.push('');
      }
    }

    if (imports) {
      content.push('  // --- Scripts Registry ---');
      for (const key of Object.keys(imports)) {
        content.push(`  ...${key},`);
      }
      content.push('');
    }
    content.push('};');
    return content.join('\n');
  }

  writeRegistry(config, dryRun = false) {
    const newContent = this.generateRegistry(config);
    const outputPath = config.outputPath;

    if (dryRun) {
      console.log(` DRY RUN - Generated content for ${outputPath}:`);
      console.log('='.repeat(50));
      console.log(newContent);
      console.log('='.repeat(50));
      return;
    }

    let hasChanged = true;
    if (fs.existsSync(outputPath)) {
      const oldContent = fs.readFileSync(outputPath, 'utf8');
      // Compare content without the first 4 header lines (which include the timestamp)
      const oldContentBody = oldContent.split('\n').slice(4).join('\n');
      const newContentBody = newContent.split('\n').slice(4).join('\n');
      if (oldContentBody === newContentBody) {
        hasChanged = false;
      }
    }

    if (hasChanged) {
      fs.writeFileSync(outputPath, newContent);
      console.log(`Generated beautiful paths registry at ${outputPath}`);
    } else {
      console.log(`No changes detected in path registry. File not updated: ${outputPath}`);
    }
  }

  run(dryRun = false) {
    this.writeRegistry(this.mainConfig, dryRun);
    this.writeRegistry(this.scriptsConfig, dryRun);
  }
}

// CLI usage
if (require.main === module) {
  const generator = new BeautifulPathsGenerator();
  const dryRun = process.argv.includes('--dry-run');
  generator.run(dryRun);
}

module.exports = BeautifulPathsGenerator;
