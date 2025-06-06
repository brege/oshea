// src/collections-manager/commands/update.js
// No longer requires fs, path, chalk, or fs-extra

module.exports = async function updateCollection(dependencies, collectionName) {
  // Destructure dependencies
  const { fss, fs, path, chalk, fsExtra, constants } = dependencies;
  const { METADATA_FILENAME } = constants;

  // 'this' will be the CollectionsManager instance
  if (this.debug) console.log(chalk.magenta(`DEBUG (CM:updateCollection): Updating collection: ${collectionName}`));
  const collectionPath = path.join(this.collRoot, collectionName);

  if (!fss.existsSync(collectionPath)) {
    console.error(chalk.red(`ERROR: Collection "${collectionName}" not found at ${collectionPath}. Cannot update.`));
    return { success: false, message: `Collection "${collectionName}" not found.` };
  }

  const metadata = await this._readCollectionMetadata(collectionName);
  if (!metadata) {
    console.warn(chalk.yellow(`WARN: Metadata file not found or unreadable for collection "${collectionName}". Cannot determine source for update.`));
    return { success: false, message: `Metadata not found or unreadable for "${collectionName}".` };
  }

  const originalSourcePath = metadata.source;

  if (!originalSourcePath) {
    console.warn(chalk.yellow(`WARN: Source path not defined in metadata for collection "${collectionName}". Cannot update.`));
    return { success: false, message: `Source path not defined in metadata for "${collectionName}".` };
  }

  // Check if it's a Git source
  if (/^(http(s)?:\/\/|git@)/.test(originalSourcePath) || (typeof originalSourcePath === 'string' && originalSourcePath.endsWith('.git'))) {
    console.log(chalk.blue(`Updating collection "${collectionName}" from Git source: ${chalk.underline(originalSourcePath)}...`));

    let defaultBranchName = null;
    try {
      const remoteDetailsResult = await this._spawnGitProcess(
          ['remote', 'show', 'origin'],
          collectionPath,
          `getting remote details for ${collectionName}`
      );

      if (!remoteDetailsResult || !remoteDetailsResult.success || !remoteDetailsResult.stdout) {
          console.error(chalk.red(`  ERROR: Could not retrieve remote details for ${collectionName}. Update aborted.`));
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
          console.error(chalk.red(`  ERROR: Could not determine default branch for ${collectionName} from remote details. Update aborted.`));
          if (this.debug) {
              console.log(chalk.magenta(`DEBUG (CM:updateCollection): Full output from 'git remote show origin' for ${collectionName}:\n${remoteStdout}`));
          }
          return { success: false, message: `Could not determine default branch for ${collectionName}.` };
      }
      if (this.debug) console.log(chalk.magenta(`  DEBUG: Default branch for ${collectionName} is '${defaultBranchName}'.`));

    } catch (gitError) {
      console.error(chalk.red(`  ERROR: Failed during Git remote show for ${collectionName}. Update aborted.`));
      return { success: false, message: `Failed during Git remote show for ${collectionName}: ${gitError.message}` };
    }

    try {
      if (this.debug) console.log(chalk.magenta(`  DEBUG: Fetching remote 'origin' for ${collectionName}...`));
      await this._spawnGitProcess(['fetch', 'origin'], collectionPath, `fetching ${collectionName}`);
      if (this.debug) console.log(chalk.magenta(`  DEBUG: Successfully fetched remote 'origin' for ${collectionName}.`));

      const statusResult = await this._spawnGitProcess(['status', '--porcelain'], collectionPath, `checking status of ${collectionName}`);
      if (!statusResult.success) {
          console.error(chalk.red(`  ERROR: Could not get Git status for ${collectionName}. Update aborted.`));
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
            console.warn(chalk.yellow(`  WARN: Could not execute git rev-list to check for local commits on ${collectionName}: ${revListError.message}`));
        }
      }

      if (hasUncommittedChanges || localCommitsAhead > 0) {
          let abortMessage = `Collection "${collectionName}" has local changes.`;
          if (hasUncommittedChanges && localCommitsAhead > 0) {
              abortMessage = `Collection "${collectionName}" has uncommitted changes and local commits not on the remote.`;
          } else if (localCommitsAhead > 0) {
              abortMessage = `Collection "${collectionName}" has local commits not present on the remote.`;
          }

          console.warn(chalk.yellow(`  WARN: ${abortMessage} Aborting update.`));
          console.warn(chalk.yellow("          Please commit, stash, or revert your changes before updating."));
          if (this.debug) {
            if (hasUncommittedChanges) console.log(chalk.magenta(`DEBUG (CM:updateCollection): 'git status --porcelain' output for ${collectionName}:\n${statusResult.stdout}`));
            if (localCommitsAhead > 0) console.log(chalk.magenta(`DEBUG (CM:updateCollection): Found ${localCommitsAhead} local commits ahead of origin/${defaultBranchName} for ${collectionName}.`));
          }
          return {
              success: false,
              message: `${abortMessage} Aborting update. Commit, stash, or revert changes.`
          };
      }

      if (this.debug) console.log(chalk.magenta(`  DEBUG: Resetting to 'origin/${defaultBranchName}' for ${collectionName}...`));
      await this._spawnGitProcess(['reset', '--hard', `origin/${defaultBranchName}`], collectionPath, `resetting ${collectionName}`);
      console.log(chalk.green(`\n  Successfully updated collection "${collectionName}" by resetting to origin/${defaultBranchName}.`));

      metadata.updated_on = new Date().toISOString();
      await this._writeCollectionMetadata(collectionName, metadata);
      return { success: true, message: `Collection "${collectionName}" updated.` };
    } catch (error) {
      console.error(chalk.red(`  ERROR: Git update process failed for ${collectionName}: ${error.message}`));
      return { success: false, message: `Git update failed for ${collectionName}: ${error.message}` };
    }
  } else { // Handle local path source
    console.log(chalk.blue(`Attempting to re-sync collection "${collectionName}" from local source: ${chalk.underline(originalSourcePath)}...`));
    if (!fss.existsSync(originalSourcePath)) {
      console.error(chalk.red(`  ERROR: Original local source path "${originalSourcePath}" for collection "${collectionName}" no longer exists. Cannot update.`));
      return { success: false, message: `Original local source path "${originalSourcePath}" not found.` };
    }
    if (!fss.lstatSync(originalSourcePath).isDirectory()) {
      console.error(chalk.red(`  ERROR: Original local source path "${originalSourcePath}" for collection "${collectionName}" is not a directory. Cannot update.`));
      return { success: false, message: `Original local source path "${originalSourcePath}" is not a directory.` };
    }

    try {
      const entries = await fs.readdir(collectionPath);
      for (const entry of entries) {
        if (entry !== METADATA_FILENAME) {
          await fsExtra.remove(path.join(collectionPath, entry));
        }
      }
      if (this.debug) console.log(chalk.magenta(`  DEBUG: Cleaned existing content (except metadata) in ${collectionPath}.`));

      await fsExtra.copy(originalSourcePath, collectionPath, {
        overwrite: true,
        errorOnExist: false,
        filter: (src) => {
          if (path.basename(src) === '.git') {
            if(this.debug) console.log(chalk.magenta(`  DEBUG: Skipping .git directory during copy from local source ${originalSourcePath}`));
            return false;
          }
          return true;
        }
      });
      console.log(chalk.green(`  Successfully re-synced collection "${collectionName}" from local source "${originalSourcePath}".`));
      
      metadata.updated_on = new Date().toISOString();
      await this._writeCollectionMetadata(collectionName, metadata);
      return { success: true, message: `Collection "${collectionName}" re-synced from local source.` };
    } catch (error) {
      console.error(chalk.red(`  ERROR: Failed to re-sync collection "${collectionName}" from local source "${originalSourcePath}": ${error.message}`));
      if (this.debug && error.stack) console.error(chalk.red(error.stack));
      return { success: false, message: `Failed to re-sync from local source: ${error.message}` };
    }
  }
};
