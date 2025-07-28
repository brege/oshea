// src/validators/v1.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const yaml = require('js-yaml');
const os = require('os');
const { projectRoot, cliPath, mochaPath, nodeModulesPath, loggerPath } = require('@paths');
const logger = require(loggerPath);


function checkReadmeFrontMatterV1(pluginDirectoryPath, pluginName, warnings) {
  const readmePath = path.join(pluginDirectoryPath, 'README.md');

  if (!fs.existsSync(readmePath)) {
    return {
      status: 'skipped',
      details: [{ type: 'info', message: 'README.md not found' }]
    };
  }

  const readmeContent = fs.readFileSync(readmePath, 'utf8');
  const frontMatterDelimiter = '---';
  const parts = readmeContent.split(frontMatterDelimiter);

  if (parts.length < 3 || parts[0].trim() !== '') {
    warnings.push(`README.md for '${pluginName}' does not have a valid YAML front matter block.`);
    return {
      status: 'warning',
      details: [{ type: 'warn', message: 'README.md does not have a valid YAML front matter block' }]
    };
  }

  try {
    const frontMatter = yaml.load(parts[1]);
    if (!frontMatter || typeof frontMatter !== 'object') {
      warnings.push(`README.md for '${pluginName}' has invalid front matter.`);
      return {
        status: 'warning',
        details: [{ type: 'warn', message: 'README.md has invalid front matter' }]
      };
    }

    return {
      status: 'passed',
      details: [{ type: 'success', message: 'README.md has a valid front matter block' }]
    };
  } catch (e) {
    warnings.push(`README.md for '${pluginName}' has malformed YAML front matter: ${e.message}`);
    return {
      status: 'warning',
      details: [{ type: 'warn', message: `README.md has malformed YAML front matter: ${e.message}` }]
    };
  }
}

const checkFileStructureV1 = (pluginDirectoryPath, pluginName, errors, warnings) => {
  const requiredFiles = ['index.js', `${pluginName}.config.yaml`, `${pluginName}-example.md`, 'README.md'];
  const details = [];
  let allRequiredFound = true;

  for (const file of requiredFiles) {
    if (fs.existsSync(path.join(pluginDirectoryPath, file))) {
      details.push({ type: 'success', message: `Found required file: '${file}'` });
    } else {
      errors.push(`Missing required file: '${file}'.`);
      details.push({ type: 'error', message: `Missing required file: '${file}'` });
      allRequiredFound = false;
    }
  }

  return {
    status: allRequiredFound ? 'passed' : 'failed',
    details
  };
};

const checkOptionalFilesV1 = (pluginDirectoryPath, pluginName, warnings) => {
  const contractDir = path.join(pluginDirectoryPath, '.contract');
  const testDir = path.join(contractDir, 'test');
  const schemaFileName = `${pluginName}.schema.json`;
  const schemaPath = path.join(contractDir, schemaFileName);
  const details = [];

  let optionalCount = 0;

  if (fs.existsSync(testDir)) {
    details.push({ type: 'success', message: 'Found optional ".contract/test/" directory' });
    optionalCount++;
  } else {
    warnings.push('Missing optional ".contract/test/" directory.');
    details.push({ type: 'warn', message: 'Missing optional ".contract/test/" directory' });
  }

  if (fs.existsSync(schemaPath)) {
    details.push({ type: 'success', message: `Plugin has a schema file ('${schemaFileName}')` });
    optionalCount++;
  } else {
    warnings.push(`Missing optional schema file ('${schemaFileName}').`);
    details.push({ type: 'warn', message: `Missing optional schema file ('${schemaFileName}')` });
  }

  const status = optionalCount === 2 ? 'passed' : 'warning';

  return {
    status,
    details
  };
};


const runInSituTestV1 = (pluginDirectoryPath, pluginName, errors, warnings) => {
  const e2eTestPath = path.join(pluginDirectoryPath, '.contract', 'test', `${pluginName}-e2e.test.js`);

  if (!fs.existsSync(e2eTestPath)) {
    warnings.push(`Missing E2E test file, skipping test run: '${path.join('.contract/test', `${pluginName}-e2e.test.js`)}'.`);
    return {
      status: 'skipped',
      details: [{ type: 'info', message: 'Missing E2E test file, skipping run' }]
    };
  }

  try {
    const command = `node "${mochaPath}" "${e2eTestPath}" --no-config --no-opts`;
    const result = execSync(command, {
      cwd: projectRoot,
      stdio: 'pipe',
      env: {
        ...process.env,
        NODE_PATH: nodeModulesPath
      }
    });

    const details = [{ type: 'success', message: 'In-situ test passes' }];

    // Parse test output for display
    if (result && result.length > 0) {
      const testOutput = result.toString().trim();
      // Store test output for validation-test formatter
      details.push({
        type: 'testOutput',
        message: testOutput
      });
    }

    return {
      status: 'passed',
      details
    };
  } catch (e) {
    errors.push('In-situ E2E test failed');

    const details = [{ type: 'error', message: 'In-situ test failed' }];

    if (e.stdout && e.stdout.length > 0) {
      details.push({ type: 'error', message: `Test stdout: ${e.stdout.toString()}` });
    }
    if (e.stderr && e.stderr.length > 0) {
      details.push({ type: 'error', message: `Test stderr: ${e.stderr.toString()}` });
    }
    if ((!e.stdout || e.stdout.length === 0) && (!e.stderr || e.stderr.length === 0)) {
      details.push({ type: 'error', message: 'No output captured from test process' });
    }

    return {
      status: 'failed',
      details
    };
  }
};


const runSelfActivationV1 = (pluginDirectoryPath, pluginName, errors) => {
  const exampleMdPath = path.join(pluginDirectoryPath, `${pluginName}-example.md`);
  const configYamlPath = path.join(pluginDirectoryPath, `${pluginName}.config.yaml`);

  if (!fs.existsSync(exampleMdPath) || !fs.existsSync(configYamlPath)) {
    errors.push('Self-activation failed: The plugin is missing its example.md or config.yaml file.');
    return {
      status: 'failed',
      details: [{ type: 'error', message: 'Self-activation check failed (missing example/config)' }]
    };
  }

  const tempOutputDir = fs.mkdtempSync(path.join(os.tmpdir(), `md-to-pdf-test-${pluginName}-`));

  try {
    const command = `node "${cliPath}" convert "${exampleMdPath}" --outdir "${tempOutputDir}" --no-open`;
    execSync(command, {
      cwd: projectRoot,
      stdio: 'pipe',
      env: {
        ...process.env,
        NODE_PATH: nodeModulesPath
      }
    });

    return {
      status: 'passed',
      details: [{ type: 'success', message: 'Self-activation successful' }]
    };
  } catch (e) {
    errors.push('Self-activation failed: The plugin was unable to convert its own example file.');

    const details = [{ type: 'error', message: 'Self-activation check failed' }];

    if (e.stderr) {
      details.push({ type: 'error', message: `Self-activation error: ${e.stderr.toString()}` });
    }

    return {
      status: 'failed',
      details
    };
  } finally {
    fs.rmSync(tempOutputDir, { recursive: true, force: true });
  }
};


function validateV1(pluginDirectoryPath, pluginMetadata) {
  const errors = [];
  const warnings = [];
  const pluginName = pluginMetadata.plugin_name.value;

  // Display validation header
  logger.info({ protocol: 'V1', pluginName }, { format: 'validation-header' });

  // Run validation steps with new formatter system
  const fileStructureResult = checkFileStructureV1(pluginDirectoryPath, pluginName, errors, warnings);
  displayValidationStep('plugin file structure', fileStructureResult);

  const optionalFilesResult = checkOptionalFilesV1(pluginDirectoryPath, pluginName, warnings);
  displayValidationStep('for optional files', optionalFilesResult);

  const testResult = runInSituTestV1(pluginDirectoryPath, pluginName, errors, warnings);
  displayValidationStep('plugin test setup', testResult);

  const readmeResult = checkReadmeFrontMatterV1(pluginDirectoryPath, pluginName, warnings);
  displayValidationStep('README.md front matter', readmeResult);

  if (errors.length === 0) {
    const selfActivationResult = runSelfActivationV1(pluginDirectoryPath, pluginName, errors);
    displayValidationStep('self-activation sanity check', selfActivationResult);
  } else {
    warnings.push('Skipping self-activation check due to prior critical errors.');
    const skipResult = {
      status: 'skipped',
      details: [{ type: 'info', message: 'Skipping self-activation check due to prior errors' }]
    };
    displayValidationStep('self-activation sanity check', skipResult);
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
    warnings: warnings
  };
}

// Helper function to display validation steps using the new formatter
function displayValidationStep(stepName, result) {
  // Start step
  logger.info({ stepName, status: 'testing' }, { format: 'validation-step' });

  // Complete step with results
  logger.info({
    stepName,
    status: result.status,
    details: result.details
  }, { format: 'validation-step' });
}

module.exports = {
  validateV1,
  checkFileStructureV1,
  runInSituTestV1,
  runSelfActivationV1,
  checkOptionalFilesV1,
  checkReadmeFrontMatterV1
};
