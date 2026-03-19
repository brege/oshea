// src/validators/v1.js
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const yaml = require('js-yaml');
const os = require('node:os');
const {
  projectRoot,
  cliPath,
  loggerPath,
  contractBootstrapPath,
} = require('@paths');
const logger = require(loggerPath);

const PLUGIN_CONFIG_FILENAME = 'default.yaml';
const PLUGIN_EXAMPLE_FILENAME = 'example.md';
const PLUGIN_SCHEMA_FILENAME = 'schema.json';
const PLUGIN_E2E_TEST_FILENAME = 'e2e.test.js';
function resolveMochaRuntime() {
  const mochaBinPath = require.resolve('mocha/bin/mocha.js');
  const mochaPackagePath = require.resolve('mocha/package.json');
  const runtimeNodeModulesPath = path.dirname(path.dirname(mochaPackagePath));

  return {
    mochaBinPath,
    runtimeNodeModulesPath,
  };
}

function checkCliHelpMetadataV1(pluginDirectoryPath, pluginName, warnings) {
  const configPath = path.join(pluginDirectoryPath, PLUGIN_CONFIG_FILENAME);
  if (fs.existsSync(configPath)) {
    try {
      const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
      if (
        config &&
        typeof config === 'object' &&
        typeof config.cli_help === 'string' &&
        config.cli_help.trim() !== ''
      ) {
        return {
          status: 'passed',
          details: [
            {
              type: 'success',
              message: "Found 'cli_help' in default.yaml",
            },
          ],
        };
      }
    } catch (e) {
      warnings.push(
        `default.yaml for '${pluginName}' has malformed YAML while checking 'cli_help': ${e.message}`,
      );
      return {
        status: 'warning',
        details: [
          {
            type: 'warn',
            message: `default.yaml has malformed YAML while checking 'cli_help': ${e.message}`,
          },
        ],
      };
    }
  }

  const readmePath = path.join(pluginDirectoryPath, 'README.md');

  if (!fs.existsSync(readmePath)) {
    return {
      status: 'skipped',
      details: [
        {
          type: 'info',
          message:
            "README.md not found (no fallback source for 'cli_help' after default.yaml)",
        },
      ],
    };
  }

  const readmeContent = fs.readFileSync(readmePath, 'utf8');
  const frontMatterDelimiter = '---';
  const parts = readmeContent.split(frontMatterDelimiter);

  if (parts.length < 3 || parts[0].trim() !== '') {
    warnings.push(
      `Plugin '${pluginName}' does not define 'cli_help' in default.yaml, and README.md fallback does not have a valid YAML front matter block.`,
    );
    return {
      status: 'warning',
      details: [
        {
          type: 'warn',
          message:
            "default.yaml is missing 'cli_help', and README.md fallback does not have valid YAML front matter",
        },
      ],
    };
  }

  try {
    const frontMatter = yaml.load(parts[1]);
    if (!frontMatter || typeof frontMatter !== 'object') {
      warnings.push(
        `Plugin '${pluginName}' does not define 'cli_help' in default.yaml, and README.md fallback has invalid front matter.`,
      );
      return {
        status: 'warning',
        details: [
          {
            type: 'warn',
            message:
              "default.yaml is missing 'cli_help', and README.md fallback has invalid front matter",
          },
        ],
      };
    }

    if (
      typeof frontMatter.cli_help === 'string' &&
      frontMatter.cli_help.trim() !== ''
    ) {
      return {
        status: 'passed',
        details: [
          {
            type: 'success',
            message: "Found 'cli_help' in README.md front matter (fallback)",
          },
        ],
      };
    }

    warnings.push(
      `Plugin '${pluginName}' does not define 'cli_help' in default.yaml, and README.md fallback front matter has no 'cli_help'.`,
    );
    return {
      status: 'warning',
      details: [
        {
          type: 'warn',
          message:
            "default.yaml is missing 'cli_help', and README.md fallback front matter has no 'cli_help'",
        },
      ],
    };
  } catch (e) {
    warnings.push(
      `Plugin '${pluginName}' does not define 'cli_help' in default.yaml, and README.md fallback has malformed YAML front matter: ${e.message}`,
    );
    return {
      status: 'warning',
      details: [
        {
          type: 'warn',
          message: `default.yaml is missing 'cli_help', and README.md fallback has malformed YAML front matter: ${e.message}`,
        },
      ],
    };
  }
}

const checkFileStructureV1 = (
  pluginDirectoryPath,
  pluginName,
  errors,
  _warnings,
) => {
  const requiredFiles = [
    'index.js',
    PLUGIN_CONFIG_FILENAME,
    PLUGIN_EXAMPLE_FILENAME,
    'README.md',
  ];
  const details = [];
  let allRequiredFound = true;

  for (const file of requiredFiles) {
    if (fs.existsSync(path.join(pluginDirectoryPath, file))) {
      details.push({
        type: 'success',
        message: `Found required file for '${pluginName}': '${file}'`,
      });
    } else {
      errors.push(`Missing required file: '${file}'.`);
      details.push({
        type: 'error',
        message: `Missing required file: '${file}'`,
      });
      allRequiredFound = false;
    }
  }

  return {
    status: allRequiredFound ? 'passed' : 'failed',
    details,
  };
};

const checkOptionalFilesV1 = (pluginDirectoryPath, pluginName, warnings) => {
  const contractDir = path.join(pluginDirectoryPath, '.contract');
  const testDir = path.join(contractDir, 'test');
  const schemaPath = path.join(contractDir, PLUGIN_SCHEMA_FILENAME);
  const details = [];

  let optionalCount = 0;

  if (fs.existsSync(testDir)) {
    details.push({
      type: 'success',
      message: `Found optional ".contract/test/" directory for '${pluginName}'`,
    });
    optionalCount++;
  } else {
    warnings.push('Missing optional ".contract/test/" directory.');
    details.push({
      type: 'warn',
      message: 'Missing optional ".contract/test/" directory',
    });
  }

  if (fs.existsSync(schemaPath)) {
    details.push({
      type: 'success',
      message: `Plugin '${pluginName}' has a schema file ('${PLUGIN_SCHEMA_FILENAME}')`,
    });
    optionalCount++;
  } else {
    warnings.push(
      `Missing optional schema file ('${PLUGIN_SCHEMA_FILENAME}').`,
    );
    details.push({
      type: 'warn',
      message: `Missing optional schema file ('${PLUGIN_SCHEMA_FILENAME}')`,
    });
  }

  const status = optionalCount === 2 ? 'passed' : 'warning';

  return {
    status,
    details,
  };
};

const runInSituTestV1 = (pluginDirectoryPath, pluginName, errors, warnings) => {
  const e2eTestPath = path.join(
    pluginDirectoryPath,
    '.contract',
    'test',
    PLUGIN_E2E_TEST_FILENAME,
  );

  if (!fs.existsSync(e2eTestPath)) {
    warnings.push(
      `Missing E2E test file, skipping test run: '${path.join('.contract/test', PLUGIN_E2E_TEST_FILENAME)}'.`,
    );
    return {
      status: 'skipped',
      details: [
        {
          type: 'info',
          message: `Missing E2E test file for '${pluginName}', skipping run`,
        },
      ],
    };
  }

  try {
    const { mochaBinPath, runtimeNodeModulesPath } = resolveMochaRuntime();
    const command = `node "${mochaBinPath}" --require "${contractBootstrapPath}" "${e2eTestPath}" --no-config --no-opts`;
    const result = execSync(command, {
      cwd: projectRoot,
      stdio: 'pipe',
      env: {
        ...process.env,
        NODE_PATH: runtimeNodeModulesPath,
        OSHEA_PROJECT_ROOT: projectRoot,
      },
    });

    const details = [{ type: 'success', message: 'In-situ test passes' }];

    // Parse test output for display
    if (result && result.length > 0) {
      const testOutput = result.toString().trim();
      // Store test output for validation-test formatter
      details.push({
        type: 'testOutput',
        message: testOutput,
      });
    }

    return {
      status: 'passed',
      details,
    };
  } catch (e) {
    errors.push('In-situ E2E test failed');

    const details = [{ type: 'error', message: 'In-situ test failed' }];

    if (e.stdout && e.stdout.length > 0) {
      details.push({
        type: 'error',
        message: `Test stdout: ${e.stdout.toString()}`,
      });
    }
    if (e.stderr && e.stderr.length > 0) {
      details.push({
        type: 'error',
        message: `Test stderr: ${e.stderr.toString()}`,
      });
    }
    if (
      (!e.stdout || e.stdout.length === 0) &&
      (!e.stderr || e.stderr.length === 0)
    ) {
      details.push({
        type: 'error',
        message: 'No output captured from test process',
      });
    }

    return {
      status: 'failed',
      details,
    };
  }
};

const runSelfActivationV1 = (pluginDirectoryPath, pluginName, errors) => {
  const exampleMdPath = path.join(pluginDirectoryPath, PLUGIN_EXAMPLE_FILENAME);
  const configYamlPath = path.join(pluginDirectoryPath, PLUGIN_CONFIG_FILENAME);

  if (!fs.existsSync(exampleMdPath) || !fs.existsSync(configYamlPath)) {
    errors.push(
      'Self-activation failed: The plugin is missing its example.md or config.yaml file.',
    );
    return {
      status: 'failed',
      details: [
        {
          type: 'error',
          message: 'Self-activation check failed (missing example/config)',
        },
      ],
    };
  }

  const tempOutputDir = fs.mkdtempSync(
    path.join(os.tmpdir(), `oshea-test-${pluginName}-`),
  );

  try {
    const { runtimeNodeModulesPath } = resolveMochaRuntime();
    const command = `node "${cliPath}" convert "${exampleMdPath}" --outdir "${tempOutputDir}" --no-open`;
    execSync(command, {
      cwd: projectRoot,
      stdio: 'pipe',
      env: {
        ...process.env,
        NODE_PATH: runtimeNodeModulesPath,
      },
    });

    return {
      status: 'passed',
      details: [{ type: 'success', message: 'Self-activation successful' }],
    };
  } catch (e) {
    errors.push(
      'Self-activation failed: The plugin was unable to convert its own example file.',
    );

    const details = [
      { type: 'error', message: 'Self-activation check failed' },
    ];

    if (e.stderr) {
      details.push({
        type: 'error',
        message: `Self-activation error: ${e.stderr.toString()}`,
      });
    }

    return {
      status: 'failed',
      details,
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
  const fileStructureResult = checkFileStructureV1(
    pluginDirectoryPath,
    pluginName,
    errors,
    warnings,
  );
  displayValidationStep('plugin file structure', fileStructureResult);

  const optionalFilesResult = checkOptionalFilesV1(
    pluginDirectoryPath,
    pluginName,
    warnings,
  );
  displayValidationStep('for optional files', optionalFilesResult);

  const testResult = runInSituTestV1(
    pluginDirectoryPath,
    pluginName,
    errors,
    warnings,
  );
  displayValidationStep('plugin test setup', testResult);

  const pluginHelpResult = checkCliHelpMetadataV1(
    pluginDirectoryPath,
    pluginName,
    warnings,
  );
  displayValidationStep('plugin help metadata', pluginHelpResult);

  if (errors.length === 0) {
    const selfActivationResult = runSelfActivationV1(
      pluginDirectoryPath,
      pluginName,
      errors,
    );
    displayValidationStep('self-activation sanity check', selfActivationResult);
  } else {
    warnings.push(
      'Skipping self-activation check due to prior critical errors.',
    );
    const skipResult = {
      status: 'skipped',
      details: [
        {
          type: 'info',
          message: 'Skipping self-activation check due to prior errors',
        },
      ],
    };
    displayValidationStep('self-activation sanity check', skipResult);
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
    warnings: warnings,
  };
}

// Helper function to display validation steps using the new formatter
function displayValidationStep(stepName, result) {
  // Start step
  logger.info({ stepName, status: 'testing' }, { format: 'validation-step' });

  // Complete step with results
  logger.info(
    {
      stepName,
      status: result.status,
      details: result.details,
    },
    { format: 'validation-step' },
  );
}

module.exports = {
  validateV1,
  checkFileStructureV1,
  runInSituTestV1,
  runSelfActivationV1,
  checkOptionalFilesV1,
  checkCliHelpMetadataV1,
};
