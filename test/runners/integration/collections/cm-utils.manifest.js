// test/runners/integration/collections/cm-utils.manifest.js
require('module-alias/register');
const { cmUtilsFactoryPath } = require('@paths');
const { makeCmUtilsScenario } = require(cmUtilsFactoryPath);

module.exports = [
  // --- deriveCollectionName (1.8.1) ---
  makeCmUtilsScenario({
    testId: '1.8.1.1',
    method: 'deriveCollectionName',
    description: 'should correctly derive a sanitized name from a full Git URL',
    args: ['https://github.com/user/my-repo.git'],
    expected: 'my-repo'
  }),
  makeCmUtilsScenario({
    testId: '1.8.1.2',
    method: 'deriveCollectionName',
    description: 'should correctly derive a sanitized name from a local path with .git suffix',
    args: ['/path/to/local/my-other-repo.git'],
    expected: 'my-other-repo'
  }),
  makeCmUtilsScenario({
    testId: '1.8.1.3',
    method: 'deriveCollectionName',
    description: 'should handle source URLs or paths without a .git suffix',
    args: ['https://example.com/project/awesome-library'],
    expected: 'awesome-library'
  }),
  makeCmUtilsScenario({
    testId: '1.8.1.4',
    method: 'deriveCollectionName',
    description: 'should replace non-alphanumeric characters (excluding hyphens and underscores) with hyphens',
    args: ['https://bitbucket.org/team/my_project!name.js'],
    expected: 'my_project-name-js'
  }),
  makeCmUtilsScenario({
    testId: '1.8.1.5',
    method: 'deriveCollectionName',
    description: 'should handle empty string input',
    args: [''],
    expected: ''
  }),
  makeCmUtilsScenario({
    testId: '1.8.1.6',
    method: 'deriveCollectionName',
    description: 'should handle null input',
    args: [null],
    expected: ''
  }),
  makeCmUtilsScenario({
    testId: '1.8.1.7',
    method: 'deriveCollectionName',
    description: 'should handle undefined input',
    args: [undefined],
    expected: ''
  }),
  makeCmUtilsScenario({
    testId: '1.8.1.8',
    method: 'deriveCollectionName',
    description: 'should handle non-string input gracefully (e.g., number)',
    args: [12345],
    expected: ''
  }),
  makeCmUtilsScenario({
    testId: '1.8.1.9',
    method: 'deriveCollectionName',
    description: 'should handle non-string input gracefully (e.g., object)',
    args: [{ url: 'http://example.com/repo' }],
    expected: ''
  }),
  makeCmUtilsScenario({
    testId: '1.8.1.10',
    method: 'deriveCollectionName',
    description: 'should collapse multiple consecutive non-alphanumeric characters into a single hyphen',
    args: ['https://gitlab.com/group/another---repo!!!project.git'],
    expected: 'another-repo-project'
  }),
  makeCmUtilsScenario({
    testId: '1.8.1.11',
    method: 'deriveCollectionName',
    description: 'should remove leading/trailing hyphens resulting from sanitization',
    args: ['https://github.com/user/-repo-with-leading-trailing-.git'],
    expected: 'repo-with-leading-trailing-'
  }),

  // --- toPascalCase (1.8.2) ---
  makeCmUtilsScenario({
    testId: '1.8.2.1',
    method: 'toPascalCase',
    description: 'should convert a hyphenated string to PascalCase',
    args: ['my-plugin-name'],
    expected: 'MyPluginName'
  }),
  makeCmUtilsScenario({
    testId: '1.8.2.2',
    method: 'toPascalCase',
    description: 'should handle single word strings',
    args: ['plugin'],
    expected: 'Plugin'
  }),
  makeCmUtilsScenario({
    testId: '1.8.2.3',
    method: 'toPascalCase',
    description: 'should handle empty string input',
    args: [''],
    expected: ''
  }),
  makeCmUtilsScenario({
    testId: '1.8.2.4',
    method: 'toPascalCase',
    description: 'should handle null input',
    args: [null],
    expected: ''
  }),
  makeCmUtilsScenario({
    testId: '1.8.2.5',
    method: 'toPascalCase',
    description: 'should handle undefined input',
    args: [undefined],
    expected: ''
  }),
  makeCmUtilsScenario({
    testId: '1.8.2.6',
    method: 'toPascalCase',
    description: 'should handle strings with multiple consecutive hyphens by treating them as single delimiters',
    args: ['another--plugin---name'],
    expected: 'AnotherPluginName'
  }),
  makeCmUtilsScenario({
    testId: '1.8.2.7',
    method: 'toPascalCase',
    description: 'should handle strings with leading hyphens',
    args: ['-leading-hyphen'],
    expected: 'LeadingHyphen'
  }),
  makeCmUtilsScenario({
    testId: '1.8.2.8',
    method: 'toPascalCase',
    description: 'should handle strings with trailing hyphens',
    args: ['trailing-hyphen-'],
    expected: 'TrailingHyphen'
  }),
  makeCmUtilsScenario({
    testId: '1.8.2.9',
    method: 'toPascalCase',
    description: 'should handle strings that start with a capital letter but have hyphens',
    args: ['My-plugin-name'],
    expected: 'MyPluginName'
  }),
  makeCmUtilsScenario({
    testId: '1.8.2.10',
    method: 'toPascalCase',
    description: 'should handle strings with numbers and hyphens',
    args: ['plugin-v1-0-2'],
    expected: 'PluginV102'
  }),

  // --- isValidPluginName (1.8.3) ---
  makeCmUtilsScenario({
    testId: '1.8.3.1',
    method: 'isValidPluginName',
    description: 'should return true for a valid alphanumeric plugin name',
    args: ['myplugin'],
    expected: true
  }),
  makeCmUtilsScenario({
    testId: '1.8.3.2',
    method: 'isValidPluginName',
    description: 'should return true for a valid alphanumeric plugin name with hyphens',
    args: ['my-plugin-name'],
    expected: true
  }),
  makeCmUtilsScenario({
    testId: '1.8.3.3',
    method: 'isValidPluginName',
    description: 'should return true for a valid plugin name starting and ending with alphanumeric characters',
    args: ['plugin123'],
    expected: true
  }),
  makeCmUtilsScenario({
    testId: '1.8.3.3b',
    method: 'isValidPluginName',
    description: 'should return true for a valid plugin name starting and ending with alphanumeric characters (number first)',
    args: ['123plugin'],
    expected: true
  }),
  makeCmUtilsScenario({
    testId: '1.8.3.4',
    method: 'isValidPluginName',
    description: 'should return true for a single alphanumeric character plugin name',
    args: ['a'],
    expected: true
  }),
  makeCmUtilsScenario({
    testId: '1.8.3.4b',
    method: 'isValidPluginName',
    description: 'should return true for a single numeric character plugin name',
    args: ['1'],
    expected: true
  }),
  makeCmUtilsScenario({
    testId: '1.8.3.5',
    method: 'isValidPluginName',
    description: 'should return true for a plugin name with mixed case alphanumeric characters',
    args: ['MyPluginName'],
    expected: true
  }),
  makeCmUtilsScenario({
    testId: '1.8.3.5b',
    method: 'isValidPluginName',
    description: 'should return true for a plugin name with mixed case and hyphens',
    args: ['my-Plugin-Name'],
    expected: true
  }),
  makeCmUtilsScenario({
    testId: '1.8.3.6',
    method: 'isValidPluginName',
    description: 'should return false for an empty string',
    args: [''],
    expected: false
  }),
  makeCmUtilsScenario({
    testId: '1.8.3.7',
    method: 'isValidPluginName',
    description: 'should return false for null input',
    args: [null],
    expected: false
  }),
  makeCmUtilsScenario({
    testId: '1.8.3.8',
    method: 'isValidPluginName',
    description: 'should return false for undefined input',
    args: [undefined],
    expected: false
  }),
  makeCmUtilsScenario({
    testId: '1.8.3.9',
    method: 'isValidPluginName',
    description: 'should return false for non-string input (e.g., number)',
    args: [123],
    expected: false
  }),
  makeCmUtilsScenario({
    testId: '1.8.3.10',
    method: 'isValidPluginName',
    description: 'should return false for plugin names with leading hyphens',
    args: ['-my-plugin'],
    expected: false
  }),
  makeCmUtilsScenario({
    testId: '1.8.3.11',
    method: 'isValidPluginName',
    description: 'should return false for plugin names with trailing hyphens',
    args: ['my-plugin-'],
    expected: false
  }),
  makeCmUtilsScenario({
    testId: '1.8.3.12',
    method: 'isValidPluginName',
    description: 'should return false for plugin names with consecutive hyphens',
    args: ['my--plugin'],
    expected: false
  }),
  makeCmUtilsScenario({
    testId: '1.8.3.13',
    method: 'isValidPluginName',
    description: 'should return false for plugin names with special characters (other than hyphen)',
    args: ['my_plugin'],
    expected: false
  }),
  makeCmUtilsScenario({
    testId: '1.8.3.13b',
    method: 'isValidPluginName',
    description: 'should return false for plugin names with special characters (exclamation mark)',
    args: ['my!plugin'],
    expected: false
  }),
  makeCmUtilsScenario({
    testId: '1.8.3.13c',
    method: 'isValidPluginName',
    description: 'should return false for plugin names with special characters (dot)',
    args: ['my.plugin'],
    expected: false
  }),
  makeCmUtilsScenario({
    testId: '1.8.3.14',
    method: 'isValidPluginName',
    description: 'should return false for plugin names that do not start with alphanumeric characters',
    args: ['@plugin'],
    expected: false
  }),
  makeCmUtilsScenario({
    testId: '1.8.3.15',
    method: 'isValidPluginName',
    description: 'should return false for plugin names that do not end with alphanumeric characters',
    args: ['plugin@'],
    expected: false
  }),
  makeCmUtilsScenario({
    testId: '1.8.3.16',
    method: 'isValidPluginName',
    description: 'should return false for plugin names with spaces',
    args: ['my plugin'],
    expected: false
  }),
];

