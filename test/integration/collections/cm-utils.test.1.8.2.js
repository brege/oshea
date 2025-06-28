// test/integration/collections/cm-utils.test.1.8.2.js

const { expect } = require('chai');
const { toPascalCase } = require('../../../src/collections/cm-utils');

describe('L1C8.2: toPascalCase - String Conversion', () => {
  it('1.8.2.1 should convert a hyphenated string to PascalCase', () => {
    const input = 'my-plugin-name';
    expect(toPascalCase(input)).to.equal('MyPluginName');
  });

  it('1.8.2.2 should handle single word strings', () => {
    const input = 'plugin';
    expect(toPascalCase(input)).to.equal('Plugin');
  });

  it('1.8.2.3 should handle empty string input', () => {
    const input = '';
    expect(toPascalCase(input)).to.equal('');
  });

  it('1.8.2.4 should handle null input', () => {
    const input = null;
    expect(toPascalCase(input)).to.equal('');
  });

  it('1.8.2.5 should handle undefined input', () => {
    const input = undefined;
    expect(toPascalCase(input)).to.equal('');
  });

  it('1.8.2.6 should handle strings with multiple consecutive hyphens by treating them as single delimiters', () => {
    const input = 'another--plugin---name';
    expect(toPascalCase(input)).to.equal('AnotherPluginName');
  });

  it('1.8.2.7 should handle strings with leading hyphens', () => {
    const input = '-leading-hyphen';
    expect(toPascalCase(input)).to.equal('LeadingHyphen');
  });

  it('1.8.2.8 should handle strings with trailing hyphens', () => {
    const input = 'trailing-hyphen-';
    expect(toPascalCase(input)).to.equal('TrailingHyphen');
  });

  it('1.8.2.9 should handle strings that start with a capital letter but have hyphens', () => {
    const input = 'My-plugin-name';
    expect(toPascalCase(input)).to.equal('MyPluginName');
  });

  it('1.8.2.10 should handle strings with numbers and hyphens', () => {
    const input = 'plugin-v1-0-2';
    expect(toPascalCase(input)).to.equal('PluginV102');
  });
});

