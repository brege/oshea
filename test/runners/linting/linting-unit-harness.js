// test/runners/linting/linting-unit-harness.js
require('module-alias/register');

const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { cliPath, projectRoot } = require('@paths');

class UnitTestHarness {
  constructor() {
    this.sandboxDir = '';
  }

  async createSandbox(prefix = 'unit-test-') {
    this.sandboxDir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
    return this.sandboxDir;
  }

  runCli(args = [], cwd = projectRoot) {
    return new Promise((resolve) => {
      const proc = spawn('node', [cliPath, ...args], { cwd });
      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (data) => (stdout += data.toString()));
      proc.stderr.on('data', (data) => (stderr += data.toString()));
      proc.on('close', (exitCode) => resolve({ exitCode, stdout, stderr }));
    });
  }

  runScript(scriptPath, args = [], cwd) {
    return new Promise((resolve) => {
      const proc = spawn('node', [scriptPath, ...args], { cwd });
      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (data) => (stdout += data.toString()));
      proc.stderr.on('data', (data) => (stderr += data.toString()));
      proc.on('close', (exitCode) => resolve({ exitCode, stdout, stderr }));
    });
  }

  cleanup() {
    if (this.sandboxDir) {
      return fs.remove(this.sandboxDir);
    }
    return Promise.resolve();
  }
}

module.exports = { UnitTestHarness };

