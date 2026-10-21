import terser from '@rollup/plugin-terser';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import { dts } from 'rollup-plugin-dts';
import { createRequire } from 'module';
import license from 'rollup-plugin-license';
import filesize from 'rollup-plugin-filesize';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

const input = 'src/HanziWriter.ts';
const extensions = ['.js', '.ts'];

export default [
  {
    input,
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
      // tsconfig.json rather than being transpiled down for older ones. Declarations are
      // bundled separately below.
      typescript({ declaration: false, declarationDir: undefined, noEmitOnError: true }),
      resolve({ extensions }),
      license({
        banner: `Hanzi Writer v<%= pkg.version %> | https://chanind.github.io/hanzi-writer`,
      }),
    ],
  },
  {
    // Bundles all the .d.ts files into the single file that package.json "types" points at
    input,
    output: { file: pkg.types, format: 'es' },
    plugins: [dts()],
  },
];
