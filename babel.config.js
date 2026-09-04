module.exports = (api) => {
  const isTest = api.env('test');
  return {
    presets: [
      [
        '@babel/preset-env',
        {
          targets: isTest
            ? { node: 'current' }
            : {
                browsers: '>2%',
              },
          modules: isTest ? 'commonjs' : false,
        },
      ],
      '@babel/preset-typescript',
    ],
  };
};
