#!/usr/bin/env node
// paths/generator.js - Refactored declarative version

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const yaml = require('js-yaml');

class DeclarativePathsGenerator {
  constructor(configPath = null, projectRoot = process.cwd()) {
    this.projectRoot = projectRoot;
    this.configPath = configPath || path.join(projectRoot, 'paths', 'paths-config.yaml');
    this.config = this.loadConfig();
  }

  loadConfig() {
    if (!fs.existsSync(this.configPath)) {
      throw new Error(`Configuration file not found: ${this.configPath}`);
    }
    try {
      const configContent = fs.readFileSync(this.configPath, 'utf8');
      return yaml.load(configContent);
    } catch (error) {
      throw new Error(`Failed to parse configuration: ${error.message}`);
    }
  }

  scanFeature(featureName, feature) {
    let patterns = feature.pattern;
    if (!Array.isArray(patterns)) patterns = [patterns];

    // Use Set to avoid duplicates across patterns
    const matchedFiles = new Set();
    for (const pattern of patterns) {
      glob.sync(pattern, { cwd: this.projectRoot, absolute: false })
        .forEach(f => matchedFiles.add(f));
    }

    return Array.from(matchedFiles).map(f => {
      const dir = path.dirname(f);
      const name = path.basename(f);
      return {
        name,
        relativePath: f.replace(/\\/g, '/'),
        directory: dir.replace(/\\/g, '/'),
        feature: featureName,
      };
    });
  }

  scanDirectory(dir, featureName = '', fileExtensions = null) {
    const extensions = fileExtensions || this.config.globals?.file_extensions || ['.js', '.sh'];
    const excludePatterns = this.config.globals?.exclude_patterns || [];
    const files = [];
    const fullPath = path.join(this.projectRoot, dir);

    if (!fs.existsSync(fullPath)) return files;

    const items = fs.readdirSync(fullPath);

    for (const item of items) {
      const itemPath = path.join(fullPath, item);
      const stat = fs.statSync(itemPath);
      const relativePath = path.join(dir, item).replace(/\\/g, '/');

      const isExcluded = excludePatterns.some(pattern => {
        const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
        return regex.test(relativePath);
      });

      if (isExcluded) continue;

      if (stat.isDirectory()) {
        files.push(...this.scanDirectory(path.join(dir, item), featureName, extensions));
      } else if (extensions.some(ext => item.endsWith(ext))) {
        files.push({
          name: item,
          relativePath,
          directory: dir,
          feature: featureName
        });
      }
    }

    return files;
  }

  camelCase(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace(/\s/g, '')
      .replace(/^\w/, l => l.toLowerCase());
  }

  getVariableName(file, contextualNaming = {}) {
    // Check contextual naming first
    if (contextualNaming[file.name]) {
      const contexts = contextualNaming[file.name];
      for (const [contextPath, varName] of Object.entries(contexts)) {
        if (file.directory.includes(contextPath)) {
          // Ensure the contextual name is camelCased
          return `${this.camelCase(varName)}Path`;
        }
      }
    }

    // Default camelCase conversion
    const baseNameWithExt = file.name;
    const ext = path.extname(baseNameWithExt);
    const baseName = path.basename(baseNameWithExt, ext);
    const suffix = ext.replace('.', '');

    const camelCaseName = this.camelCase(baseName);

    const suffixUpper = suffix.charAt(0).toUpperCase() + suffix.slice(1);
    return `${camelCaseName}${suffix.toLowerCase() === 'js' ? '' : suffixUpper}Path`;
  }

  generateRegistry(registryName, registryConfig) {
    const content = [];
    const metadata = this.config.metadata || {};

    // Header with metadata
    content.push(`// ${path.basename(registryConfig.output_file)} - ${registryConfig.title}`);
    content.push(`// Generated: ${new Date().toISOString()}`);
    content.push(`// Architecture: ${registryConfig.architecture}`);
    content.push(`// Regenerate: ${metadata.regenerate_command || 'npm run paths'}`);
    if (metadata.generated_warning) {
      content.push(`// ${metadata.generated_warning}`);
    }
    content.push('');
    content.push('const path = require(\'path\');');

    // Imports
    if (registryConfig.imports) {
      for (const [key, value] of Object.entries(registryConfig.imports)) {
        content.push(`const ${this.camelCase(key)} = require('${value}');`);
      }
    }
    content.push('');

    // Architecture section
    const archSections = registryConfig.architecture_sections || registryConfig.architecture;
    if (archSections && typeof archSections === 'object') {
      content.push('// ==========================================');
      content.push('// ARCHITECTURE');
      content.push('// ==========================================');
      content.push('');

      for (const [_sectionName, section] of Object.entries(archSections)) { // eslint-disable-line no-unused-vars
        if (section && section.comment && section.items) {
          content.push(`// --- ${section.comment} ---`);
          for (const [varName, pathDef] of Object.entries(section.items)) {
            content.push(`const ${this.camelCase(varName)} = ${pathDef};`);
          }
          content.push('');
        }
      }
    }

    // Scan-based section
    if (registryConfig.scan_mode) {
      content.push('// ==========================================');
      content.push('// SCANNED ENTRIES');
      content.push('// ==========================================');
      content.push('');

      const baseVar = this.camelCase(registryConfig.base_var);
      const basePath = registryConfig.base_path;
      // Define the base variable relative to the output file's directory
      content.push(`const ${baseVar} = path.join(path.dirname(__filename), '..', '${basePath}');`);

      const scannedFiles = this.scanDirectory(
        basePath,
        '',
        registryConfig.file_extensions
      ).filter(file =>
        !(registryConfig.exclude_patterns || []).includes(file.relativePath)
      );

      const filesByDir = scannedFiles.reduce((acc, file) => {
        const dir = path.dirname(file.relativePath);
        if (!acc[dir]) acc[dir] = [];
        acc[dir].push(file);
        return acc;
      }, {});

      for (const dir in filesByDir) {
        content.push(`// --- ${dir.replace(/\\/g, '/')} ---`);
        filesByDir[dir].forEach(file => {
          const varName = this.getVariableName(file, registryConfig.contextual_naming);
          const relPath = path.relative(basePath, file.relativePath);
          content.push(`const ${varName} = path.join(${baseVar}, '${relPath.replace(/\\/g, '/')}');`);
        });
        content.push('');
      }
    }

    // Features section
    const featureFiles = {};
    if (registryConfig.features) {
      content.push('// ==========================================');
      content.push('// FEATURES (by dependency rank)');
      content.push('// ==========================================');
      content.push('');

      // Collect all feature files
      for (const [featureName, feature] of Object.entries(registryConfig.features)) {
        featureFiles[featureName] = this.scanFeature(featureName, feature);
      }

      // Group by rank
      const ranks = {};
      for (const [featureName, feature] of Object.entries(registryConfig.features)) {
        const rank = feature.rank || 0;
        if (!ranks[rank]) ranks[rank] = [];
        ranks[rank].push({ featureName, feature, files: featureFiles[featureName] });
      }

      // Output by rank
      const rankDefinitions = this.config.rank_definitions || {};
      for (const rankNum of Object.keys(ranks).sort()) {
        const rankComment = rankDefinitions[rankNum] || `rank ${rankNum}`;
        content.push(`// --- Rank ${rankNum}: ${rankComment} ---`);
        content.push('');

        for (const { featureName, feature, files } of ranks[rankNum]) {
          if (files.length === 0) continue;

          content.push(`// ${feature.comment}`);
          // CORRECTED LOGIC: Determine the root variable based on the registry's own definitions or projectRoot
          const featureBaseDir = feature.pattern.split('**')[0];
          const rootVarName = `${this.camelCase(featureName)}Root`;
          content.push(`const ${rootVarName} = path.join(projectRoot, '${featureBaseDir}');`);

          const sortedFiles = files.sort((a, b) => {
            const aDepth = a.directory.split('/').length;
            const bDepth = b.directory.split('/').length;
            if (aDepth !== bDepth) return aDepth - bDepth;
            return a.name.localeCompare(b.name);
          });

          for (const file of sortedFiles) {
            const varName = this.getVariableName(file, registryConfig.contextual_naming);
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

    // Export architecture variables
    const archSectionsToExport = registryConfig.architecture_sections || registryConfig.architecture;
    if (archSectionsToExport && typeof archSectionsToExport === 'object') {
      content.push('  // --- Architecture ---');
      for (const section of Object.values(archSectionsToExport)) {
        if (section && section.items) {
          for (const varName of Object.keys(section.items)) {
            content.push(`  ${this.camelCase(varName)},`);
          }
        }
      }
      content.push('');
    }

    // Export scanned variables
    if (registryConfig.scan_mode) {
      const baseVar = this.camelCase(registryConfig.base_var);
      const scannedFiles = this.scanDirectory(registryConfig.base_path, '', registryConfig.file_extensions)
        .filter(file => !(registryConfig.exclude_patterns || []).includes(file.relativePath));

      content.push(`  ${baseVar},`);
      scannedFiles.forEach(file => {
        content.push(`  ${this.getVariableName(file, registryConfig.contextual_naming)},`);
      });
      content.push('');
    }

    // Export feature variables
    if (registryConfig.features) {
      const ranks = {};
      for (const [featureName, feature] of Object.entries(registryConfig.features)) {
        const rank = feature.rank || 0;
        if (!ranks[rank]) ranks[rank] = [];
        ranks[rank].push({ featureName, feature, files: featureFiles[featureName] });
      }

      const rankDefinitions = this.config.rank_definitions || {};
      for (const rankNum of Object.keys(ranks).sort()) {
        const rankComment = rankDefinitions[rankNum] || `Rank ${rankNum}`;
        content.push(`  // --- ${rankComment} ---`);

        for (const { featureName, files } of ranks[rankNum]) {
          if (files.length === 0) continue;
          content.push(`  ${this.camelCase(featureName)}Root,`);
          for (const file of files) {
            const varName = this.getVariableName(file, registryConfig.contextual_naming);
            content.push(`  ${varName},`);
          }
        }
        content.push('');
      }
    }

    // Export imports
    if (registryConfig.imports) {
      content.push('  // --- Imported Registries ---');
      for (const key of Object.keys(registryConfig.imports)) {
        content.push(`  ...${this.camelCase(key)},`);
      }
      content.push('');
    }

    content.push('};');
    return content.join('\n');
  }

  writeRegistry(registryName, registryConfig, dryRun = false) {
    const newContent = this.generateRegistry(registryName, registryConfig);
    const outputPath = path.join(this.projectRoot, registryConfig.output_file);

    if (dryRun) {
      console.log(`\n DRY RUN - Generated content for ${registryName} (${outputPath}):`);
      console.log('='.repeat(60));
      console.log(newContent);
      console.log('='.repeat(60));
      return;
    }

    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    let hasChanged = true;
    if (fs.existsSync(outputPath)) {
      const oldContent = fs.readFileSync(outputPath, 'utf8');
      const oldContentBody = oldContent.split('\n').slice(2).join('\n');
      const newContentBody = newContent.split('\n').slice(2).join('\n');
      if (oldContentBody === newContentBody) {
        hasChanged = false;
      }
    }

    if (hasChanged) {
      fs.writeFileSync(outputPath, newContent);
      console.log(`Generated ${registryName} registry: ${outputPath}`);
    } else {
      console.log(`No changes in ${registryName} registry: ${outputPath}`);
    }
  }

  run(dryRun = false) {
    console.log(`\nGenerating path registries from: ${this.configPath}`);
    console.log(`Project root: ${this.projectRoot}\n`);

    const registries = this.config.registries || {};
    const registryNames = Object.keys(registries);

    if (registryNames.length === 0) {
      console.log(' No registries configured');
      return;
    }

    console.log(`Found ${registryNames.length} registries: ${registryNames.join(', ')}\n`);

    for (const [registryName, registryConfig] of Object.entries(registries)) {
      try {
        this.writeRegistry(registryName, registryConfig, dryRun);
      } catch (error) {
        console.error(`Error generating ${registryName}: ${error.message}`);
        console.error(error.stack);
      }
    }

    console.log('\nPath registry generation complete!');
  }

  validateConfig() {
    const errors = [];

    if (!this.config.registries) {
      errors.push('Missing "registries" section in configuration');
    }

    for (const [name, registry] of Object.entries(this.config.registries || {})) {
      if (!registry.output_file) {
        errors.push(`Registry "${name}" missing output_file`);
      }
      if (!registry.title) {
        errors.push(`Registry "${name}" missing title`);
      }
    }

    return errors;
  }
}

if (require.main === module) {
  const configPath = process.argv.find(arg => arg.startsWith('--config='))?.split('=')[1];
  const dryRun = process.argv.includes('--dry-run');
  const validate = process.argv.includes('--validate');

  try {
    const generator = new DeclarativePathsGenerator(configPath);

    if (validate) {
      const errors = generator.validateConfig();
      if (errors.length > 0) {
        console.error('Configuration validation failed:');
        errors.forEach(error => console.error(`  • ${error}`));
        process.exit(1);
      } else {
        console.log('Configuration is valid');
        process.exit(0);
      }
    }

    generator.run(dryRun);
  } catch (error) {
    console.error(`Fatal error: ${error.message}`);
    process.exit(1);
  }
}

module.exports = DeclarativePathsGenerator;
