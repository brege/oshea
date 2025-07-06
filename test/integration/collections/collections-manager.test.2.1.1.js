// test/integration/collections/collections-manager.test.2.1.1.js
const { collectionsIndexPath } = require('@paths');
const { expect } = require('chai');
const sinon = require('sinon');
const path = require('path');
const CollectionsManager = require(collectionsIndexPath);

// Test suite for Scenario 2.1.1
describe('CollectionsManager Constructor Path Initialization (2.1.1)', () => {

  const FAKE_HOMEDIR = '/fake/home';
  let mockDependencies;

  beforeEach(() => {
    // Create a fresh set of mock dependencies for each test
    mockDependencies = {
      process: {
        env: {} // Start with empty env
      },
      os: {
        platform: sinon.stub().returns('linux'), // Default to linux
        homedir: sinon.stub().returns(FAKE_HOMEDIR)
      },
      path: {
        // Use the real path.sep for consistency
        join: (...args) => args.join(path.sep)
      },
      // Add a no-op chalk mock to prevent console coloring issues
      chalk: {
        magenta: str => str,
        yellowBright: str => str,
      }
    };
  });

  it('should use XDG_DATA_HOME for collRoot if the environment variable is set', () => {
    // Arrange
    const fakeXdgHome = '/fake/xdg_data_home';
    mockDependencies.process.env.XDG_DATA_HOME = fakeXdgHome;
    const expectedPath = [fakeXdgHome, 'md-to-pdf', 'collections'].join(path.sep);

    // Act
    const manager = new CollectionsManager({}, mockDependencies);

    // Assert
    expect(manager.collRoot).to.equal(expectedPath);
  });

  it('should use the Linux/macOS default path when XDG_DATA_HOME is not set', () => {
    // Arrange
    mockDependencies.os.platform.returns('linux'); // Explicitly set for clarity
    const expectedPath = [FAKE_HOMEDIR, '.local', 'share', 'md-to-pdf', 'collections'].join(path.sep);

    // Act
    const manager = new CollectionsManager({}, mockDependencies);

    // Assert
    expect(manager.collRoot).to.equal(expectedPath);
  });

  it('should use the Windows default path when XDG_DATA_HOME is not set and platform is win32', () => {
    // Arrange
    mockDependencies.os.platform.returns('win32'); // Set platform to Windows
    const expectedPath = [FAKE_HOMEDIR, 'AppData', 'Local', 'md-to-pdf', 'collections'].join(path.sep);

    // Act
    const manager = new CollectionsManager({}, mockDependencies);

    // Assert
    expect(manager.collRoot).to.equal(expectedPath);
  });
});
