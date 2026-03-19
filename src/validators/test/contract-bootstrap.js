require('module-alias/register');

const { OSHEA_PROJECT_ROOT: projectRoot } = process.env;

if (!projectRoot) {
  throw new Error('OSHEA_PROJECT_ROOT is required for contract test bootstrap');
}

require('module-alias')(projectRoot);
