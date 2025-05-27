// src/collections_manager/index.js
const fs = require('fs').promises;
const fss = require('fs'); // For synchronous checks like existsSync
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const fsExtra = require('fs-extra');
const chalk = require('chalk'); // Added chalk

class CollectionsManager {
  constructor(options = {}) {
    this.collRoot = options.collRoot || this.determineCollRoot();
    this.debug = options.debug || false;
    if (this.debug) {
      console.log(chalk.magenta(`DEBUG (CollectionsManager): Initialized. COLL_ROOT: ${this.collRoot}`));
    }
  }

  determineCollRoot() {
    const xdgDataHome = process.env.XDG_DATA_HOME ||
      (os.platform() === 'win32'
        ? path.join(os.homedir(), 'AppData', 'Local')
        : path.join(os.homedir(), '.local', 'share'));
    return path.join(xdgDataHome, 'md-to-pdf', 'collections');
  }

  _deriveCollectionName(source) {
    const baseName = path.basename(source);
    return baseName.replace(/\.git$/, '').replace(/[^a-zA-Z0-9_-]/g, '-');
  }

  async addCollection(source, options = {}) {
    console.log(chalk.blue(`CollectionsManager: Adding collection from source: ${chalk.underline(source)}`));
    if (options.name) {
      console.log(chalk.blue(`  Requested local name: ${chalk.yellow(options.name)}`));
    }

    try {
      await fs.mkdir(this.collRoot, { recursive: true });
      if (this.debug) {
        console.log(chalk.magenta(`  DEBUG: Ensured COLL_ROOT exists at: ${this.collRoot}`));
      }
    } catch (error) {
      console.error(chalk.red(`ERROR: Failed to create COLL_ROOT directory at ${this.collRoot}: ${error.message}`));
      throw error;
    }

    const collectionName = options.name || this._deriveCollectionName(source);
    if (!collectionName) {
        throw new Error('Could not determine a valid collection name.');
    }
    const targetPath = path.join(this.collRoot, collectionName);

    console.log(chalk.blue(`  Target collection name: ${chalk.yellow(collectionName)}`));
    console.log(chalk.blue(`  Target path: ${chalk.underline(targetPath)}`));

    if (fss.existsSync(targetPath)) {
      throw new Error(`Error: Target directory '${targetPath}' already exists. Please remove it or choose a different name.`);
    }

    return new Promise(async (resolve, reject) => {
      if (/^(http(s)?:\/\/|git@)/.test(source)) {
        console.log(chalk.blue(`  Source is a URL. Attempting to clone with git...`));
        const gitProcess = spawn('git', ['clone', source, targetPath], { stdio: 'pipe' });

        gitProcess.stdout.on('data', (data) => {
          process.stdout.write(chalk.gray(`  GIT: ${data}`));
        });
        gitProcess.stderr.on('data', (data) => {
          process.stderr.write(chalk.yellowBright(`  GIT (stderr): ${data}`));
        });

        gitProcess.on('close', (code) => {
          if (code === 0) {
            console.log(chalk.green(`\n  Successfully cloned '${source}' to '${targetPath}'.`));
            resolve(targetPath);
          } else {
            console.error(chalk.red(`\n  ERROR: Git clone failed with exit code ${code} for source '${source}'.`));
            reject(new Error(`Git clone failed with exit code ${code}.`));
          }
        });
        gitProcess.on('error', (err) => {
          console.error(chalk.red(`\n  ERROR: Failed to start git process for cloning '${source}': ${err.message}`));
          reject(err);
        });
      } else {
        const absoluteSourcePath = path.resolve(source);
        console.log(chalk.blue(`  Source is a local path: ${chalk.underline(absoluteSourcePath)}. Attempting to copy...`));
        if (!fss.existsSync(absoluteSourcePath)) {
          console.error(chalk.red(`  ERROR: Local source path does not exist: ${absoluteSourcePath}`));
          return reject(new Error(`Local source path does not exist: ${absoluteSourcePath}`));
        }
        try {
          await fsExtra.copy(absoluteSourcePath, targetPath);
          console.log(chalk.green(`  Successfully copied local source '${absoluteSourcePath}' to '${targetPath}'.`));
          resolve(targetPath);
        } catch (error) {
          console.error(chalk.red(`  ERROR: Failed to copy local source '${absoluteSourcePath}' to '${targetPath}': ${error.message}`));
          reject(error);
        }
      }
    });
  }

  async listCollections(type = 'downloaded', collectionNameFilter = null) {
    console.log(chalk.blue(`CollectionsManager: Listing collections (type: ${chalk.yellow(type)}, filter: ${chalk.yellow(collectionNameFilter || 'all')})`));
    if (type === 'downloaded') {
      try {
        if (!fss.existsSync(this.collRoot)) {
          console.log(chalk.yellow("  Collections root directory does not exist. No collections downloaded."));
          return [];
        }
        const entries = await fs.readdir(this.collRoot, { withFileTypes: true });
        const collections = entries
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name);

        if (collections.length === 0) {
          console.log(chalk.yellow("  No collections found in COLL_ROOT."));
        } else {
          console.log(chalk.blue("  Downloaded plugin collections:"));
          collections.forEach(name => console.log(chalk.greenBright(`    - ${name}`)));
        }
        return collections;
      } catch (error) {
        console.error(chalk.red(`  ERROR listing downloaded collections: ${error.message}`));
        throw error;
      }
    } else {
      console.log(chalk.yellow(`  Listing for type '${type}' is not yet implemented.`));
      return [];
    }
  }
}

module.exports = CollectionsManager;
