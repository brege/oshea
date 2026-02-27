// test/runners/integration/plugins/plugin-determiner.manifest.js
require('module-alias/register');
const { pluginDeterminerFactoryPath } = require('@paths');
const path = require('node:path');
const { setupTestFiles, assertCommonFileAndParsingInteractions } = require(
  pluginDeterminerFactoryPath,
);

module.exports = [
  {
    describe:
      '1.3.1: Should prioritize CLI plugin over front matter and local config',
    args: {
      markdownFile: undefined,
      plugin: 'cli-priority-plugin',
    },
    defaultPluginName: 'default',
    setup: async (args, mocks, constants) => {
      const fmPluginName = 'front-matter-plugin';
      const localCfgPluginName = 'local-config-plugin';

      args.markdownFile = constants.DUMMY_MARKDOWN_FILE_PATH;

      const fileContents = {
        markdown: `---
oshea_plugin: ${fmPluginName}
---
# Markdown Content`,
        localConfig: `plugin: ${localCfgPluginName}\nsomeOverride: value`,
      };
      const parsedContents = {
        fmData: { oshea_plugin: fmPluginName },
        parsedLocalConfig: {
          plugin: localCfgPluginName,
          someOverride: 'value',
        },
      };
      setupTestFiles(mocks, constants, fileContents, parsedContents);
    },
    assert: async (result, args, mocks, constants, expect, logs) => {
      expect(result.pluginSpec).to.equal(args.plugin);
      expect(result.source).to.equal('CLI option');
      expect(result.localConfigOverrides).to.deep.equal({
        someOverride: 'value',
      });
      assertCommonFileAndParsingInteractions(
        mocks,
        constants,
        args,
        true,
        true,
      );

      expect(logs.length).to.be.greaterThan(0);
    },
  },
  {
    describe:
      '1.3.2: Should prioritize front matter plugin over local config when no CLI arg',
    args: {
      markdownFile: undefined,
    },
    defaultPluginName: 'default',
    setup: async (args, mocks, constants) => {
      const fmPluginName = 'front-matter-plugin-from-doc';
      const localCfgPluginName = 'local-config-plugin-from-file';

      args.markdownFile = constants.DUMMY_MARKDOWN_FILE_PATH;

      const fileContents = {
        markdown: `---
oshea_plugin: ${fmPluginName}
---
# Markdown Content for FM`,
        localConfig: `plugin: ${localCfgPluginName}\nanotherOverride: someValue`,
      };
      const parsedContents = {
        fmData: { oshea_plugin: fmPluginName },
        markdownContent: '# Markdown Content for FM',
        parsedLocalConfig: {
          plugin: localCfgPluginName,
          anotherOverride: 'someValue',
        },
      };

      setupTestFiles(mocks, constants, fileContents, parsedContents);
    },
    assert: async (result, args, mocks, constants, expect, logs) => {
      const fmPluginName = 'front-matter-plugin-from-doc';
      expect(result.pluginSpec).to.equal(fmPluginName);
      expect(result.source).to.equal(
        `front matter in '${constants.DUMMY_MARKDOWN_FILENAME}'`,
      );
      expect(result.localConfigOverrides).to.deep.equal({
        anotherOverride: 'someValue',
      });

      assertCommonFileAndParsingInteractions(
        mocks,
        constants,
        args,
        true,
        true,
      );

      expect(logs.length).to.be.greaterThan(0);
    },
  },
  {
    describe:
      '1.3.3: Should prioritize local config plugin when no CLI or front matter plugin is present',
    skip: true,
    args: {
      markdownFile: undefined,
    },
    defaultPluginName: 'default',
    setup: async (args, mocks, constants) => {
      const localCfgPluginName = 'local-config-only-plugin';

      args.markdownFile = constants.DUMMY_MARKDOWN_FILE_PATH;

      const fileContents = {
        markdown: '# Just Markdown Content',
        localConfig: `plugin: ${localCfgPluginName}\nanotherSetting: anotherValue`,
      };
      const parsedContents = {
        fmData: {},
        parsedLocalConfig: {
          plugin: localCfgPluginName,
          anotherSetting: 'anotherValue',
        },
      };
      setupTestFiles(mocks, constants, fileContents, parsedContents);
    },
    assert: async (result, args, mocks, constants, expect, logs) => {
      expect(result.pluginSpec).to.equal('local-config-only-plugin');
      expect(result.source).to.equal(
        `local '${constants.DUMMY_LOCAL_CONFIG_FILE_PATH.split('/').pop()}'`,
      );
      expect(result.localConfigOverrides).to.deep.equal({
        anotherSetting: 'anotherValue',
      });
      assertCommonFileAndParsingInteractions(
        mocks,
        constants,
        args,
        true,
        true,
      );

      expect(logs.length).to.be.greaterThan(0);
    },
  },
  {
    describe:
      '1.3.4: Should return the default plugin when no plugin is specified anywhere',
    args: {
      markdownFile: undefined,
    },
    defaultPluginName: 'default',
    setup: async (args, mocks, constants) => {
      args.markdownFile = constants.DUMMY_MARKDOWN_FILE_PATH;

      const fileContents = {
        markdown: `---
some_other_key: some_value
---
# Markdown Content`,
        localConfig: 'someOtherConfig: true',
      };
      const parsedContents = {
        fmData: { some_other_key: 'some_value' },
        parsedLocalConfig: { someOtherConfig: true },
      };
      setupTestFiles(mocks, constants, fileContents, parsedContents);
    },
    assert: async (result, args, mocks, constants, expect, logs) => {
      expect(result.pluginSpec).to.equal('default');
      expect(result.source).to.equal('default');
      expect(result.localConfigOverrides).to.deep.equal({
        someOtherConfig: true,
      });
      assertCommonFileAndParsingInteractions(
        mocks,
        constants,
        args,
        true,
        true,
      );

      expect(logs.length).to.be.greaterThan(0);
    },
  },
  {
    describe:
      '1.3.5: Should extract localConfigOverrides from local config file, excluding the plugin field',
    skip: true,
    args: {
      markdownFile: undefined,
    },
    defaultPluginName: 'default',
    setup: async (args, mocks, constants) => {
      const localCfgPluginName = 'plugin-with-overrides';

      args.markdownFile = constants.DUMMY_MARKDOWN_FILE_PATH;

      const fileContents = {
        markdown: `---
some_other_fm_key: fm_value
---
# Markdown Content`,
        localConfig: `plugin: ${localCfgPluginName}\nheader: true\nfooter: false\nmargin:\n  top: 1in\n  bottom: 0.5in\n  left: 0.75in`,
      };
      const parsedContents = {
        fmData: { some_other_fm_key: 'fm_value' },
        parsedLocalConfig: {
          plugin: localCfgPluginName,
          header: true,
          footer: false,
          margin: { top: '1in', bottom: '0.5in', left: '0.75in' },
        },
      };
      setupTestFiles(mocks, constants, fileContents, parsedContents);
    },
    assert: async (result, args, mocks, constants, expect, logs) => {
      expect(result.pluginSpec).to.equal('plugin-with-overrides');
      expect(result.source).to.equal(
        `local '${constants.DUMMY_LOCAL_CONFIG_FILE_PATH.split('/').pop()}'`,
      );
      expect(result.localConfigOverrides).to.deep.equal({
        header: true,
        footer: false,
        margin: { top: '1in', bottom: '0.5in', left: '0.75in' },
      });
      assertCommonFileAndParsingInteractions(
        mocks,
        constants,
        args,
        true,
        true,
      );

      expect(logs.length).to.be.greaterThan(0);
    },
  },
  {
    describe:
      '1.3.15: Should use default plugin when only local config plugin is present',
    args: {
      markdownFile: undefined,
    },
    defaultPluginName: 'default',
    setup: async (args, mocks, constants) => {
      const localCfgPluginName = 'local-config-only-plugin';

      args.markdownFile = constants.DUMMY_MARKDOWN_FILE_PATH;

      const fileContents = {
        markdown: '# Just Markdown Content',
        localConfig: `plugin: ${localCfgPluginName}\nanotherSetting: anotherValue`,
      };
      const parsedContents = {
        fmData: {},
        parsedLocalConfig: {
          plugin: localCfgPluginName,
          anotherSetting: 'anotherValue',
        },
      };
      setupTestFiles(mocks, constants, fileContents, parsedContents);
    },
    assert: async (result, args, mocks, constants, expect, logs) => {
      expect(result.pluginSpec).to.equal('default');
      expect(result.source).to.equal('default');
      expect(result.localConfigOverrides).to.deep.equal({
        anotherSetting: 'anotherValue',
      });
      assertCommonFileAndParsingInteractions(
        mocks,
        constants,
        args,
        true,
        true,
      );
      expect(logs.length).to.be.greaterThan(0);
    },
  },
  {
    describe:
      '1.3.16: Should extract localConfigOverrides while ignoring local plugin field for selection',
    args: {
      markdownFile: undefined,
    },
    defaultPluginName: 'default',
    setup: async (args, mocks, constants) => {
      const localCfgPluginName = 'plugin-with-overrides';

      args.markdownFile = constants.DUMMY_MARKDOWN_FILE_PATH;

      const fileContents = {
        markdown: `---
some_other_fm_key: fm_value
---
# Markdown Content`,
        localConfig: `plugin: ${localCfgPluginName}\nheader: true\nfooter: false\nmargin:\n  top: 1in\n  bottom: 0.5in\n  left: 0.75in`,
      };
      const parsedContents = {
        fmData: { some_other_fm_key: 'fm_value' },
        parsedLocalConfig: {
          plugin: localCfgPluginName,
          header: true,
          footer: false,
          margin: { top: '1in', bottom: '0.5in', left: '0.75in' },
        },
      };
      setupTestFiles(mocks, constants, fileContents, parsedContents);
    },
    assert: async (result, args, mocks, constants, expect, logs) => {
      expect(result.pluginSpec).to.equal('default');
      expect(result.source).to.equal('default');
      expect(result.localConfigOverrides).to.deep.equal({
        header: true,
        footer: false,
        margin: { top: '1in', bottom: '0.5in', left: '0.75in' },
      });
      assertCommonFileAndParsingInteractions(
        mocks,
        constants,
        args,
        true,
        true,
      );
      expect(logs.length).to.be.greaterThan(0);
    },
  },
  {
    describe:
      '1.3.6: Should default to defaultPluginName when markdown file does not exist',
    args: {
      markdownFile: undefined,
    },
    defaultPluginName: 'default',
    setup: async (args, mocks, constants) => {
      args.markdownFile = path.join(
        constants.DUMMY_MARKDOWN_FILE_PATH.replace(
          'my-document.md',
          'non-existent-document.md',
        ),
      );

      setupTestFiles(mocks, constants, {
        markdownContent: undefined,
        localConfigContent: undefined,
      });

      mocks.mockFsSync.existsSync.withArgs(args.markdownFile).returns(false);
    },
    assert: async (result, args, mocks, constants, expect, logs) => {
      expect(result.pluginSpec).to.equal('default');
      expect(result.source).to.equal('default');
      expect(result.localConfigOverrides).to.be.null;

      expect(mocks.mockFsSync.existsSync.calledWith(args.markdownFile)).to.be
        .true;
      expect(
        mocks.mockFsSync.existsSync.calledWith(
          constants.DUMMY_LOCAL_CONFIG_FILE_PATH,
        ),
      ).to.be.false;

      expect(mocks.mockFsPromises.readFile.called).to.be.false;
      expect(mocks.mockMarkdownUtils.extractFrontMatter.called).to.be.false;
      expect(mocks.mockYaml.load.called).to.be.false;

      expect(logs.length).to.be.greaterThan(0);
    },
  },
  {
    describe:
      '1.3.7: Should handle malformed front matter gracefully and default to defaultPluginName',
    args: {
      markdownFile: undefined,
    },
    defaultPluginName: 'default',
    setup: async (args, mocks, constants) => {
      const MALFORMED_FM_ERROR_MESSAGE =
        'Malformed front matter: YAML parsing failed';
      args.markdownFile = constants.DUMMY_MARKDOWN_FILE_PATH;

      const fileContents = {
        markdown: `---
  bad: yaml: format
---
# Markdown Content`,
        localConfig: undefined,
      };
      const parsedContents = {
        fmData: {},
        parsedLocalConfig: undefined,
      };

      setupTestFiles(mocks, constants, fileContents, parsedContents);
      mocks.mockMarkdownUtils.extractFrontMatter
        .withArgs(fileContents.markdown)
        .throws(new Error(MALFORMED_FM_ERROR_MESSAGE));
    },
    assert: async (result, _args, mocks, constants, expect, logs) => {
      expect(result.pluginSpec).to.equal('default');
      expect(result.source).to.equal('default');
      expect(result.localConfigOverrides).to.be.null;

      expect(
        mocks.mockFsSync.existsSync.calledWith(
          constants.DUMMY_MARKDOWN_FILE_PATH,
        ),
      ).to.be.true;
      expect(
        mocks.mockFsSync.existsSync.calledWith(
          constants.DUMMY_LOCAL_CONFIG_FILE_PATH,
        ),
      ).to.be.true;

      expect(
        mocks.mockFsPromises.readFile.calledWith(
          constants.DUMMY_MARKDOWN_FILE_PATH,
          'utf8',
        ),
      ).to.be.true;
      expect(mocks.mockMarkdownUtils.extractFrontMatter.calledOnce).to.be.true;

      expect(
        mocks.mockFsPromises.readFile.calledWith(
          constants.DUMMY_LOCAL_CONFIG_FILE_PATH,
          'utf8',
        ),
      ).to.be.false;
      expect(mocks.mockYaml.load.called).to.be.false;

      expect(logs.length).to.be.greaterThan(0);
    },
  },
  {
    describe:
      '1.3.8: Should handle malformed local config gracefully and default to defaultPluginName',
    args: {
      markdownFile: undefined,
    },
    defaultPluginName: 'default',
    setup: async (args, mocks, constants) => {
      const MALFORMED_LOCAL_CONFIG_ERROR_MESSAGE =
        'Malformed YAML in local config';
      args.markdownFile = constants.DUMMY_MARKDOWN_FILE_PATH;

      const fileContents = {
        markdown: `---
some_other_key: some_value
---
# Markdown Content`,
        localConfig: 'bad: [yaml',
      };
      const parsedContents = {
        fmData: { some_other_key: 'some_value' },
        parsedLocalConfig: {},
      };

      setupTestFiles(mocks, constants, fileContents, parsedContents);
      mocks.mockYaml.load
        .withArgs(fileContents.localConfig)
        .throws(new Error(MALFORMED_LOCAL_CONFIG_ERROR_MESSAGE));
    },
    assert: async (result, _args, mocks, constants, expect, logs) => {
      expect(result.pluginSpec).to.equal('default');
      expect(result.source).to.equal('default');
      expect(result.localConfigOverrides).to.be.null;

      expect(
        mocks.mockFsSync.existsSync.calledWith(
          constants.DUMMY_MARKDOWN_FILE_PATH,
        ),
      ).to.be.true;
      expect(
        mocks.mockFsSync.existsSync.calledWith(
          constants.DUMMY_LOCAL_CONFIG_FILE_PATH,
        ),
      ).to.be.true;

      expect(
        mocks.mockFsPromises.readFile.calledWith(
          constants.DUMMY_MARKDOWN_FILE_PATH,
          'utf8',
        ),
      ).to.be.true;
      expect(mocks.mockMarkdownUtils.extractFrontMatter.calledOnce).to.be.true;

      expect(
        mocks.mockFsPromises.readFile.calledWith(
          constants.DUMMY_LOCAL_CONFIG_FILE_PATH,
          'utf8',
        ),
      ).to.be.true;
      expect(mocks.mockYaml.load.calledOnce).to.be.true;

      expect(logs.length).to.be.greaterThan(0);
    },
  },
  {
    describe:
      '1.3.9: Should self-activate a plugin name from front matter to a path within its subdirectory',
    args: {
      markdownFile: undefined,
    },
    defaultPluginName: 'default',
    setup: async (args, mocks, constants) => {
      const pluginName = 'my-custom-plugin';
      args.markdownFile = constants.DUMMY_MARKDOWN_FILE_PATH;

      const fileContents = {
        markdown: `---
oshea_plugin: ${pluginName}
---
# Markdown Content`,
        localConfig: undefined,
      };
      const parsedContents = {
        fmData: { oshea_plugin: pluginName },
      };
      setupTestFiles(mocks, constants, fileContents, parsedContents);

      const expectedSubdirPath = path.join(
        path.dirname(constants.DUMMY_MARKDOWN_FILE_PATH),
        pluginName,
        `default.yaml`,
      );
      mocks.mockFsSync.existsSync.withArgs(expectedSubdirPath).returns(true);
      mocks.mockFsSync.statSync
        .withArgs(expectedSubdirPath)
        .returns({ isFile: () => true });
    },
    assert: async (result, args, mocks, constants, expect, logs) => {
      const pluginName = 'my-custom-plugin';
      const expectedSubdirPath = path.join(
        path.dirname(constants.DUMMY_MARKDOWN_FILE_PATH),
        pluginName,
        `default.yaml`,
      );

      expect(result.pluginSpec).to.equal(expectedSubdirPath);
      expect(result.source).to.match(
        new RegExp(
          `front matter in '${constants.DUMMY_MARKDOWN_FILENAME}' \\(self-activated via dir path\\)`,
        ),
      );
      expect(result.localConfigOverrides).to.be.null;

      assertCommonFileAndParsingInteractions(
        mocks,
        constants,
        args,
        true,
        false,
      );

      expect(mocks.mockFsSync.existsSync.calledWith(expectedSubdirPath)).to.be
        .true;
      expect(mocks.mockFsSync.statSync.calledWith(expectedSubdirPath)).to.be
        .true;

      expect(logs.length).to.be.greaterThan(0);
    },
  },
  {
    describe:
      '1.3.10: Should self-activate a plugin name from front matter to a path directly in the markdown directory',
    args: {
      markdownFile: undefined,
    },
    defaultPluginName: 'default',
    setup: async (args, mocks, constants) => {
      const pluginName = 'direct-plugin';
      args.markdownFile = constants.DUMMY_MARKDOWN_FILE_PATH;

      const fileContents = {
        markdown: `---
oshea_plugin: ${pluginName}
---
# Markdown Content`,
        localConfig: undefined,
      };
      const parsedContents = {
        fmData: { oshea_plugin: pluginName },
      };
      setupTestFiles(mocks, constants, fileContents, parsedContents);

      const expectedSubdirPath = path.join(
        path.dirname(constants.DUMMY_MARKDOWN_FILE_PATH),
        pluginName,
        `default.yaml`,
      );
      const expectedDirectPath = path.join(
        path.dirname(constants.DUMMY_MARKDOWN_FILE_PATH),
        `default.yaml`,
      );

      mocks.mockFsSync.existsSync.withArgs(expectedSubdirPath).returns(false);
      mocks.mockFsSync.existsSync.withArgs(expectedDirectPath).returns(true);
      mocks.mockFsSync.statSync
        .withArgs(expectedDirectPath)
        .returns({ isFile: () => true });
    },
    assert: async (result, args, mocks, constants, expect, logs) => {
      const pluginName = 'direct-plugin';
      const expectedSubdirPath = path.join(
        path.dirname(constants.DUMMY_MARKDOWN_FILE_PATH),
        pluginName,
        `default.yaml`,
      );
      const expectedDirectPath = path.join(
        path.dirname(constants.DUMMY_MARKDOWN_FILE_PATH),
        `default.yaml`,
      );

      expect(result.pluginSpec).to.equal(expectedDirectPath);
      expect(result.source).to.match(
        new RegExp(
          `front matter in '${constants.DUMMY_MARKDOWN_FILENAME}' \\(self-activated via direct path\\)`,
        ),
      );
      expect(result.localConfigOverrides).to.be.null;

      assertCommonFileAndParsingInteractions(
        mocks,
        constants,
        args,
        true,
        false,
      );
      expect(mocks.mockFsSync.existsSync.calledWith(expectedSubdirPath)).to.be
        .true;
      expect(mocks.mockFsSync.existsSync.calledWith(expectedDirectPath)).to.be
        .true;
      expect(mocks.mockFsSync.statSync.calledWith(expectedDirectPath)).to.be
        .true;

      expect(logs.length).to.be.greaterThan(0);
    },
  },
  {
    describe:
      '1.3.11: Should retain original plugin name from front matter if self-activation paths are not found',
    args: {
      markdownFile: undefined,
    },
    defaultPluginName: 'default',
    setup: async (args, mocks, constants) => {
      const pluginName = 'non-existent-plugin-name';
      args.markdownFile = constants.DUMMY_MARKDOWN_FILE_PATH;

      const fileContents = {
        markdown: `---
oshea_plugin: ${pluginName}
---
# Markdown Content`,
        localConfig: undefined,
      };
      const parsedContents = {
        fmData: { oshea_plugin: pluginName },
      };
      setupTestFiles(mocks, constants, fileContents, parsedContents);

      const expectedSubdirPath = path.join(
        path.dirname(constants.DUMMY_MARKDOWN_FILE_PATH),
        pluginName,
        `default.yaml`,
      );
      const expectedDirectPath = path.join(
        path.dirname(constants.DUMMY_MARKDOWN_FILE_PATH),
        `default.yaml`,
      );
      mocks.mockFsSync.existsSync.withArgs(expectedSubdirPath).returns(false);
      mocks.mockFsSync.existsSync.withArgs(expectedDirectPath).returns(false);
    },
    assert: async (result, args, mocks, constants, expect, logs) => {
      const pluginName = 'non-existent-plugin-name';
      const expectedSubdirPath = path.join(
        path.dirname(constants.DUMMY_MARKDOWN_FILE_PATH),
        pluginName,
        `default.yaml`,
      );
      const expectedDirectPath = path.join(
        path.dirname(constants.DUMMY_MARKDOWN_FILE_PATH),
        `default.yaml`,
      );

      expect(result.pluginSpec).to.equal(pluginName);
      expect(result.source).to.equal(
        `front matter in '${constants.DUMMY_MARKDOWN_FILENAME}'`,
      );
      expect(result.localConfigOverrides).to.be.null;

      assertCommonFileAndParsingInteractions(
        mocks,
        constants,
        args,
        true,
        false,
      );
      expect(mocks.mockFsSync.existsSync.calledWith(expectedSubdirPath)).to.be
        .true;
      expect(mocks.mockFsSync.existsSync.calledWith(expectedDirectPath)).to.be
        .true;

      expect(logs.length).to.be.greaterThan(0);
    },
  },
  {
    describe:
      '1.3.12: Should resolve a relative pluginSpec from front matter against the markdown file path',
    args: {
      markdownFile: undefined,
    },
    defaultPluginName: 'default',
    setup: async (args, mocks, constants) => {
      const relativePluginPath =
        './my-relative-plugin-dir/my-relative-plugin.config.yaml';
      args.markdownFile = constants.DUMMY_MARKDOWN_FILE_PATH;

      const fileContents = {
        markdown: `---
oshea_plugin: ${relativePluginPath}
---
# Markdown Content`,
        localConfig: undefined,
      };
      const parsedContents = {
        fmData: { oshea_plugin: relativePluginPath },
      };
      setupTestFiles(mocks, constants, fileContents, parsedContents);
    },
    assert: async (result, args, mocks, constants, expect, logs) => {
      const expectedResolvedPath = path.resolve(
        path.dirname(constants.DUMMY_MARKDOWN_FILE_PATH),
        './my-relative-plugin-dir/my-relative-plugin.config.yaml',
      );

      expect(result.pluginSpec).to.equal(expectedResolvedPath);
      expect(result.source).to.equal(
        `front matter in '${constants.DUMMY_MARKDOWN_FILENAME}' (resolved relative path)`,
      );
      expect(result.localConfigOverrides).to.be.null;

      assertCommonFileAndParsingInteractions(
        mocks,
        constants,
        args,
        true,
        false,
      );

      expect(logs.length).to.be.greaterThan(0);
    },
  },
  {
    describe:
      '1.3.13: Should resolve a relative pluginSpec from CLI against process.cwd() when markdownFile is not present',
    args: {
      plugin: './cli-relative-plugin',
      markdownFile: undefined,
    },
    defaultPluginName: 'default',
    setup: async (_args, mocks, constants) => {
      mocks.mockProcessCwd.returns('/mock/current/working/dir');
      setupTestFiles(mocks, constants, {
        markdownContent: undefined,
        localConfigContent: undefined,
      });
    },
    assert: async (result, args, mocks, constants, expect, logs) => {
      const expectedResolvedPath = path.resolve(
        '/mock/current/working/dir',
        'cli-relative-plugin',
      );

      expect(result.pluginSpec).to.equal(expectedResolvedPath);
      expect(result.source).to.equal('CLI option (resolved relative path)');
      expect(result.localConfigOverrides).to.be.null;

      assertCommonFileAndParsingInteractions(
        mocks,
        constants,
        args,
        false,
        false,
      );

      expect(logs.length).to.be.greaterThan(0);
    },
  },
  {
    describe:
      '1.3.14.1: Should log both override message and final determination when CLI overrides front matter',
    args: {
      markdownFile: undefined,
      plugin: 'cli-test-plugin',
    },
    defaultPluginName: 'default',
    setup: async (args, mocks, constants) => {
      const fmPluginName = 'fm-test-plugin';
      args.markdownFile = constants.DUMMY_MARKDOWN_FILE_PATH;

      const fileContents = {
        markdown: `---
oshea_plugin: ${fmPluginName}
---
# Content`,
        localConfig: undefined,
      };
      const parsedContents = {
        fmData: { oshea_plugin: fmPluginName },
      };
      setupTestFiles(mocks, constants, fileContents, parsedContents);
    },
    assert: async (result, args, mocks, constants, expect, logs) => {
      expect(result.pluginSpec).to.equal(args.plugin);
      expect(result.source).to.equal('CLI option');
      expect(result.localConfigOverrides).to.be.null;

      assertCommonFileAndParsingInteractions(
        mocks,
        constants,
        args,
        true,
        false,
      );

      expect(logs.length).to.be.greaterThan(0);
    },
  },
  {
    describe:
      '1.3.14.2: Should not log final determination if isLazyLoad and determinationSource is default (redundant)',
    args: {
      markdownFile: undefined,
      isLazyLoad: true,
    },
    defaultPluginName: 'default',
    setup: async (_args, mocks, constants) => {
      setupTestFiles(mocks, constants, {
        markdownContent: undefined,
        localConfigContent: undefined,
      });
    },
    assert: async (result, args, mocks, constants, expect, logs) => {
      expect(result.pluginSpec).to.equal('default');
      expect(result.source).to.equal('default');
      expect(result.localConfigOverrides).to.be.null;

      expect(logs.length).to.be.greaterThan(0);

      assertCommonFileAndParsingInteractions(
        mocks,
        constants,
        args,
        false,
        false,
      );
    },
  },
  {
    describe:
      '1.3.14.3: Should log final determination once when not lazy load and not default',
    args: {
      markdownFile: undefined,
      isLazyLoad: false,
    },
    defaultPluginName: 'default',
    setup: async (args, mocks, constants) => {
      const fmPluginName = 'fm-test-plugin';
      args.markdownFile = constants.DUMMY_MARKDOWN_FILE_PATH;

      const fileContents = {
        markdown: `---
oshea_plugin: ${fmPluginName}
---
# Content`,
        localConfig: undefined,
      };
      const parsedContents = {
        fmData: { oshea_plugin: fmPluginName },
      };
      setupTestFiles(mocks, constants, fileContents, parsedContents);
    },
    assert: async (result, args, mocks, constants, expect, logs) => {
      const fmPluginName = 'fm-test-plugin';

      expect(result.pluginSpec).to.equal(fmPluginName);
      expect(result.source).to.equal(
        `front matter in '${constants.DUMMY_MARKDOWN_FILENAME}'`,
      );
      expect(result.localConfigOverrides).to.be.null;

      assertCommonFileAndParsingInteractions(
        mocks,
        constants,
        args,
        true,
        false,
      );

      expect(logs.length).to.be.greaterThan(0);
    },
  },
];
