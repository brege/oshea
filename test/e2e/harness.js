// test/e2e/harness.js
const { spawn, execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

const cliPath = path.resolve(__dirname, '../../cli.js');

class TestHarness {
    constructor() {
        this.sandboxDir = '';
        this.collRootDir = '';
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
        // execSync needs a single command string
        const command = `node "${cliPath}" ${fullArgs.join(' ')}`;

        console.log(`[HARNESS] Executing synchronously: ${command}`);

        try {
            // execSync blocks until the command completes and returns the full stdout.
            const stdout = execSync(command, { 
                cwd: this.sandboxDir, 
                encoding: 'utf8',
                // Increase timeout just in case of slow CI environment
                timeout: 30000 
            });
            // If execSync completes without error, the exit code is 0.
            return { exitCode: 0, stdout: stdout, stderr: '' };
        } catch (error) {
            // If the command returns a non-zero exit code, execSync throws an error.
            // The output is available on the error object.
            console.log(`[HARNESS] execSync caught error. Exit Code: ${error.status}`);
            return {
                exitCode: error.status,
                stdout: error.stdout.toString('utf8'),
                stderr: error.stderr.toString('utf8')
            };
        }
    }

    async cleanup() {
        if (this.sandboxDir) {
            return fs.remove(this.sandboxDir);
        }
        return Promise.resolve();
    }
}

module.exports = { TestHarness };
