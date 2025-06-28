// test/integration/collections-manager/cm-utils.test.1.8.1.js

const { expect } = require('chai');
const { deriveCollectionName } = require('../../../src/collections-manager/cm-utils');

describe('L1C8.1: deriveCollectionName - Basic Functionality and Edge Cases', () => {
  it('1.8.1.1 should correctly derive a sanitized name from a full Git URL', () => {
    const source = 'https://github.com/user/my-repo.git';
    expect(deriveCollectionName(source)).to.equal('my-repo');
  });

  it('1.8.1.2 should correctly derive a sanitized name from a local path with .git suffix', () => {
    const source = '/path/to/local/my-other-repo.git';
    expect(deriveCollectionName(source)).to.equal('my-other-repo');
  });

  it('1.8.1.3 should handle source URLs or paths without a .git suffix', () => {
    const source = 'https://example.com/project/awesome-library';
    expect(deriveCollectionName(source)).to.equal('awesome-library');
  });

  it('1.8.1.4 should replace non-alphanumeric characters (excluding hyphens and underscores) with hyphens', () => {
    const source = 'https://bitbucket.org/team/my_project!name.js';
    expect(deriveCollectionName(source)).to.equal('my_project-name-js');
  });

  it('1.8.1.5 should handle empty string input', () => {
    const source = '';
    expect(deriveCollectionName(source)).to.equal('');
  });

  it('1.8.1.6 should handle null input', () => {
    const source = null;
    expect(deriveCollectionName(source)).to.equal('');
  });

  it('1.8.1.7 should handle undefined input', () => {
    const source = undefined;
    expect(deriveCollectionName(source)).to.equal('');
  });

  it('1.8.1.8 should handle non-string input gracefully (e.g., number)', () => {
    const source = 12345;
    expect(deriveCollectionName(source)).to.equal('');
  });

  it('1.8.1.9 should handle non-string input gracefully (e.g., object)', () => {
    const source = { url: 'http://example.com/repo' };
    expect(deriveCollectionName(source)).to.equal('');
  });

  it('1.8.1.10 should collapse multiple consecutive non-alphanumeric characters into a single hyphen', () => {
    const source = 'https://gitlab.com/group/another---repo!!!project.git';
    expect(deriveCollectionName(source)).to.equal('another-repo-project');
  });

  it('1.8.1.11 should remove leading/trailing hyphens resulting from sanitization', () => {
    const source = 'https://github.com/user/-repo-with-leading-trailing-.git';
    expect(deriveCollectionName(source)).to.equal('repo-with-leading-trailing-');
  });
});
