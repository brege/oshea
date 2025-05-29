// dev/src/collections-manager/commands/update.js
const fs = require('fs').promises;
const fss = require('fs');
const path = require('path');
const chalk = require('chalk');
const { METADATA_FILENAME } = require('../constants');

module.exports = async function updateCollection(collectionName) {
  // 'this' will be the CollectionsManager instance
  if (this.debug) console.log(chalk.magenta(`DEBUG (CM:updateCollection): Updating collection: ${collectionName}`));
  const collectionPath = path.join(this.collRoot, collectionName);

  if (!fss.existsSync(collectionPath)) {
    console.error(chalk.red(`ERROR: Collection "${collectionName}" not found at ${collectionPath}. Cannot update.`));
    return { success: false, message: `Collection "${collectionName}" not found.` };
  }

  const metadata = await this._readCollectionMetadata(collectionName); // Private method
  if (!metadata) {
    console.warn(chalk.yellow(`WARN: Metadata file not found or unreadable for collection "${collectionName}". Cannot determine source for update.`));
    return { success: false, message: `Metadata not found or unreadable for "${collectionName}".` };
  }

  if (!metadata.source || !(/^(http(s)?:\/\/|git@)/.test(metadata.source) || (typeof metadata.source === 'string' && metadata.source.endsWith('.git')))) {
    console.log(chalk.yellow(`Collection "${collectionName}" (source: ${metadata.source}) was not added from a recognized Git source. Automatic update not applicable.`));
    return { success: true, message: `Collection "${collectionName}" not from a recognized Git source.` };
  }

  console.log(chalk.blue(`Updating collection "${collectionName}" from Git source: ${chalk.underline(metadata.source)}...`));

  let defaultBranchName = null;
  try {
      const remoteDetailsResult = await this._spawnGitProcess( // Private method
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
      console.log(chalk.blue(`  Default branch for ${collectionName} is '${defaultBranchName}'.`));

  } catch (gitError) {
      console.error(chalk.red(`  ERROR: Failed during Git remote show for ${collectionName}. Update aborted.`));
      return { success: false, message: `Failed during Git remote show for ${collectionName}: ${gitError.message}` };
  }

  try {
    console.log(chalk.blue(`  Fetching remote 'origin' for ${collectionName}...`));
    await this._spawnGitProcess(['fetch', 'origin'], collectionPath, `fetching ${collectionName}`); // Private method
    console.log(chalk.green(`  Successfully fetched remote 'origin' for ${collectionName}.`));

    const statusResult = await this._spawnGitProcess(['status', '--porcelain'], collectionPath, `checking status of ${collectionName}`); // Private method
    if (!statusResult.success) {
        console.error(chalk.red(`  ERROR: Could not get Git status for ${collectionName}. Update aborted.`));
        return { success: false, message: `Could not get Git status for ${collectionName}.` };
    }

    const statusOutput = statusResult.stdout.trim();
    const hasUncommittedChanges = (statusOutput !== '' && statusOutput !== `?? ${METADATA_FILENAME}`);

    let localCommitsAhead = 0;
    if (!hasUncommittedChanges) {
      try {
          const revListResult = await this._spawnGitProcess( // Private method
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

    console.log(chalk.blue(`  Resetting to 'origin/${defaultBranchName}' for ${collectionName}...`));
    await this._spawnGitProcess(['reset', '--hard', `origin/${defaultBranchName}`], collectionPath, `resetting ${collectionName}`); // Private method
    console.log(chalk.green(`\n  Successfully updated collection "${collectionName}" by resetting to origin/${defaultBranchName}.`));

    metadata.updated_on = new Date().toISOString();
    await this._writeCollectionMetadata(collectionName, metadata); // Private method
    return { success: true, message: `Collection "${collectionName}" updated.` };
  } catch (error) {
    console.error(chalk.red(`  ERROR: Update process failed for ${collectionName}: ${error.message}`));
    return { success: false, message: `Update failed for ${collectionName}: ${error.message}` };
  }
};
