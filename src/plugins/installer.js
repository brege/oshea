// src/plugins/installer.js
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const fsPromises = require('node:fs').promises;
const fsExtra = require('fs-extra');
const yaml = require('js-yaml');
const { spawn } = require('node:child_process');
const { cmUtilsPath, loggerPath } = require('@paths');

const { isValidPluginName } = require(cmUtilsPath);
const logger = require(loggerPath);

const MANIFEST_FILENAME = 'plugins.yaml';

function isGitSource(source) {
  return (
    /^(https?:\/\/|git@)/.test(source) ||
    (typeof source === 'string' && source.endsWith('.git'))
  );
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
    this.collRoot = this.pluginsRoot;
    this.manifestPath = this.dependencies.path.join(
      this.pluginsRoot,
      MANIFEST_FILENAME,
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

  async _discoverSinglePlugin(dir) {
    const { fsPromises, path } = this.dependencies;
    const entries = await fsPromises.readdir(dir, { withFileTypes: true });
    const configFiles = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.config.yaml'))
      .map((entry) => entry.name);

    if (configFiles.length !== 1) {
      throw new Error(
        `Expected exactly one '*.config.yaml' file at '${dir}', found ${configFiles.length}.`,
      );
    }

    const configFile = configFiles[0];
    const pluginId = configFile.replace(/\.config\.yaml$/, '');

    if (!isValidPluginName(pluginId)) {
      throw new Error(
        `Plugin id '${pluginId}' is invalid. Use alphanumeric and hyphens only.`,
      );
    }

    return {
      pluginId,
      basePath: dir,
      configPath: path.join(dir, configFile),
    };
  }

  async _resolveSource(source) {
    const { fs, path, fsPromises, os } = this.dependencies;

    if (isGitSource(source)) {
      const tempRoot = await fsPromises.mkdtemp(
        path.join(os.tmpdir(), 'oshea-plugin-'),
      );
      const cloneDir = path.join(tempRoot, 'repo');
      await this._spawnGit(['clone', '--depth', '1', source, cloneDir]);
      const discovered = await this._discoverSinglePlugin(cloneDir);
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

      const installedConfigPath = path.join(
        targetDir,
        `${resolved.pluginId}.config.yaml`,
      );
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
