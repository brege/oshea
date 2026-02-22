// paths/lib/dependency-tracer.js

require('module-alias/register');
const fs = require('node:fs');
const path = require('node:path');
const acorn = require('acorn');
const walk = require('acorn-walk');
const { TreeRenderer } = require('./tree-renderer');
const { loggerPath } = require('@paths');
const logger = require(loggerPath);

class DependencyTreeTracer {
  constructor(options = {}) {
    this.projectRoot = process.cwd();
    this.pathsRegistry = this._loadPathsRegistry();
    this.reverseRegistry = this._buildReverseRegistry();
    this.fileContentsCache = new Map();

    const defaultPresets = ['cli.js', 'index.js', 'package.json', 'paths/'];
    this.presetContextFiles = [
      ...defaultPresets,
      ...(options.additionalPresets || []),
    ];
    this.presetContextSet = new Set(
      this.presetContextFiles.map((p) => p.replace(/\/$/, '')),
    );
  }

  run(targetFiles, options = {}) {
    logger.info(`\nTracing dependencies for: ${targetFiles.join(', ')}`);
    if (this.presetContextFiles.length > 4) {
      logger.info(
        `Including custom presets: ${this.presetContextFiles.slice(4).join(', ')}`,
      );
    }
    logger.info('='.repeat(60));

    const contextPackage = this._buildContextPackage(targetFiles);

    if (options.showImports) {
      logger.info('\nImport Statement:');
      logger.info('-'.repeat(40));
      const importStatement = this._generateImportStatement(contextPackage);
      logger.info(importStatement, { format: 'paths' });
    }

    if (options.showTree) {
      logger.info('\nDependency Tree:');
      logger.info('-'.repeat(40));
      const renderer = new TreeRenderer(contextPackage.trees);
      renderer.render();
    }

    if (options.showStats) {
      logger.info('\nStatistics:');
      logger.info('-'.repeat(40));
      logger.info(
        `Total files in context: ${contextPackage.stats.totalFiles}\n`,
      );
      logger.info(
        `Registered files: ${contextPackage.stats.registeredFiles}\n`,
      );
      logger.info(
        `Unregistered files: ${contextPackage.stats.unregisteredFiles}\n`,
      );
    }

    if (options.showFiles) {
      logger.info('\nAll Files in Context:');
      logger.info('-'.repeat(40));
      contextPackage.files.forEach((file) => {
        const varName = this.reverseRegistry.get(file);
        const isPreset =
          this.presetContextSet.has(file.replace(/\/$/, '')) ||
          this.presetContextSet.has(path.dirname(file));
        let label = '';
        if (varName) {
          label = `-> ${varName}`;
        } else if (!isPreset) {
          label = '(unregistered)';
        }
        logger.info(`${file} ${label}`);
      });
    }
    return contextPackage;
  }

  _loadPathsRegistry() {
    try {
      const registryPath = path.join(this.projectRoot, 'paths', 'index.js');
      delete require.cache[require.resolve(registryPath)];
      return require(registryPath);
    } catch (error) {
      throw new Error(`Failed to load paths registry: ${error.message}`, {
        cause: error,
      });
    }
  }

  _buildReverseRegistry() {
    const reverse = new Map();
    for (const [varName, filePath] of Object.entries(this.pathsRegistry)) {
      if (typeof filePath === 'string' && filePath.includes(this.projectRoot)) {
        const relativePath = path.relative(this.projectRoot, filePath);
        reverse.set(relativePath.replace(/\\/g, '/'), varName);
      }
    }
    return reverse;
  }

  _getFileContents(filePath) {
    if (!this.fileContentsCache.has(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        this.fileContentsCache.set(filePath, content);
      } catch {
        this.fileContentsCache.set(filePath, null);
      }
    }
    return this.fileContentsCache.get(filePath);
  }

  _extractRequires(filePath) {
    const content = this._getFileContents(filePath);
    if (!content) return [];

    const requires = [];
    const ast = acorn.parse(content, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      locations: true,
    });

    const pathVariables = new Set();
    walk.simple(ast, {
      VariableDeclarator: (node) => {
        if (
          node.init &&
          node.init.type === 'CallExpression' &&
          node.init.callee.name === 'require' &&
          node.init.arguments.length === 1 &&
          node.init.arguments[0].type === 'Literal' &&
          node.init.arguments[0].value === '@paths'
        ) {
          if (node.id.type === 'ObjectPattern') {
            node.id.properties.forEach((prop) => {
              if (prop.key.type === 'Identifier') {
                pathVariables.add(prop.key.name);
              }
            });
          }
        }
      },
    });

    walk.simple(ast, {
      CallExpression: (node) => {
        if (node.callee.name === 'require' && node.arguments.length > 0) {
          const arg = node.arguments[0];
          let requirePath = null;
          let variable = null;

          if (arg.type === 'Literal') {
            requirePath = arg.value;
          } else if (arg.type === 'Identifier' && pathVariables.has(arg.name)) {
            requirePath = this.pathsRegistry[arg.name];
            variable = arg.name;
          }

          if (requirePath) {
            if (
              !requirePath.startsWith('.') &&
              !requirePath.startsWith('/') &&
              requirePath !== '@paths' &&
              !path.isAbsolute(requirePath)
            ) {
              return;
            }

            requires.push({
              path: requirePath,
              variable: variable,
            });
          }
        }
      },
    });

    return requires;
  }

  _resolveRequirePath(basePath, requirePath) {
    if (path.isAbsolute(requirePath)) {
      return requirePath;
    }

    if (requirePath === '@paths') {
      return path.join(this.projectRoot, 'paths', 'index.js');
    }

    if (requirePath.startsWith('.')) {
      const baseDir = path.dirname(basePath);
      let resolved = path.resolve(baseDir, requirePath);

      if (!fs.existsSync(resolved) && !path.extname(resolved)) {
        const withJs = `${resolved}.js`;
        if (fs.existsSync(withJs)) {
          resolved = withJs;
        }
      }
      return resolved;
    }
    return null;
  }

  _traceDependencies(startFile, visited) {
    const absolutePath = path.resolve(this.projectRoot, startFile);
    const relativePath = path
      .relative(this.projectRoot, absolutePath)
      .replace(/\\/g, '/');

    if (visited.has(relativePath)) {
      return {
        circular: true,
        file: relativePath,
      };
    }
    if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
      return {
        missing: true,
        file: relativePath,
      };
    }

    visited.add(relativePath);

    const requires = this._extractRequires(absolutePath);
    const dependencies = [];

    for (const req of requires) {
      const resolvedPath = this._resolveRequirePath(absolutePath, req.path);

      if (resolvedPath) {
        const dependency = this._traceDependencies(
          path.relative(this.projectRoot, resolvedPath),
          visited,
        );
        dependencies.push(dependency);
      }
    }

    return {
      file: relativePath,
      registryVar: this.reverseRegistry.get(relativePath),
      dependencies,
    };
  }

  _collectFilesFromTree(node, allFiles, registryVars) {
    if (!node || !node.file || allFiles.has(node.file)) return;

    allFiles.add(node.file);
    if (node.registryVar) {
      registryVars.add(node.registryVar);
    }

    if (Array.isArray(node.dependencies)) {
      for (const dep of node.dependencies) {
        this._collectFilesFromTree(dep, allFiles, registryVars);
      }
    }
  }

  _findFilesInDir(startPath) {
    const results = [];
    const fullStartPath = path.resolve(this.projectRoot, startPath);
    if (!fs.existsSync(fullStartPath)) return results;

    const files = fs.readdirSync(fullStartPath);
    for (const file of files) {
      const filename = path.join(startPath, file);
      const fullFilename = path.join(fullStartPath, file);
      const stat = fs.lstatSync(fullFilename);

      if (stat.isDirectory()) {
        results.push(...this._findFilesInDir(filename));
      } else {
        results.push(filename);
      }
    }
    return results;
  }

  _buildContextPackage(startFiles) {
    const allFiles = new Set();
    const registryVars = new Set();
    const trees = [];
    const visitedForTracing = new Set();

    for (const startFile of startFiles) {
      const tree = this._traceDependencies(startFile, visitedForTracing);
      trees.push(tree);
    }

    trees.forEach((tree) => {
      this._collectFilesFromTree(tree, allFiles, registryVars);
    });

    this.presetContextFiles.forEach((preset) => {
      if (preset.endsWith('/')) {
        this._findFilesInDir(preset).forEach((file) => {
          allFiles.add(file.replace(/\\/g, '/'));
        });
      } else if (fs.existsSync(preset)) {
        allFiles.add(preset);
      }
    });

    const filesArray = Array.from(allFiles).sort();
    const varsArray = Array.from(registryVars).sort();

    return {
      trees,
      files: filesArray,
      registryVars: varsArray,
      entryPoints: startFiles,
      stats: {
        totalFiles: filesArray.length,
        registeredFiles: varsArray.length,
        unregisteredFiles: filesArray.length - varsArray.length,
      },
    };
  }

  _generateImportStatement(contextPackage) {
    const { registryVars, entryPoints, stats } = contextPackage;
    if (registryVars.length === 0) {
      return '// No registry variables needed';
    }
    const lines = ["require('module-alias/register');", 'const { '];
    const varsPerLine = 3;
    for (let i = 0; i < registryVars.length; i += varsPerLine) {
      const chunk = registryVars.slice(i, i + varsPerLine);
      lines.push(
        `  ${chunk.join(', ')}${i + varsPerLine < registryVars.length ? ',' : ''}`,
      );
    }
    lines.push("} = require('@paths');");
    lines.push('');
    lines.push(`// Entry points: ${entryPoints.join(', ')}`);
    lines.push(`// Total files in context: ${stats.totalFiles}\n`);
    return lines.join('\n');
  }
}

module.exports = { DependencyTreeTracer };
