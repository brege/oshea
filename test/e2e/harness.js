// test/e2e/harness.js
const { spawn } = require('child_process');
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

        // --- START MODIFICATION ---
        // Refactor how stdout/stderr are captured for more robust stream handling.
        return new Promise((resolve) => {
            console.log(`[HARNESS] Spawning: node ${cliPath} ${fullArgs.join(' ')}`);
            const proc = spawn('node', [cliPath, ...fullArgs], { cwd: this.sandboxDir });
            
            const stdoutChunks = [];
            const stderrChunks = [];

            proc.stdout.on('data', (data) => {
                console.log(`[HARNESS] stdout chunk received: ${data.toString().substring(0, 50)}...`);
                stdoutChunks.push(data);
            });

            proc.stderr.on('data', (data) => {
                console.log(`[HARNESS] stderr chunk received: ${data.toString().substring(0, 50)}...`);
                stderrChunks.push(data);
            });

            proc.on('close', (exitCode) => {
                const stdout = Buffer.concat(stdoutChunks).toString('utf8');
                const stderr = Buffer.concat(stderrChunks).toString('utf8');
                console.log(`[HARNESS] Process closed with code: ${exitCode}`);
                console.log(`[HARNESS] Final stdout length: ${stdout.length}`);
                console.log(`[HARNESS] Final stderr length: ${stderr.length}`);
                resolve({ exitCode, stdout, stderr });
            });

            proc.on('error', (err) => {
                console.error('[HARNESS] Spawn error:', err);
                resolve({ exitCode: 1, stdout: '', stderr: err.message });
            });
        });
        // --- END MODIFICATION ---
    }

    async cleanup() {
        if (this.sandboxDir) {
            return fs.remove(this.sandboxDir);
        }
        return Promise.resolve();
    }
}

module.exports = { TestHarness };
