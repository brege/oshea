// src/collections/commands/add.js

module.exports = async function addCollection(dependencies, source, options = {}) {
  const { fs, fss, path, fsExtra, cmUtils, logger } = dependencies;

  logger.info(`Adding collection from source: ${source}`, {
    context: 'AddCollectionCommand'
  });
  if (options.name) {
    logger.debug(`Requested local name: ${options.name}`, {
      context: 'AddCollectionCommand'
    });
  }

  await fs.mkdir(this.collRoot, { recursive: true });
  logger.debug('Ensured collections root directory exists', {
    context: 'AddCollectionCommand',
    root: this.collRoot
  });

  // Ensure collections go into collections/ subdirectory
  const collectionsDir = this.collRoot.endsWith('collections') ? this.collRoot : path.join(this.collRoot, 'collections');
  await fs.mkdir(collectionsDir, { recursive: true });
  logger.debug('Ensured collections subdirectory exists', {
    context: 'AddCollectionCommand',
    collectionsDir: collectionsDir
  });

  const collectionName = options.name || cmUtils.deriveCollectionName(source);
  if (!collectionName) {
    logger.error('Could not determine a valid collection name', {
      context: 'AddCollectionCommand',
      source: source,
      requestedName: options.name,
      error: 'Empty or invalid collection name derived'
    });
    throw new Error('Could not determine a valid collection name.');
  }
  const targetPath = path.join(collectionsDir, collectionName);

  logger.debug(`Target collection name: ${collectionName}`, {
    context: 'AddCollectionCommand'
  });
  logger.debug(`Target path: ${targetPath}`, {
    context: 'AddCollectionCommand'
  });

  if (fss.existsSync(targetPath)) {
    logger.error('Target directory already exists', {
      context: 'AddCollectionCommand',
      targetPath: targetPath,
      collectionName: collectionName,
      error: `Directory '${targetPath}' already exists. Please remove it or choose a different name.`
    });
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
    logger.info(`Source is a Git repository, attempting to clone: ${sourceToClone}`, {
      context: 'AddCollectionCommand'
    });
    await this._spawnGitProcess(['clone', sourceToClone, targetPath], this.collRoot, `cloning ${collectionName}`);
    logger.success(`Successfully cloned repository: ${sourceToClone} -> ${targetPath}`, {
      context: 'AddCollectionCommand'
    });
    await this._writeCollectionMetadata(collectionName, createInitialMetadata());
    return targetPath;
  } else {
    const absoluteSourcePath = path.resolve(source);
    logger.info(`Source is a non-Git local path, attempting to copy: ${absoluteSourcePath}`, {
      context: 'AddCollectionCommand'
    });
    if (!fss.existsSync(absoluteSourcePath)) {
      const errMsg = `Local source path does not exist: ${absoluteSourcePath}`;
      logger.error(`Local source path does not exist: ${absoluteSourcePath}`, {
        context: 'AddCollectionCommand'
      });
      throw new Error(errMsg);
    }
    try {
      await fsExtra.copy(absoluteSourcePath, targetPath);
      logger.success(`Successfully copied local source: ${absoluteSourcePath} -> ${targetPath}`, {
        context: 'AddCollectionCommand'
      });
      await this._writeCollectionMetadata(path.join('collections', collectionName), createInitialMetadata());
      return targetPath;
    } catch (error) {
      logger.error(`Failed to copy local source: ${error.message}`, {
        context: 'AddCollectionCommand',
        source: absoluteSourcePath,
        targetPath: targetPath,
        stack: error.stack
      });
      throw error;
    }
  }
};
