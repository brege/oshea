const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

const cliPath = path.resolve(__dirname, '../../cli.js'); // Adjusted path to be relative from test/e2e

class TestHarness {
    constructor() {
        this.sandboxDir = '';
    }

    /**
     * Creates a clean, temporary directory for a test run.
     * @returns {Promise<string>} The path to the created sandbox directory.
     */
    async createSandbox() {
        this.sandboxDir = await fs.mkdtemp(path.join(os.tmpdir(), 'md-to-pdf-e2e-'));
        return this.sandboxDir;
    }

    /**
     * Executes the CLI with given arguments within the sandbox directory.
     * @param {string[]} [args=[]] - The arguments to pass to the CLI.
     * @returns {Promise<{exitCode: number, stdout: string, stderr: string}>}
     */
    runCli(args = []) {
        return new Promise((resolve) => {
            const process = spawn('node', [cliPath, ...args], { cwd: this.sandboxDir });
            let stdout = '';
            let stderr = '';
            process.stdout.on('data', (data) => (stdout += data.toString()));
            process.stderr.on('data', (data) => (stderr += data.toString()));
            process.on('close', (exitCode) => resolve({ exitCode, stdout, stderr }));
        });
    }

    /**
     * Cleans up the temporary sandbox directory.
     * @returns {Promise<void>}
     */
    cleanup() {
        if (this.sandboxDir) {
            return fs.remove(this.sandboxDir);
        }
        return Promise.resolve();
    }
}

module.exports = { TestHarness };
