// scripts/shared/output-adapter.js
const { spawn } = require('child_process');
const { adaptRawIssuesToEslintFormat, formatLintResults } = require('./formatters');

class OutputAdapter {
  constructor(formatter = 'stylish') {
    this.formatter = formatter;
  }

  async run(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      const childArgs = [...args, '--json'];
      const child = spawn(command, childArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        ...options
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        try {
          const jsonOutput = JSON.parse(stdout);
          const rawIssues = jsonOutput.issues || [];

          const eslintResults = adaptRawIssuesToEslintFormat(rawIssues);

          if (eslintResults.length > 0) {
            console.log(formatLintResults(eslintResults, this.formatter));
          } else {
            console.log('✔ No issues found.');
          }

          resolve({ exitCode: code, results: eslintResults });
        } catch (error) {
          console.error('Error processing linter output. Raw stdout:');
          console.log(stdout);
          if (stderr) {
            console.error('Stderr:');
            console.error(stderr);
          }
          reject(error);
        }
      });

      child.on('error', reject);
    });
  }
}

module.exports = { OutputAdapter };
