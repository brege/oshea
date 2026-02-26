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

  logger.info('Fixtures refreshed successfully');
  logger.debug(`Generated fixtures at ${FULL_FAT_DIR}`);
}

async function validateFixtures() {
  logger.info('Validating fixtures');

  const validPluginDir = path.join(FULL_FAT_DIR, 'valid-plugin');
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
