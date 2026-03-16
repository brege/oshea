// test/runners/integration/plugins/plugin-installer.test.js
require('module-alias/register');

const fs = require('node:fs');
const fsp = require('node:fs').promises;
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { expect } = require('chai');
const { pluginInstallerPath, projectRoot } = require('@paths');

const PluginInstaller = require(pluginInstallerPath);

function runGit(args, cwd) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: '0',
      GIT_CONFIG_GLOBAL: '/dev/null',
      GIT_CONFIG_SYSTEM: '/dev/null',
      GIT_AUTHOR_NAME: 'oshea-test',
      GIT_AUTHOR_EMAIL: 'oshea-test@example.com',
      GIT_COMMITTER_NAME: 'oshea-test',
      GIT_COMMITTER_EMAIL: 'oshea-test@example.com',
    },
  });

  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(' ')} failed in '${cwd}': ${result.stderr || result.stdout}`,
    );
  }

  return (result.stdout || '').trim();
}

function writePluginFiles(pluginDir, readmeText) {
  fs.writeFileSync(
    path.join(pluginDir, 'default.yaml'),
    'handler_script: index.js\n',
  );
  fs.writeFileSync(
    path.join(pluginDir, 'index.js'),
    'module.exports = class { async generate() { return null; } };',
  );
  fs.writeFileSync(path.join(pluginDir, 'README.md'), `${readmeText}\n`);
  fs.writeFileSync(path.join(pluginDir, 'example.md'), '# Example\n');
}

function commitInitialPlugin(repoPath, readmeText) {
  writePluginFiles(repoPath, readmeText);
  runGit(['init'], repoPath);
  runGit(
    [
      'update-index',
      '--add',
      'default.yaml',
      'index.js',
      'README.md',
      'example.md',
    ],
    repoPath,
  );
  runGit(['commit', '-m', 'initial plugin commit'], repoPath);
}

describe(`plugin-installer (Module Integration Tests) ${path.relative(projectRoot, pluginInstallerPath)}`, () => {
  let tempRoot;
  let pluginsRoot;
  let installer;

  beforeEach(async function () {
    if (this.sandbox?.restore) {
      this.sandbox.restore();
    }
    tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'plugin-installer-'));
    pluginsRoot = path.join(tempRoot, 'plugins-root');
    installer = new PluginInstaller({
      pluginsRootCliOverride: pluginsRoot,
    });
  });

  afterEach(async () => {
    await fsp.rm(tempRoot, { recursive: true, force: true });
  });

  it('1.9.1: should update an installed git-sourced plugin when origin changes', async () => {
    const sourceRepoPath = path.join(tempRoot, 'git-source.git');
    await fsp.mkdir(sourceRepoPath, { recursive: true });
    commitInitialPlugin(sourceRepoPath, 'version one');

    const addResult = await installer.addPlugin(sourceRepoPath, {
      name: 'git-source',
    });
    const installedReadmePath = path.join(addResult.path, 'README.md');

    fs.writeFileSync(path.join(sourceRepoPath, 'README.md'), 'version two\n');
    runGit(['commit', '-am', 'remote update'], sourceRepoPath);

    const updateResult = await installer.updatePlugin('git-source');
    expect(updateResult.success).to.equal(true);
    expect(fs.readFileSync(installedReadmePath, 'utf8')).to.contain(
      'version two',
    );

    const entry = await installer.getInstalledPlugin('git-source');
    expect(entry.updated_on).to.be.a('string');
  });

  it('1.9.0: should derive git plugin invoke name from source identity instead of temp clone dir', async () => {
    const sourceRepoPath = path.join(tempRoot, 'restaurant-menu.git');
    await fsp.mkdir(sourceRepoPath, { recursive: true });
    commitInitialPlugin(sourceRepoPath, 'menu-v1');

    const addResult = await installer.addPlugin(sourceRepoPath);
    expect(addResult.success).to.equal(true);
    expect(addResult.invoke_name).to.equal('restaurant-menu');
    expect(addResult.plugin_id).to.equal('restaurant-menu');
    expect(path.basename(addResult.path)).to.equal('restaurant-menu');
  });

  it('1.9.2: should abort git update when local changes exist in installed plugin copy', async () => {
    const sourceRepoPath = path.join(tempRoot, 'git-source-local-change.git');
    await fsp.mkdir(sourceRepoPath, { recursive: true });
    commitInitialPlugin(sourceRepoPath, 'base');

    const addResult = await installer.addPlugin(sourceRepoPath, {
      name: 'git-with-local-change',
    });

    fs.writeFileSync(path.join(addResult.path, 'README.md'), 'local edits\n');
    const updateResult = await installer.updatePlugin('git-with-local-change');

    expect(updateResult.success).to.equal(false);
    expect(updateResult.message).to.contain('local changes');
  });

  it('1.9.3: should update all git-sourced plugins and skip path-sourced plugins', async () => {
    const gitSourcePath = path.join(tempRoot, 'git-source-all.git');
    await fsp.mkdir(gitSourcePath, { recursive: true });
    commitInitialPlugin(gitSourcePath, 'git-v1');

    const localSourcePath = path.join(tempRoot, 'local-plugin');
    await fsp.mkdir(localSourcePath, { recursive: true });
    writePluginFiles(localSourcePath, 'local-v1');

    const gitAddResult = await installer.addPlugin(gitSourcePath, {
      name: 'git-source-all',
    });
    await installer.addPlugin(localSourcePath, {
      name: 'local-source-all',
    });

    fs.writeFileSync(path.join(gitSourcePath, 'README.md'), 'git-v2\n');
    runGit(['commit', '-am', 'git repo update'], gitSourcePath);

    const updateAllResult = await installer.updateAllPlugins();
    expect(updateAllResult.success).to.equal(true);
    expect(updateAllResult.updatedCount).to.equal(1);
    expect(updateAllResult.skippedCount).to.equal(1);
    expect(updateAllResult.messages).to.include(
      "Skipping 'local-source-all': not git-sourced.",
    );

    const installedReadmePath = path.join(gitAddResult.path, 'README.md');
    expect(fs.readFileSync(installedReadmePath, 'utf8')).to.contain('git-v2');
  });

  it('1.9.4: should treat git plugin update as idempotent when remote commit is unchanged', async () => {
    const sourceRepoPath = path.join(tempRoot, 'git-source-idempotent.git');
    await fsp.mkdir(sourceRepoPath, { recursive: true });
    commitInitialPlugin(sourceRepoPath, 'stable-v1');

    await installer.addPlugin(sourceRepoPath, {
      name: 'git-source-idempotent',
    });

    const beforeEntry = await installer.getInstalledPlugin(
      'git-source-idempotent',
    );
    expect(beforeEntry.updated_on).to.equal(undefined);

    const updateAllResult = await installer.updateAllPlugins();
    expect(updateAllResult.success).to.equal(true);
    expect(updateAllResult.updatedCount).to.equal(0);
    expect(updateAllResult.unchangedCount).to.equal(1);
    expect(updateAllResult.failedCount).to.equal(0);
    expect(updateAllResult.messages.join('\n')).to.contain(
      'already up to date',
    );

    const afterEntry = await installer.getInstalledPlugin(
      'git-source-idempotent',
    );
    expect(afterEntry.updated_on).to.equal(undefined);
  });
});
