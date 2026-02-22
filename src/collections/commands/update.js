// src/collections/commands/update.js

module.exports = async function updateCollection(dependencies, collectionName) {
  const { fss, fs, path, fsExtra, logger, collectionsMetadataFilename } =
    dependencies;

  logger.debug('Attempting to update collection', {
    context: 'UpdateCollectionCommand',
    collectionName: collectionName,
  });

  // Look for collections in collections/ subdirectory or directly if collRoot ends with 'collections'
  // Handle singleton plugins (user-plugins/plugin-name) differently
  let actualCollectionPath;
  if (collectionName.startsWith('user-plugins/')) {
    // For singleton plugins, they're stored directly at collRoot/user-plugins/plugin-name
    actualCollectionPath = path.join(this.collRoot, collectionName);
  } else {
    actualCollectionPath = this.collRoot.endsWith('collections')
      ? path.join(this.collRoot, collectionName)
      : path.join(this.collRoot, 'collections', collectionName);
  }
  const collectionPath = actualCollectionPath;

  if (!fss.existsSync(collectionPath)) {
    logger.error('Collection not found, cannot update', {
      context: 'UpdateCollectionCommand',
      collectionName: collectionName,
      collectionPath: collectionPath,
      error: `Collection "${collectionName}" not found at ${collectionPath}. Cannot update.`,
    });
    return {
      success: false,
      message: `Collection "${collectionName}" not found.`,
    };
  }
  logger.debug('Collection path verified', {
    context: 'UpdateCollectionCommand',
    collectionPath: collectionPath,
  });

  // Look for collections in collections/ subdirectory or directly if collRoot ends with 'collections'
  // This matches the same logic used in other collection commands like list.js
  // Handle singleton plugins (user-plugins/plugin-name) differently
  let metadataPath;
  if (collectionName.startsWith('user-plugins/')) {
    // For singleton plugins, metadata is in the plugin directory itself
    metadataPath = collectionName;
  } else {
    metadataPath = this.collRoot.endsWith('collections')
      ? collectionName
      : path.join('collections', collectionName);
  }
  const metadata = await this._readCollectionMetadata(metadataPath);
  if (!metadata) {
    logger.warn(
      'Metadata file not found or unreadable for collection, cannot determine source for update',
      {
        context: 'UpdateCollectionCommand',
        collectionName: collectionName,
        suggestion: 'Ensure metadata file exists and is readable.',
      },
    );
    return {
      success: false,
      message: `Metadata not found or unreadable for "${collectionName}".`,
    };
  }

  // Check if this is an archetyped plugin (not updatable)
  if (metadata.isArchetyped) {
    logger.info('Archetyped plugin is not updatable, skipping', {
      context: 'UpdateCollectionCommand',
      collectionName: collectionName,
      sourceType: metadata.source_type,
      createdFrom: metadata.created_from,
    });
    return {
      success: true,
      message: `Archetyped plugin "${collectionName}" is not updatable (created from template).`,
    };
  }

  logger.debug('Collection metadata loaded', {
    context: 'UpdateCollectionCommand',
    collectionName: collectionName,
    source: metadata.source,
  });

  const originalSourcePath = metadata.source;

  if (!originalSourcePath) {
    logger.warn(
      'Source path not defined in metadata for collection, cannot update',
      {
        context: 'UpdateCollectionCommand',
        collectionName: collectionName,
        suggestion: 'Ensure source path is defined in collection metadata.',
      },
    );
    return {
      success: false,
      message: `Source path not defined in metadata for "${collectionName}".`,
    };
  }

  // Check if it's a Git source
  if (
    /^(http(s)?:\/\/|git@)/.test(originalSourcePath) ||
    (typeof originalSourcePath === 'string' &&
      originalSourcePath.endsWith('.git'))
  ) {
    logger.info(`Updating collection from Git source: ${originalSourcePath}`, {
      context: 'UpdateCollectionCommand',
      collectionName: collectionName,
    });

    let defaultBranchName = null;
    try {
      const remoteDetailsResult = await this._spawnGitProcess(
        ['remote', 'show', 'origin'],
        collectionPath,
        `getting remote details for ${collectionName}`,
      );

      if (
        !remoteDetailsResult ||
        !remoteDetailsResult.success ||
        !remoteDetailsResult.stdout
      ) {
        logger.error(
          'Could not retrieve Git remote details for collection, update aborted',
          {
            context: 'UpdateCollectionCommand',
            collectionName: collectionName,
            error:
              remoteDetailsResult?.stderr || 'Unknown Git remote show error',
          },
        );
        return {
          success: false,
          message: `Failed to retrieve remote details for ${collectionName}.`,
        };
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
        logger.error(
          'Could not determine default branch for collection from remote details, update aborted',
          {
            context: 'UpdateCollectionCommand',
            collectionName: collectionName,
            error: 'HEAD branch not found in remote details.',
          },
        );
        return {
          success: false,
          message: `Could not determine default branch for ${collectionName}.`,
        };
      }
      logger.debug('Determined default Git branch', {
        context: 'UpdateCollectionCommand',
        collectionName: collectionName,
        branch: defaultBranchName,
      });
    } catch (gitError) {
      logger.error(
        'Failed during Git remote show for collection, update aborted',
        {
          context: 'UpdateCollectionCommand',
          collectionName: collectionName,
          error: gitError.message,
          stack: gitError.stack,
        },
      );
      return {
        success: false,
        message: `Failed during Git remote show for ${collectionName}: ${gitError.message}`,
      };
    }

    try {
      await this._spawnGitProcess(
        ['fetch', 'origin'],
        collectionPath,
        `fetching ${collectionName}`,
      );
      logger.debug('Git fetch origin completed', {
        context: 'UpdateCollectionCommand',
        collectionName: collectionName,
      });

      const statusResult = await this._spawnGitProcess(
        ['status', '--porcelain'],
        collectionPath,
        `checking status of ${collectionName}`,
      );
      if (!statusResult.success) {
        logger.error(
          'Could not get Git status for collection, update aborted',
          {
            context: 'UpdateCollectionCommand',
            collectionName: collectionName,
            error: statusResult.stderr || 'Unknown git status error',
          },
        );
        return {
          success: false,
          message: `Could not get Git status for ${collectionName}.`,
        };
      }
      logger.debug('Git status checked', {
        context: 'UpdateCollectionCommand',
        collectionName: collectionName,
        status: statusResult.stdout.trim(),
      });

      const statusOutput = statusResult.stdout.trim();
      const hasUncommittedChanges =
        statusOutput !== '' &&
        statusOutput !== `?? ${collectionsMetadataFilename}`;

      let localCommitsAhead = 0;
      if (!hasUncommittedChanges) {
        try {
          const revListResult = await this._spawnGitProcess(
            ['rev-list', '--count', `origin/${defaultBranchName}..HEAD`],
            collectionPath,
            `checking for local commits on ${collectionName}`,
          );
          if (revListResult.success && revListResult.stdout) {
            localCommitsAhead = parseInt(revListResult.stdout.trim(), 10);
            if (isNaN(localCommitsAhead)) localCommitsAhead = 0;
          }
          logger.debug('Checked for local commits ahead of remote', {
            context: 'UpdateCollectionCommand',
            collectionName: collectionName,
            localCommitsAhead: localCommitsAhead,
          });
        } catch (revListError) {
          logger.warn(
            'Could not execute git rev-list to check for local commits',
            {
              context: 'UpdateCollectionCommand',
              collectionName: collectionName,
              error: revListError.message,
              command: `rev-list --count origin/${defaultBranchName}..HEAD`,
              suggestion:
                'Proceeding without local commit count, but this might indicate an issue.',
            },
          );
        }
      }

      if (hasUncommittedChanges || localCommitsAhead > 0) {
        let abortMessage = `Collection "${collectionName}" has local changes.`;
        if (hasUncommittedChanges && localCommitsAhead > 0) {
          abortMessage = `Collection "${collectionName}" has uncommitted changes and local commits not on the remote.`;
        } else if (localCommitsAhead > 0) {
          abortMessage = `Collection "${collectionName}" has local commits not present on the remote.`;
        }

        logger.warn('Local changes detected, aborting Git update', {
          context: 'UpdateCollectionCommand',
          collectionName: collectionName,
          hasUncommittedChanges: hasUncommittedChanges,
          localCommitsAhead: localCommitsAhead,
          message: abortMessage,
          suggestion:
            'Please commit, stash, or revert your changes before updating.',
        });
        return {
          success: false,
          message: `${abortMessage} Aborting update. Commit, stash, or revert changes.`,
        };
      }

      await this._spawnGitProcess(
        ['reset', '--hard', `origin/${defaultBranchName}`],
        collectionPath,
        `resetting ${collectionName}`,
      );
      logger.success(
        `Successfully updated collection via Git reset: ${collectionName}`,
        {
          context: 'UpdateCollectionCommand',
          branch: defaultBranchName,
          source: originalSourcePath,
        },
      );

      metadata.updated_on = new Date().toISOString();
      await this._writeCollectionMetadata(collectionName, metadata);
      logger.debug('Collection metadata updated with new timestamp', {
        context: 'UpdateCollectionCommand',
        collectionName: collectionName,
        updatedOn: metadata.updated_on,
      });
      return {
        success: true,
        message: `Collection "${collectionName}" updated.`,
      };
    } catch (error) {
      logger.error('Git update process failed for collection', {
        context: 'UpdateCollectionCommand',
        collectionName: collectionName,
        error: error.message,
        stack: error.stack,
      });
      return {
        success: false,
        message: `Git update failed for ${collectionName}: ${error.message}`,
      };
    }
  } else {
    // Handle local path source
    logger.info(
      `Attempting to re-sync collection from local source: ${collectionName} from ${originalSourcePath}`,
      {
        context: 'UpdateCollectionCommand',
      },
    );
    if (!fss.existsSync(originalSourcePath)) {
      logger.error(
        'Original local source path for collection no longer exists, cannot update',
        {
          context: 'UpdateCollectionCommand',
          collectionName: collectionName,
          source: originalSourcePath,
          error: `Original local source path "${originalSourcePath}" for collection "${collectionName}" no longer exists. Cannot update.`,
        },
      );
      return {
        success: false,
        message: `Original local source path "${originalSourcePath}" not found.`,
      };
    }
    if (!fss.lstatSync(originalSourcePath).isDirectory()) {
      logger.error(
        'Original local source path for collection is not a directory, cannot update',
        {
          context: 'UpdateCollectionCommand',
          collectionName: collectionName,
          source: originalSourcePath,
          error: `Original local source path "${originalSourcePath}" for collection "${collectionName}" is not a directory. Cannot update.`,
        },
      );
      return {
        success: false,
        message: `Original local source path "${originalSourcePath}" is not a directory.`,
      };
    }

    try {
      const entries = await fs.readdir(collectionPath);
      for (const entry of entries) {
        if (entry !== collectionsMetadataFilename) {
          await fsExtra.remove(path.join(collectionPath, entry));
          logger.debug(
            'Removed old entry from collection directory for re-sync',
            {
              context: 'UpdateCollectionCommand',
              collectionName: collectionName,
              entry: entry,
            },
          );
        }
      }
      logger.debug(
        'Cleaned existing collection directory (excluding metadata)',
        {
          context: 'UpdateCollectionCommand',
          collectionName: collectionName,
          path: collectionPath,
        },
      );

      await fsExtra.copy(originalSourcePath, collectionPath, {
        overwrite: true,
        errorOnExist: false,
        filter: (src) => {
          if (path.basename(src) === '.git') {
            return false;
          }
          return true;
        },
      });
      logger.success(
        `Successfully re-synced collection from local source: ${collectionName} from ${originalSourcePath}`,
        {
          context: 'UpdateCollectionCommand',
          targetPath: collectionPath,
        },
      );

      metadata.updated_on = new Date().toISOString();
      await this._writeCollectionMetadata(collectionName, metadata);
      logger.debug(
        'Collection metadata updated with new timestamp (local sync)',
        {
          context: 'UpdateCollectionCommand',
          collectionName: collectionName,
          updatedOn: metadata.updated_on,
        },
      );
      return {
        success: true,
        message: `Collection "${collectionName}" re-synced from local source.`,
      };
    } catch (error) {
      logger.error('Failed to re-sync collection from local source', {
        context: 'UpdateCollectionCommand',
        collectionName: collectionName,
        source: originalSourcePath,
        error: error.message,
        stack: error.stack,
      });
      return {
        success: false,
        message: `Failed to re-sync from local source: ${error.message}`,
      };
    }
  }
};
