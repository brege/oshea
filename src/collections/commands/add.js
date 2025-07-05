// src/collections/commands/add.js
// No longer needs its own require() statements for fs, path, etc.

module.exports = async function addCollection(dependencies, source, options = {}) {
  const { fs, fss, path, fsExtra, chalk, cmUtils } = dependencies;

  // 'this' is still the CollectionsManager instance
  console.log(chalk.blue(`CollectionsManager: Adding collection from source: ${chalk.underline(source)}`));
  if (options.name) {
    console.log(chalk.blue(`  Requested local name: ${chalk.yellow(options.name)}`));
  }

  try {
    await fs.mkdir(this.collRoot, { recursive: true });
  } catch (error) {
    console.error(chalk.red(`ERROR: Failed to create COLL_ROOT directory at ${this.collRoot}: ${error.message}`));
    throw error;
  }

  const collectionName = options.name || cmUtils.deriveCollectionName(source);
  if (!collectionName) {
      throw new Error('Could not determine a valid collection name.');
  }
  const targetPath = path.join(this.collRoot, collectionName);

  console.log(chalk.blue(`  Target collection name: ${chalk.yellow(collectionName)}`));
  console.log(chalk.blue(`  Target path: ${chalk.underline(targetPath)}`));

  if (fss.existsSync(targetPath)) {
    throw new Error(`Error: Target directory '${targetPath}' already exists. Please remove it or choose a different name.`);
  }

  const originalSource = source;
  const createInitialMetadata = () => ({
    source: originalSource,
    name: collectionName,
    added_on: new Date().toISOString(),
  });

  if (/^(http(s)?:\/\/|git@)/.test(source) || (typeof source === 'string' && source.endsWith('.git') && fss.existsSync(path.resolve(source)))) {
    const sourceToClone = /^(http(s)?:\/\/|git@)/.test(source) ? source : path.resolve(source);
    console.log(chalk.blue(`  Source is a Git repository. Attempting to clone with git from '${sourceToClone}'...`));
    try {
      await this._spawnGitProcess(['clone', sourceToClone, targetPath], this.collRoot, `cloning ${collectionName}`);
      console.log(chalk.green(`\n  Successfully cloned '${sourceToClone}' to '${targetPath}'.`));
      await this._writeCollectionMetadata(collectionName, createInitialMetadata());
      return targetPath;
    } catch (error) {
      throw error;
    }
  } else {
    const absoluteSourcePath = path.resolve(source);
    console.log(chalk.blue(`  Source is a non-Git local path: ${chalk.underline(absoluteSourcePath)}. Attempting to copy...`));
    if (!fss.existsSync(absoluteSourcePath)) {
      const errMsg = `Local source path does not exist: ${absoluteSourcePath}`;
      console.error(chalk.red(`  ERROR: ${errMsg}`));
      throw new Error(errMsg);
    }
    try {
      await fsExtra.copy(absoluteSourcePath, targetPath);
      console.log(chalk.green(`  Successfully copied local source '${absoluteSourcePath}' to '${targetPath}'.`));
      await this._writeCollectionMetadata(collectionName, createInitialMetadata());
      return targetPath;
    } catch (error) {
      console.error(chalk.red(`  ERROR: Failed to copy local source '${absoluteSourcePath}' to '${targetPath}': ${error.message}`));
      throw error;
    }
  }
};
