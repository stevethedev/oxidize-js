/*
 |------------------------------------------------------------------------------
 | Rollup Configuration File
 |------------------------------------------------------------------------------
 |
 | Rollup is a module bundler for JavaScript which compiles small pieces of
 | code into something larger and more complex. Rollup is being used instead
 | of Webpack because it has better tree-shaking capabilities that result in
 | smaller file-sizes and because Rollup is better optimized for building
 | JavaScript libraries (as opposed to applications).
 |
 */

/*
 |------------------------------------------------------------------------------
 | Rollup Plugin :: TypeScript
 |------------------------------------------------------------------------------
 |
 | This plugin allows Rollup to load and process TypeScript files in accordance
 | with the rules in their docs:
 |
 | * https://www.typescriptlang.org/docs/handbook/tsconfig-json.html
 |
 | * `typescript` is an optional setting that could be used to override the
 |   version of TypeScript to use for compilation.
 |   ```typescript({ typescript: require('some-fork-of-typescript') })```
 |
 | * `tslib` overrides the injected TypeScript helpers with a custom version.
 |   ```typescript({ tslib: require('some-fork-of-tslib') })```
 |
 | Note: In order to set TypeScript compiler options, they are passed into the
 | top-level of the configuration object as well:
 |
 | ```typescript({ lib: ['es5', 'es6', 'dom'], target: 'es5' })```
 | Two peer-requirements that are needed to make this plugin work properly are
 | the official Typescript package (`typescript`) and the `tslib` package.
 |
 */
import typescript from "rollup-plugin-typescript";
import tsCompiler from "typescript";
const cfgTypescript = { typescript: tsCompiler };

/*
 |------------------------------------------------------------------------------
 | Rollup Plugin :: Alias
 |------------------------------------------------------------------------------
 |
 | This plugin allows us to create our own attractive file-paths by replacing
 | certain patterns at compile-time. In this configuration file, I've set the
 | tilde character (`~`) to mean "the root of the `src` directory."
 |
 */
import path from "path";
import alias from "rollup-plugin-alias";
const cfgAlias = {
  resolve: [".ts", "/index.ts", ".js", "/index.js"],
  "~": path.join(__dirname, "src")
};

/*
 |------------------------------------------------------------------------------
 | Rollup Plugin :: Text Replace
 |------------------------------------------------------------------------------
 |
 | Sometimes, it's nice to be able to define behavior based on whether we are
 | running in debug or production modes. For example, logging and aggressive
 | error checking are things that come with a potentially significant runtime
 | cost that may not be necessary in production mode.
 |
 */
import replace from "rollup-plugin-replace";
import pkg from "./package.json";
const cfgReplace = {
  "process.env.NODE_ENV": JSON.stringify(process.env.BUILD),
  "process.env.BUILD": JSON.stringify(process.env.BUILD),
  "process.env.BUILD_TARGET": JSON.stringify(process.env.BUILD),
  "process.env.BUILD_VERSION": JSON.stringify(getBuildVersion())
};

console.log(
  `Build Version: ${cfgReplace["process.env.BUILD.process.env.BUILD_VERSION"]}`
);

function getBuildNumber() {
  if (process.env.BUILD_NUMBER) {
    return process.env.BUILD_NUMBER;
  }

  return pkg.version;
}

function getBuildSuffix() {
  if (process.env.BUILD === "development") return "-dev";
  if (process.env.BUILD === "testing") return "-test";
  return "";
}

function getBuildVersion() {
  return `${getBuildNumber()}${getBuildSuffix()}`;
}

/*
 |------------------------------------------------------------------------------
 | Rollup Plugin :: Uglify
 |------------------------------------------------------------------------------
 |
 | This is a plugin used to minify the generated code bundle and uses Uglify
 | under the hood. This is only intended for browser-targeted distributions.
 |
 */
import { uglify } from "rollup-plugin-uglify";
const cfgUglify = {};

/*
 |------------------------------------------------------------------------------
 | Rollup Configuration Export
 |------------------------------------------------------------------------------
 |
 | * `output.format` specifies the format of the generated bundle. This can be
 |   one of the following:
 |    - `amd` - Asynchronous Module Definition, used with module loaders like
 |      RequireJS and Dojo.
 |    - `cjs` - CommonJS, suitable for Node and other bundlers.
 |    - `esm` - ECMAScript Module, suitable for other bundlers and inclusion as
 |      a `<script type="module">` tag in modern browsers.
 |    - `iife` - Immediately Invoked Function Expression, suitable for
 |      inclusion as a `<script>` tag. If you are creating a bundle for an
 |      application, this is probably what you want.
 |    - `umd` - Universal Module Definition. This generally works as `amd`,
 |      `cjs`, and `iife` all in one. However, this can cause some trouble with
 |      automated build tools that analyzes code rather than executing it
 |      to evaluate the export.
 |    - `system` - Native format of the SystemJS loader.
 |
 */

function getOutput({ format, suffix, minify }) {
  return {
    name: "Oxidize",
    exports: "named",
    sourcemap: true,
    file: `./dist/oxidize${suffix ? `.${suffix}` : ""}${
      minify ? ".min" : ""
    }.js`,
    format
  };
}

function getPlugins({ typescript: ts, uglify: ug }) {
  const tsOpts = { ...cfgTypescript, ...(ts || {}) };
  const plugins = [alias(cfgAlias), typescript(tsOpts), replace(cfgReplace)];
  if (ug) {
    plugins.push(uglify(cfgUglify));
  }
  return plugins;
}

function getOptions(output = {}) {
  const plugins = {
    typescript: {}
  };
  if (output.target) {
    plugins.typescript.target = output.target;
  }
  if (output.uglify) {
    plugins.uglify = true;
  }

  return {
    input: "src/oxidize.ts",
    output: getOutput(output),
    plugins: getPlugins(plugins)
  };
}

export default [
  getOptions({ format: "umd" }),
  ...(process.env.BUILD === "production"
    ? [getOptions({ format: "umd", suffix: "min", uglify: true })]
    : []),

  getOptions({ format: "esm", suffix: "esm", target: "es6" }),
  getOptions({ format: "esm", suffix: "es5", target: "es5" }),
  getOptions({ format: "esm", suffix: "es6", target: "es6" }),
  getOptions({ format: "esm", suffix: "esnext", target: "esnext" })
];
