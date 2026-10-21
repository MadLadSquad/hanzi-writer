import terser from '@rollup/plugin-terser';
import resolve from '@rollup/plugin-node-resolve';
import { createRequire } from 'module';
import license from 'rollup-plugin-license';
import filesize from 'rollup-plugin-filesize';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');
const ts = require('rollup-plugin-ts');

const extensions = ['.js', '.ts'];

export default [
  {
    input: 'src/HanziWriter.ts',
    output: [
      {
        file: pkg.main,
        format: 'cjs',
        sourcemap: true,
        exports: 'auto',
      },
      {
        file: 'dist/hanzi-writer.min.js',
        format: 'iife',
        name: 'HanziWriter',
        sourcemap: true,
        plugins: [terser()],
        exports: 'default',
      },
      {
        file: 'dist/hanzi-writer.js',
        format: 'iife',
        name: 'HanziWriter',
        exports: 'default',
      },
      {
        file: pkg.module,
        format: 'es',
        sourcemap: true,
        exports: 'default',
      },
    ],
    plugins: [
      filesize(),
      // Only modern browsers are supported, so the output is left at the ES2022 target set in
      // tsconfig.json rather than being transpiled down for older ones
      ts({ browserslist: false }),
      resolve({ extensions }),
      license({
        banner: `Hanzi Writer v<%= pkg.version %> | https://chanind.github.io/hanzi-writer`,
      }),
    ],
  },
];
