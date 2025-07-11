// src/collections/commands/update.js

module.exports = async function updateCollection(dependencies, collectionName) {
  const { fss, fs, path, fsExtra, constants, logger } = dependencies;
  const { METADATA_FILENAME } = constants;

  const collectionPath = path.join(this.collRoot, collectionName);

  if (!fss.existsSync(collectionPath)) {
    logger.error(`Collection "${collectionName}" not found at ${collectionPath}. Cannot update.`, { module: 'src/collections/commands/update.js' });
    return { success: false, message: `Collection "${collectionName}" not found.` };
  }

  const metadata = await this._readCollectionMetadata(collectionName);
  if (!metadata) {
    logger.warn(`Metadata file not found or unreadable for collection "${collectionName}". Cannot determine source for update.`, { module: 'src/collections/commands/update.js' });
    return { success: false, message: `Metadata not found or unreadable for "${collectionName}".` };
  }

  const originalSourcePath = metadata.source;

  if (!originalSourcePath) {
    logger.warn(`Source path not defined in metadata for collection "${collectionName}". Cannot update.`, { module: 'src/collections/commands/update.js' });
    return { success: false, message: `Source path not defined in metadata for "${collectionName}".` };
  }

  // Check if it's a Git source
  if (/^(http(s)?:\/\/|git@)/.test(originalSourcePath) || (typeof originalSourcePath === 'string' && originalSourcePath.endsWith('.git'))) {
    logger.info(`Updating collection "${collectionName}" from Git source: ${originalSourcePath}...`, { module: 'src/collections/commands/update.js' });

    let defaultBranchName = null;
    try {
      const remoteDetailsResult = await this._spawnGitProcess(
        ['remote', 'show', 'origin'],
        collectionPath,
        `getting remote details for ${collectionName}`
      );

      if (!remoteDetailsResult || !remoteDetailsResult.success || !remoteDetailsResult.stdout) {
        logger.error(`Could not retrieve remote details for ${collectionName}. Update aborted.`, { module: 'src/collections/commands/update.js' });
        return { success: false, message: `Failed to retrieve remote details for ${collectionName}.` };
      }

      const remoteStdout = remoteDetailsResult.stdout;
      const lines = remoteStdout.split('\n');
      for (const line of lines) {
        if (line.trim().startsWith('HEAD branch:')) {
          defaultBranchName = line.split(':')[1].trim();
          break;
        }
      }

      if (!defaultBranchName) {
        logger.error(`Could not determine default branch for ${collectionName} from remote details. Update aborted.`, { module: 'src/collections/commands/update.js' });
        return { success: false, message: `Could not determine default branch for ${collectionName}.` };
      }

    } catch (gitError) {
      logger.error(`Failed during Git remote show for ${collectionName}. Update aborted.`, { module: 'src/collections/commands/update.js' });
      return { success: false, message: `Failed during Git remote show for ${collectionName}: ${gitError.message}` };
    }

    try {
      await this._spawnGitProcess(['fetch', 'origin'], collectionPath, `fetching ${collectionName}`);
      const statusResult = await this._spawnGitProcess(['status', '--porcelain'], collectionPath, `checking status of ${collectionName}`);
      if (!statusResult.success) {
        logger.error(`Could not get Git status for ${collectionName}. Update aborted.`, { module: 'src/collections/commands/update.js' });
        return { success: false, message: `Could not get Git status for ${collectionName}.` };
      }

      const statusOutput = statusResult.stdout.trim();
      const hasUncommittedChanges = (statusOutput !== '' && statusOutput !== `?? ${METADATA_FILENAME}`);

      let localCommitsAhead = 0;
      if (!hasUncommittedChanges) {
        try {
          const revListResult = await this._spawnGitProcess(
            ['rev-list', '--count', `origin/${defaultBranchName}..HEAD`],
            collectionPath,
            `checking for local commits on ${collectionName}`
          );
          if (revListResult.success && revListResult.stdout) {
            localCommitsAhead = parseInt(revListResult.stdout.trim(), 10);
            if (isNaN(localCommitsAhead)) localCommitsAhead = 0;
          }
        } catch (revListError) {
          logger.warn(`Could not execute git rev-list to check for local commits on ${collectionName}: ${revListError.message}`, { module: 'src/collections/commands/update.js' });
        }
      }

      if (hasUncommittedChanges || localCommitsAhead > 0) {
        let abortMessage = `Collection "${collectionName}" has local changes.`;
        if (hasUncommittedChanges && localCommitsAhead > 0) {
          abortMessage = `Collection "${collectionName}" has uncommitted changes and local commits not on the remote.`;
        } else if (localCommitsAhead > 0) {
          abortMessage = `Collection "${collectionName}" has local commits not present on the remote.`;
        }

        logger.warn(`${abortMessage} Aborting update.`, { module: 'src/collections/commands/update.js' });
        logger.warn('Please commit, stash, or revert your changes before updating.', { module: 'src/collections/commands/update.js' });
        return {
          success: false,
          message: `${abortMessage} Aborting update. Commit, stash, or revert changes.`
        };
      }

      await this._spawnGitProcess(['reset', '--hard', `origin/${defaultBranchName}`], collectionPath, `resetting ${collectionName}`);
      logger.success(`Successfully updated collection "${collectionName}" by resetting to origin/${defaultBranchName}.`, { module: 'src/collections/commands/update.js' });

      metadata.updated_on = new Date().toISOString();
      await this._writeCollectionMetadata(collectionName, metadata);
      return { success: true, message: `Collection "${collectionName}" updated.` };
    } catch (error) {
      logger.error(`Git update process failed for ${collectionName}: ${error.message}`, { module: 'src/collections/commands/update.js' });
      return { success: false, message: `Git update failed for ${collectionName}: ${error.message}` };
    }
  } else { // Handle local path source
    logger.info(`Attempting to re-sync collection "${collectionName}" from local source: ${originalSourcePath}...`, { module: 'src/collections/commands/update.js' });
    if (!fss.existsSync(originalSourcePath)) {
      logger.error(`Original local source path "${originalSourcePath}" for collection "${collectionName}" no longer exists. Cannot update.`, { module: 'src/collections/commands/update.js' });
      return { success: false, message: `Original local source path "${originalSourcePath}" not found.` };
    }
    if (!fss.lstatSync(originalSourcePath).isDirectory()) {
      logger.error(`Original local source path "${originalSourcePath}" for collection "${collectionName}" is not a directory. Cannot update.`, { module: 'src/collections/commands/update.js' });
      return { success: false, message: `Original local source path "${originalSourcePath}" is not a directory.` };
    }

    try {
      const entries = await fs.readdir(collectionPath);
      for (const entry of entries) {
        if (entry !== METADATA_FILENAME) {
          await fsExtra.remove(path.join(collectionPath, entry));
        }
      }

      await fsExtra.copy(originalSourcePath, collectionPath, {
        overwrite: true,
        errorOnExist: false,
        filter: (src) => {
          if (path.basename(src) === '.git') {
            return false;
          }
          return true;
        }
      });
      logger.success(`Successfully re-synced collection "${collectionName}" from local source "${originalSourcePath}".`, { module: 'src/collections/commands/update.js' });

      metadata.updated_on = new Date().toISOString();
      await this._writeCollectionMetadata(collectionName, metadata);
      return { success: true, message: `Collection "${collectionName}" re-synced from local source.` };
    } catch (error) {
      logger.error(`Failed to re-sync collection "${collectionName}" from local source "${originalSourcePath}": ${error.message}`, { module: 'src/collections/commands/update.js' });
      return { success: false, message: `Failed to re-sync from local source: ${error.message}` };
    }
  }
};
