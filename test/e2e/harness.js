// test/e2e/harness.js
const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

const cliPath = path.resolve(__dirname, '../../cli.js');
const fixtureGitConfigPath = path.resolve(__dirname, '../fixtures/config/.gitconfig');

class TestHarness {
    constructor() {
        this.sandboxDir = '';
        this.collRootDir = ''; // To store the path to the sandboxed collections root
    }

    /**
     * Creates a clean, temporary directory for a test run,
     * including a dedicated subdirectory for the CollectionsManager root.
     * @returns {Promise<string>} The path to the created sandbox directory.
     */
    async createSandbox() {
        this.sandboxDir = await fs.mkdtemp(path.join(os.tmpdir(), 'md-to-pdf-e2e-'));
        this.collRootDir = path.join(this.sandboxDir, '.cm-test-root');
        await fs.ensureDir(this.collRootDir);
        return this.sandboxDir;
    }

    /**
     * Executes the CLI with given arguments within the sandbox directory,
     * forcing it to use the sandboxed collections root.
     * @param {string[]} [args=[]] - The arguments to pass to the CLI.
     * @param {object} [options={}] - Options for the CLI run.
     * @returns {Promise<{exitCode: number, stdout: string, stderr: string}>}
     */
    runCli(args = [], options = {}) {
        const { useFactoryDefaults = true } = options;

        const defaultFlags = ['--coll-root', this.collRootDir];
        if (useFactoryDefaults) {
            defaultFlags.push('--factory-defaults');
        }

        const fullArgs = [...defaultFlags, ...args];
        
        // Prepare environment variables for the spawned process.
        // This forces any git commands run by the CLI to use our test-specific config.
        const testProcessEnv = {
            ...process.env,
            GIT_CONFIG_GLOBAL: fixtureGitConfigPath
        };

        return new Promise((resolve) => {
            // --- START MODIFICATION ---
            // Pass the custom environment to the spawned process.
            const proc = spawn('node', [cliPath, ...fullArgs], {
                cwd: this.sandboxDir,
                env: testProcessEnv
            });
            // --- END MODIFICATION ---
            let stdout = '';
            let stderr = '';
            proc.stdout.on('data', (data) => (stdout += data.toString()));
            proc.stderr.on('data', (data) => (stderr += data.toString()));
            proc.on('close', (exitCode) => resolve({ exitCode, stdout, stderr }));
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
