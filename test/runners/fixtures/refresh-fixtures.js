#!/usr/bin/env node
// test/runners/fixtures/refresh-fixtures.js
// Script to regenerate test fixtures when plugin architecture changes

require('module-alias/register');
const { loggerPath, projectRoot } = require('@paths');
const fs = require('fs-extra');
const path = require('node:path');
const { execSync } = require('node:child_process');
const logger = require(loggerPath);
const FIXTURES_DIR = __dirname;
const FULL_FAT_DIR = path.join(FIXTURES_DIR, 'full-fat-dummies');
const PROJECT_ROOT = projectRoot;

async function refreshFixtures() {
  logger.info('Refreshing test fixtures');

  // Clean existing fixtures
  if (await fs.pathExists(FULL_FAT_DIR)) {
    logger.debug('Removing old fixtures');
    await fs.remove(FULL_FAT_DIR);
  }

  await fs.ensureDir(FULL_FAT_DIR);

  // Create valid single plugin
  logger.info('Creating valid-plugin fixture');
  execSync(
    `node cli.js plugin create valid-plugin --outdir "${FULL_FAT_DIR}"`,
    {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
    },
  );

  // Create valid collection with multiple plugins
  logger.info('Creating valid-collection fixture');
  execSync(
    `node cli.js plugin create valid-collection-plugin-1 --outdir "${FULL_FAT_DIR}"`,
    {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
    },
  );

  execSync(
    `node cli.js plugin create valid-collection-plugin-2 --outdir "${FULL_FAT_DIR}"`,
    {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
    },
  );

  // Move plugins into collection structure
  const collectionDir = path.join(FULL_FAT_DIR, 'valid-collection');
  await fs.ensureDir(collectionDir);

  await fs.move(
    path.join(FULL_FAT_DIR, 'valid-collection-plugin-1'),
    path.join(collectionDir, 'valid-collection-plugin-1'),
  );

  await fs.move(
    path.join(FULL_FAT_DIR, 'valid-collection-plugin-2'),
    path.join(collectionDir, 'valid-collection-plugin-2'),
  );

  logger.info('Fixtures refreshed successfully');
  logger.debug(`Generated fixtures at ${FULL_FAT_DIR}`);
}

async function validateFixtures() {
  logger.info('Validating fixtures');

  const validPluginDir = path.join(FULL_FAT_DIR, 'valid-plugin');
  const validCollectionDir = path.join(FULL_FAT_DIR, 'valid-collection');

  // Validate single plugin
  try {
    execSync(`node cli.js plugin validate "${validPluginDir}"`, {
      cwd: PROJECT_ROOT,
      stdio: 'pipe',
    });
    logger.success('valid-plugin fixture is valid');
  } catch (error) {
    logger.error('valid-plugin fixture failed validation');
    logger.error(error.stdout?.toString() || error.message);
  }

  // Validate collection plugins
  const plugin1Dir = path.join(validCollectionDir, 'valid-collection-plugin-1');
  const plugin2Dir = path.join(validCollectionDir, 'valid-collection-plugin-2');

  try {
    execSync(`node cli.js plugin validate "${plugin1Dir}"`, {
      cwd: PROJECT_ROOT,
      stdio: 'pipe',
    });
    logger.success('valid-collection-plugin-1 fixture is valid');
  } catch (error) {
    logger.error('valid-collection-plugin-1 fixture failed validation');
    logger.error(error.stdout?.toString() || error.message);
  }

  try {
    execSync(`node cli.js plugin validate "${plugin2Dir}"`, {
      cwd: PROJECT_ROOT,
      stdio: 'pipe',
    });
    logger.success('valid-collection-plugin-2 fixture is valid');
  } catch (error) {
    logger.error('valid-collection-plugin-2 fixture failed validation');
    logger.error(error.stdout?.toString() || error.message);
  }
}

// Main execution
if (require.main === module) {
  refreshFixtures()
    .then(() => validateFixtures())
    .catch((error) => {
      logger.error('Error refreshing fixtures:', error);
      process.exit(1);
    });
}

module.exports = { refreshFixtures, validateFixtures };
