// test/collections-manager/cm-utils.test.1.8.3.js

const { expect } = require('chai');
const { isValidPluginName } = require('../../src/collections-manager/cm-utils');

describe('L1C8.3: isValidPluginName - Validation', () => {
  // Valid cases
  it('1.8.3.1 should return true for a valid alphanumeric plugin name', () => {
    expect(isValidPluginName('myplugin')).to.be.true;
  });

  it('1.8.3.2 should return true for a valid alphanumeric plugin name with hyphens', () => {
    expect(isValidPluginName('my-plugin-name')).to.be.true;
  });

  it('1.8.3.3 should return true for a valid plugin name starting and ending with alphanumeric characters', () => {
    expect(isValidPluginName('plugin123')).to.be.true;
    expect(isValidPluginName('123plugin')).to.be.true;
  });

  it('1.8.3.4 should return true for a single alphanumeric character plugin name', () => {
    expect(isValidPluginName('a')).to.be.true;
    expect(isValidPluginName('1')).to.be.true;
  });

  it('1.8.3.5 should return true for a plugin name with mixed case alphanumeric characters', () => {
    expect(isValidPluginName('MyPluginName')).to.be.true;
    expect(isValidPluginName('my-Plugin-Name')).to.be.true;
  });

  // Invalid cases
  it('1.8.3.6 should return false for an empty string', () => {
    expect(isValidPluginName('')).to.be.false;
  });

  it('1.8.3.7 should return false for null input', () => {
    expect(isValidPluginName(null)).to.be.false;
  });

  it('1.8.3.8 should return false for undefined input', () => {
    expect(isValidPluginName(undefined)).to.be.false;
  });

  it('1.8.3.9 should return false for non-string input (e.g., number)', () => {
    expect(isValidPluginName(123)).to.be.false;
  });

  it('1.8.3.10 should return false for plugin names with leading hyphens', () => {
    expect(isValidPluginName('-my-plugin')).to.be.false;
  });

  it('1.8.3.11 should return false for plugin names with trailing hyphens', () => {
    expect(isValidPluginName('my-plugin-')).to.be.false;
  });

  it('1.8.3.12 should return false for plugin names with consecutive hyphens', () => {
    expect(isValidPluginName('my--plugin')).to.be.false;
  });

  it('1.8.3.13 should return false for plugin names with special characters (other than hyphen)', () => {
    expect(isValidPluginName('my_plugin')).to.be.false; // Underscore not allowed
    expect(isValidPluginName('my!plugin')).to.be.false;
    expect(isValidPluginName('my.plugin')).to.be.false;
  });

  it('1.8.3.14 should return false for plugin names that do not start with alphanumeric characters', () => {
    expect(isValidPluginName('@plugin')).to.be.false;
  });

  it('1.8.3.15 should return false for plugin names that do not end with alphanumeric characters', () => {
    expect(isValidPluginName('plugin@')).to.be.false;
  });

  it('1.8.3.16 should return false for plugin names with spaces', () => {
    expect(isValidPluginName('my plugin')).to.be.false;
  });
});
