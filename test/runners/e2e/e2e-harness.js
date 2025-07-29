// test/runners/e2e/e2e-harness.js
require('module-alias/register');
const { cliPath, loggerPath } = require('@paths');
const logger = require(loggerPath);

const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

class TestHarness {
  constructor() {
    this.sandboxDir = '';
    this.collRootDir = '';
    this.keepSandbox = false; // DEBUG_KEEP_SANDBOX=true npm test
  }

  async createSandbox() {
    this.sandboxDir = await fs.mkdtemp(path.join(os.tmpdir(), 'md-to-pdf-e2e-'));
    this.collRootDir = path.join(this.sandboxDir, '.cm-test-root');
    await fs.ensureDir(this.collRootDir);
    return this.sandboxDir;
  }

  async runCli(args = [], options = {}) {
    const { useFactoryDefaults = true } = options;

    const defaultFlags = ['--coll-root', this.collRootDir];
    if (useFactoryDefaults) {
      defaultFlags.push('--factory-defaults');
    }
    const fullArgs = [...defaultFlags, ...args];

    return new Promise((resolve) => {
      const proc = spawn('node', [cliPath, ...fullArgs], { cwd: this.sandboxDir });
      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (data) => (stdout += data.toString()));
      proc.stderr.on('data', (data) => (stderr += data.toString()));
      proc.on('close', (exitCode) => {
        logger.debug(`Exit code: ${exitCode}`);
        logger.debug(`stdout:\n${stdout}`);
        if (stderr.trim()) {
          logger.warn(`stderr:\n${stderr}`);
        }
        resolve({ exitCode, stdout, stderr });
      });
    });
  }

  async cleanup() {
    const debugEnvFlag = process.env.DEBUG_KEEP_SANDBOX === 'true';

    if (this.keepSandbox || debugEnvFlag) {
      logger.debug(`Sandbox cleanup skipped (keepSandbox=${this.keepSandbox}, DEBUG_KEEP_SANDBOX=${debugEnvFlag})`);
      logger.debug(`Sandbox preserved at: ${this.sandboxDir}`);
      return Promise.resolve();
    }

    if (this.sandboxDir) {
      return fs.remove(this.sandboxDir);
    }

    return Promise.resolve();
  }
}

module.exports = { TestHarness };

