const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');
const chalk = require('chalk');

// Each check is now a distinct, exported function.
const checkFileStructure = (pluginDirectoryPath, pluginName, errors, warnings) => {
  console.log(chalk.cyan(`  Checking plugin file structure...`));
  const requiredFiles = [`index.js`, `${pluginName}.config.yaml`, `${pluginName}-example.md`, `README.md`];
  requiredFiles.forEach(file => {
    if (!fs.existsSync(path.join(pluginDirectoryPath, file))) {
      errors.push(`Missing required file: '${file}'.`);
    }
  });
};

const runInSituTest = (pluginDirectoryPath, pluginName, errors, warnings) => {
  console.log(chalk.cyan(`  Checking plugin's test setup...`));
  const testPath = path.join(pluginDirectoryPath, 'test', `${pluginName}-e2e.test.js`);
  if (!fs.existsSync(testPath)) {
    warnings.push(`Missing E2E test file: '${path.basename(testPath)}'.`);
    return;
  }
  try {
    console.log(chalk.cyan(`    Running in-situ E2E test...`));
    execSync(`node node_modules/mocha/bin/mocha "${testPath}"`, { stdio: 'pipe' });
     console.log(chalk.green(`    [✔] In-situ test passes.`));
  } catch (e) {
    errors.push(`In-situ E2E test failed: ${e.message.split('\n')[0]}`);
  }
};

const runSelfActivation = (pluginDirectoryPath, pluginName, errors, warnings) => {
    console.log(chalk.cyan(`  Performing self-activation sanity check...`));
    // (Self-activation logic would go here)
    warnings.push('Self-activation check is not yet implemented in this service.');
};


module.exports = {
    checkFileStructure,
    runInSituTest,
    runSelfActivation,
};
