// src/collections/commands/add.js

module.exports = async function addCollection(dependencies, source, options = {}) {
  const { fs, fss, path, fsExtra, cmUtils, logger } = dependencies;

  logger.info(`CollectionsManager: Adding collection from source: ${source}`, { module: 'src/collections/commands/add.js' });
  if (options.name) {
    logger.info(`  Requested local name: ${options.name}`, { module: 'src/collections/commands/add.js' });
  }

  await fs.mkdir(this.collRoot, { recursive: true });

  const collectionName = options.name || cmUtils.deriveCollectionName(source);
  if (!collectionName) {
    throw new Error('Could not determine a valid collection name.');
  }
  const targetPath = path.join(this.collRoot, collectionName);

  logger.info(`  Target collection name: ${collectionName}`, { module: 'src/collections/commands/add.js' });
  logger.info(`  Target path: ${targetPath}`, { module: 'src/collections/commands/add.js' });

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
    logger.info(`  Source is a Git repository. Attempting to clone with git from '${sourceToClone}'...`, { module: 'src/collections/commands/add.js' });
    await this._spawnGitProcess(['clone', sourceToClone, targetPath], this.collRoot, `cloning ${collectionName}`);
    logger.success(`\n  Successfully cloned '${sourceToClone}' to '${targetPath}'.`, { module: 'src/collections/commands/add.js' });
    await this._writeCollectionMetadata(collectionName, createInitialMetadata());
    return targetPath;
  } else {
    const absoluteSourcePath = path.resolve(source);
    logger.info(`  Source is a non-Git local path: ${absoluteSourcePath}. Attempting to copy...`, { module: 'src/collections/commands/add.js' });
    if (!fss.existsSync(absoluteSourcePath)) {
      const errMsg = `Local source path does not exist: ${absoluteSourcePath}`;
      logger.error(`  ERROR: ${errMsg}`, { module: 'src/collections/commands/add.js' });
      throw new Error(errMsg);
    }
    try {
      await fsExtra.copy(absoluteSourcePath, targetPath);
      logger.success(`  Successfully copied local source '${absoluteSourcePath}' to '${targetPath}'.`, { module: 'src/collections/commands/add.js' });
      await this._writeCollectionMetadata(collectionName, createInitialMetadata());
      return targetPath;
    } catch (error) {
      logger.error(`  ERROR: Failed to copy local source '${absoluteSourcePath}' to '${targetPath}': ${error.message}`, { module: 'src/collections/commands/add.js' });
      throw error;
    }
  }
};
