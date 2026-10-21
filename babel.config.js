// Only used to run the tests under Jest. The published build is compiled by TypeScript
// (see rollup.config.mjs).
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' }, modules: 'commonjs' }],
    '@babel/preset-typescript',
  ],
};
