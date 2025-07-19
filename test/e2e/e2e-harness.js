// test/e2e/e2e-harness.js
const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

const cliPath = path.resolve(__dirname, '../../cli.js');

class TestHarness {
  constructor() {
    this.sandboxDir = '';
    this.collRootDir = ''; // To store the path to the sandboxed collections root
  }


  async createSandbox() {
    this.sandboxDir = await fs.mkdtemp(path.join(os.tmpdir(), 'md-to-pdf-e2e-'));
    this.collRootDir = path.join(this.sandboxDir, '.cm-test-root');
    await fs.ensureDir(this.collRootDir);
    return this.sandboxDir;
  }


  runCli(args = [], options = {}) {
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

module.exports = { TestHarness };
