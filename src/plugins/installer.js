// src/plugins/installer.js
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const fsPromises = require('node:fs').promises;
const fsExtra = require('fs-extra');
const yaml = require('js-yaml');
const { spawn } = require('node:child_process');
const { projectRoot } = require('@paths');

const MANIFEST_FILENAME = 'plugins.yaml';
const PLUGIN_CONFIG_FILENAME = 'default.yaml';

function isValidPluginName(pluginName) {
  if (!pluginName || typeof pluginName !== 'string') {
    return false;
  }
  const regex = /^[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$/;
  return regex.test(pluginName);
}

function isGitSource(source) {
  return (
    /^(https?:\/\/|git@)/.test(source) ||
    (typeof source === 'string' && source.endsWith('.git'))
  );
}

function derivePluginIdFromGitSource(source) {
  if (!source || typeof source !== 'string') {
    return null;
  }

  const trimmed = source.trim();
  if (!trimmed) {
    return null;
  }

  let pathLike = trimmed.replace(/\/+$/, '');

  if (/^[^@\s]+@[^:\s]+:.+/.test(pathLike)) {
    const [, sshPath = ''] = pathLike.split(':');
    pathLike = sshPath;
  } else {
    try {
      const parsed = new URL(pathLike);
      pathLike = parsed.pathname || pathLike;
    } catch {
      // Keep original input when URL parsing is not applicable.
    }
  }

  const baseName = pathLike
    .replace(/\/+$/, '')
    .split('/')
    .filter(Boolean)
    .pop();

  if (!baseName) {
    return null;
  }

  const normalized = baseName.replace(/\.git$/i, '').trim();
  return normalized || null;
}

class PluginInstaller {
  constructor(options = {}, dependencies = {}) {
    const defaultDeps = {
      fs,
      fsPromises,
      fsExtra,
      path,
      os,
      yaml,
      spawn,
      process,
    };
    this.dependencies = { ...defaultDeps, ...dependencies };
    this.pluginsRoot = this._determinePluginsRoot(
      options.pluginsRootCliOverride,
      options.pluginsRootFromMainConfig,
    );
    this.manifestPath = this.dependencies.path.join(
      this.pluginsRoot,
      MANIFEST_FILENAME,
    );
    this.bundledPluginsRoot = this.dependencies.path.join(
      projectRoot,
      'plugins',
    );
  }

  _determinePluginsRoot(
    pluginsRootCliOverride = null,
    pluginsRootFromConfig = null,
  ) {
    const { process, os, path } = this.dependencies;

    if (pluginsRootCliOverride) {
      return path.resolve(pluginsRootCliOverride);
    }
    if (process.env.OSHEA_PLUGINS_ROOT) {
      return path.resolve(process.env.OSHEA_PLUGINS_ROOT);
    }
    if (pluginsRootFromConfig) {
      return path.resolve(pluginsRootFromConfig);
    }

    const xdgConfigHome =
      process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
    return path.join(xdgConfigHome, 'oshea', 'plugins');
  }

  async ensureRoot() {
    await this.dependencies.fsPromises.mkdir(this.pluginsRoot, {
      recursive: true,
    });
  }

  async _readManifest() {
    await this.ensureRoot();

    if (!this.dependencies.fs.existsSync(this.manifestPath)) {
      return { version: '1.0', plugins: {} };
    }

    const content = await this.dependencies.fsPromises.readFile(
      this.manifestPath,
      'utf8',
    );
    const parsed = this.dependencies.yaml.load(content) || {};
    return {
      version: '1.0',
      plugins: parsed.plugins || {},
    };
  }

  async _writeManifest(manifest) {
    await this.ensureRoot();
    const data = {
      version: '1.0',
      plugins: manifest.plugins || {},
    };
    await this.dependencies.fsPromises.writeFile(
      this.manifestPath,
      this.dependencies.yaml.dump(data),
    );
  }

  async _spawnGit(args, cwd = null) {
    return new Promise((resolve, reject) => {
      const child = this.dependencies.spawn('git', args, { cwd });
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      child.on('error', reject);
      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
          return;
        }
        reject(new Error(`git ${args.join(' ')} failed: ${stderr || stdout}`));
      });
    });
  }

  async _discoverSinglePlugin(dir, options = {}) {
    const { fsPromises, path } = this.dependencies;
    const configPath = path.join(dir, PLUGIN_CONFIG_FILENAME);
    if (!this.dependencies.fs.existsSync(configPath)) {
      throw new Error(`Expected '${PLUGIN_CONFIG_FILENAME}' at '${dir}'.`);
    }

    const raw = await fsPromises.readFile(configPath, 'utf8');
    const config = this.dependencies.yaml.load(raw) || {};
    const handlerScript = config.handler_script || 'index.js';

    let pluginId = path.basename(dir);
    const configPluginName =
      typeof config.plugin_name === 'string' ? config.plugin_name.trim() : '';
    const pluginIdHint =
      typeof options.pluginIdHint === 'string'
        ? options.pluginIdHint.trim()
        : '';

    if (
      options.preferConfigPluginName &&
      configPluginName &&
      isValidPluginName(configPluginName)
    ) {
      pluginId = configPluginName;
    } else if (pluginIdHint && isValidPluginName(pluginIdHint)) {
      pluginId = pluginIdHint;
    }

    if (!isValidPluginName(pluginId)) {
      throw new Error(
        `Plugin id '${pluginId}' is invalid. Use alphanumeric and hyphens only.`,
      );
    }

    if (typeof handlerScript !== 'string' || handlerScript.trim() === '') {
      throw new Error(
        `Plugin config '${configPath}' must define a non-empty 'handler_script'.`,
      );
    }

    const handlerPath = path.join(dir, handlerScript);
    if (!this.dependencies.fs.existsSync(handlerPath)) {
      throw new Error(
        `Plugin handler '${handlerScript}' not found at '${handlerPath}'.`,
      );
    }

    return {
      pluginId,
      basePath: dir,
      configPath,
    };
  }

  _isBundledPluginName(pluginName) {
    const { fs, path } = this.dependencies;
    const bundledPath = path.join(this.bundledPluginsRoot, pluginName);
    if (!fs.existsSync(bundledPath)) {
      return false;
    }
    try {
      return fs.statSync(bundledPath).isDirectory();
    } catch {
      return false;
    }
  }

  async _resolveSource(source) {
    const { fs, path, fsPromises, os } = this.dependencies;

    if (isGitSource(source)) {
      const tempRoot = await fsPromises.mkdtemp(
        path.join(os.tmpdir(), 'oshea-plugin-'),
      );
      const cloneDir = path.join(tempRoot, 'repo');
      await this._spawnGit(['clone', '--depth', '1', source, cloneDir]);
      const discovered = await this._discoverSinglePlugin(cloneDir, {
        pluginIdHint: derivePluginIdFromGitSource(source),
        preferConfigPluginName: true,
      });
      return {
        ...discovered,
        sourceType: 'git',
        source,
        cleanupPath: tempRoot,
      };
    }

    const absolutePath = path.resolve(source);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Plugin source path does not exist: '${absolutePath}'.`);
    }
    if (!fs.lstatSync(absolutePath).isDirectory()) {
      throw new Error(
        `Plugin source path is not a directory: '${absolutePath}'.`,
      );
    }

    const discovered = await this._discoverSinglePlugin(absolutePath);
    return {
      ...discovered,
      sourceType: 'path',
      source: absolutePath,
      cleanupPath: null,
    };
  }

  async addPlugin(source, options = {}) {
    const { fs, path, fsExtra } = this.dependencies;
    const invokeNameRequested = options.name || null;

    const resolved = await this._resolveSource(source);

    try {
      const invokeName = invokeNameRequested || resolved.pluginId;
      if (!isValidPluginName(invokeName)) {
        throw new Error(
          `Invalid plugin name '${invokeName}'. Use alphanumeric and hyphens only.`,
        );
      }
      if (this._isBundledPluginName(invokeName)) {
        throw new Error(
          `Plugin name '${invokeName}' conflicts with a bundled plugin name.`,
        );
      }

      const manifest = await this._readManifest();
      if (manifest.plugins[invokeName]) {
        throw new Error(`Plugin name '${invokeName}' is already installed.`);
      }

      const existingPlugin = Object.values(manifest.plugins).find(
        (entry) => entry.plugin_id === resolved.pluginId,
      );
      if (existingPlugin) {
        throw new Error(
          `Plugin id '${resolved.pluginId}' is already installed as '${existingPlugin.invoke_name || 'unknown'}'.`,
        );
      }

      const targetDir = path.join(this.pluginsRoot, resolved.pluginId);
      if (fs.existsSync(targetDir)) {
        throw new Error(
          `Plugin directory '${targetDir}' already exists. Remove it first.`,
        );
      }

      await fsExtra.copy(resolved.basePath, targetDir);

      const installedConfigPath = path.join(targetDir, PLUGIN_CONFIG_FILENAME);
      if (!fs.existsSync(installedConfigPath)) {
        throw new Error(
          `Installed plugin config missing at '${installedConfigPath}'.`,
        );
      }

      manifest.plugins[invokeName] = {
        invoke_name: invokeName,
        plugin_id: resolved.pluginId,
        config_path: installedConfigPath,
        installed_path: targetDir,
        source: resolved.source,
        type: resolved.sourceType,
        enabled: true,
        added_on: new Date().toISOString(),
      };

      await this._writeManifest(manifest);

      return {
        success: true,
        invoke_name: invokeName,
        plugin_id: resolved.pluginId,
        path: targetDir,
      };
    } finally {
      if (resolved.cleanupPath) {
        await fsExtra.rm(resolved.cleanupPath, {
          recursive: true,
          force: true,
        });
      }
    }
  }

  async removePlugin(invokeName) {
    const { fsExtra } = this.dependencies;
    const manifest = await this._readManifest();
    const entry = manifest.plugins[invokeName];

    if (!entry) {
      throw new Error(`Plugin '${invokeName}' is not installed.`);
    }

    delete manifest.plugins[invokeName];
    await this._writeManifest(manifest);

    const stillReferenced = Object.values(manifest.plugins).some(
      (plugin) => plugin.installed_path === entry.installed_path,
    );

    if (!stillReferenced) {
      await fsExtra.rm(entry.installed_path, { recursive: true, force: true });
    }

    return { success: true, removed: entry };
  }

  async _determineRemoteBranch(repoPath) {
    const remoteDetails = await this._spawnGit(
      ['remote', 'show', 'origin'],
      repoPath,
    );
    const lines = remoteDetails.stdout.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('HEAD branch:')) {
        continue;
      }
      const branch = trimmed.split(':').slice(1).join(':').trim();
      if (branch && branch !== '(unknown)') {
        return branch;
      }
    }

    const branchResult = await this._spawnGit(
      ['rev-parse', '--abbrev-ref', 'HEAD'],
      repoPath,
    );
    const fallbackBranch = branchResult.stdout.trim();
    if (fallbackBranch && fallbackBranch !== 'HEAD') {
      return fallbackBranch;
    }

    throw new Error('Could not determine the repository branch to update.');
  }

  async _updateGitPluginEntry(entry, invokeName) {
    const { fs, path } = this.dependencies;

    if (!entry?.installed_path) {
      return {
        success: false,
        message: `Plugin '${invokeName}' has no installed path in manifest.`,
      };
    }

    const installedPath = entry.installed_path;
    if (!fs.existsSync(installedPath)) {
      return {
        success: false,
        message: `Installed plugin path not found for '${invokeName}': '${installedPath}'.`,
      };
    }

    const gitDir = path.join(installedPath, '.git');
    if (!fs.existsSync(gitDir)) {
      return {
        success: false,
        message: `Plugin '${invokeName}' is marked as git-sourced but has no local Git metadata at '${installedPath}'.`,
      };
    }

    try {
      await this._spawnGit(['fetch', 'origin'], installedPath);
      const defaultBranch = await this._determineRemoteBranch(installedPath);

      const statusResult = await this._spawnGit(
        ['status', '--porcelain'],
        installedPath,
      );
      const hasUncommittedChanges = statusResult.stdout.trim() !== '';

      let localCommitsAhead = 0;
      if (!hasUncommittedChanges) {
        const revListResult = await this._spawnGit(
          ['rev-list', '--count', `origin/${defaultBranch}..HEAD`],
          installedPath,
        );
        const parsed = Number.parseInt(revListResult.stdout.trim(), 10);
        localCommitsAhead = Number.isNaN(parsed) ? 0 : parsed;
      }

      if (hasUncommittedChanges || localCommitsAhead > 0) {
        if (hasUncommittedChanges && localCommitsAhead > 0) {
          return {
            success: false,
            message: `Plugin '${invokeName}' has uncommitted changes and local commits not on the remote. Aborting update.`,
          };
        }
        if (hasUncommittedChanges) {
          return {
            success: false,
            message: `Plugin '${invokeName}' has local changes. Aborting update.`,
          };
        }
        return {
          success: false,
          message: `Plugin '${invokeName}' has local commits not present on the remote. Aborting update.`,
        };
      }

      const localHeadResult = await this._spawnGit(
        ['rev-parse', 'HEAD'],
        installedPath,
      );
      const remoteHeadResult = await this._spawnGit(
        ['rev-parse', `origin/${defaultBranch}`],
        installedPath,
      );
      const localHead = localHeadResult.stdout.trim();
      const remoteHead = remoteHeadResult.stdout.trim();

      if (localHead && remoteHead && localHead === remoteHead) {
        return {
          success: true,
          changed: false,
          message: `Plugin '${invokeName}' is already up to date on origin/${defaultBranch}.`,
        };
      }

      await this._spawnGit(
        ['reset', '--hard', `origin/${defaultBranch}`],
        installedPath,
      );

      return {
        success: true,
        changed: true,
        message: `Plugin '${invokeName}' updated from origin/${defaultBranch}.`,
      };
    } catch (error) {
      return {
        success: false,
        changed: false,
        message: `Git update failed for '${invokeName}': ${error.message}`,
      };
    }
  }

  async updatePlugin(invokeName) {
    const manifest = await this._readManifest();
    const entry = manifest.plugins[invokeName];

    if (!entry) {
      throw new Error(`Plugin '${invokeName}' is not installed.`);
    }

    if (entry.type !== 'git') {
      return {
        success: false,
        message: `Plugin '${invokeName}' is not git-sourced and cannot be updated automatically.`,
      };
    }

    const result = await this._updateGitPluginEntry(entry, invokeName);
    if (result.success && result.changed) {
      entry.updated_on = new Date().toISOString();
      await this._writeManifest(manifest);
    }
    return result;
  }

  async updateAllPlugins() {
    const manifest = await this._readManifest();
    const entries = Object.entries(manifest.plugins || {});
    const messages = [];

    if (entries.length === 0) {
      return {
        success: true,
        messages: ['No installed plugins found.'],
        updatedCount: 0,
        failedCount: 0,
        skippedCount: 0,
      };
    }

    let success = true;
    let updatedCount = 0;
    let unchangedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    let shouldWriteManifest = false;

    for (const [invokeName, entry] of entries) {
      if (entry.type !== 'git') {
        skippedCount += 1;
        messages.push(`Skipping '${invokeName}': not git-sourced.`);
        continue;
      }

      const result = await this._updateGitPluginEntry(entry, invokeName);
      messages.push(result.message);

      if (result.success) {
        if (result.changed) {
          updatedCount += 1;
          entry.updated_on = new Date().toISOString();
          shouldWriteManifest = true;
        } else {
          unchangedCount += 1;
        }
      } else {
        failedCount += 1;
        success = false;
      }
    }

    if (updatedCount === 0 && unchangedCount === 0 && failedCount === 0) {
      messages.unshift('No git-sourced plugins installed.');
    }

    if (shouldWriteManifest) {
      await this._writeManifest(manifest);
    }

    return {
      success,
      messages,
      updatedCount,
      unchangedCount,
      failedCount,
      skippedCount,
    };
  }

  async setEnabled(invokeName, enabled) {
    const manifest = await this._readManifest();
    const entry = manifest.plugins[invokeName];

    if (!entry) {
      throw new Error(`Plugin '${invokeName}' is not installed.`);
    }

    entry.enabled = Boolean(enabled);
    await this._writeManifest(manifest);
    return { success: true, plugin: entry };
  }

  async listInstalledPlugins() {
    const manifest = await this._readManifest();
    return Object.values(manifest.plugins).sort((a, b) =>
      (a.invoke_name || '').localeCompare(b.invoke_name || ''),
    );
  }

  async getInstalledPlugin(invokeName) {
    const manifest = await this._readManifest();
    return manifest.plugins[invokeName] || null;
  }

  async listAvailablePlugins(_unusedFilter = null) {
    return [];
  }
}

module.exports = PluginInstaller;
