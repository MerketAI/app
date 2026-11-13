/**
 * Builds a browser-loadable copy of the package, for the preview/export parity
 * test.
 *
 * The point of the parity test is that the preview runs *this* code, not a
 * reimplementation of it, so the bundle has to be produced from the same source
 * rather than hand-written for the browser. There is no bundler in this
 * repository, and adding one to satisfy a test would be a poor trade, so the
 * package is compiled a second time with classic JSX and wrapped in a minimal
 * CommonJS registry. React and React DOM come from their UMD builds and are
 * mapped onto globals.
 *
 * This is test infrastructure. Nothing ships it: the real preview is a Next.js
 * app that imports the package directly.
 */
import { execFileSync } from 'child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, resolve } from 'path';

const PKG_ROOT = resolve(__dirname, '..', '..', '..');
const OUT_DIR = join(PKG_ROOT, 'dist-browser');
const REPO_ROOT = resolve(PKG_ROOT, '..', '..');

let cached: string | null = null;

function compile(): void {
  const tsc = require.resolve('typescript/bin/tsc');
  execFileSync(process.execPath, [tsc, '-p', join(PKG_ROOT, 'tsconfig.browser.json')], {
    cwd: PKG_ROOT,
    stdio: 'pipe',
  });
}

function walk(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, found);
    else if (entry.endsWith('.js') || entry.endsWith('.json')) found.push(path);
  }
  return found;
}

/**
 * The CommonJS shim the registry runs under.
 *
 * Deliberately tiny: it resolves relative ids against the requiring module and
 * hands bare `react` / `react-dom` ids to the UMD globals. Anything else is an
 * error rather than a silent empty module, so a stray dependency shows up as a
 * failed test instead of a blank preview.
 */
const LOADER = String.raw`
(function () {
  var modules = window.__jasperModules;
  var cache = {};

  function normalise(parts) {
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      if (part === '' || part === '.') continue;
      if (part === '..') out.pop();
      else out.push(part);
    }
    return out.join('/');
  }

  function candidates(id, fromDir) {
    var base = id.charAt(0) === '.'
      ? normalise(fromDir.split('/').concat(id.split('/')))
      : normalise(id.split('/'));
    return [base, base + '.js', base + '/index', base + '/index.js'];
  }

  function req(id, fromDir) {
    if (id === 'react') return window.React;
    if (id === 'react-dom' || id === 'react-dom/client') return window.ReactDOM;

    var tried = candidates(id, fromDir || '');
    for (var i = 0; i < tried.length; i++) {
      var key = tried[i];
      if (!Object.prototype.hasOwnProperty.call(modules, key)) continue;
      if (cache[key]) return cache[key].exports;

      var module = { exports: {} };
      cache[key] = module;
      var dir = key.indexOf('/') === -1 ? '' : key.slice(0, key.lastIndexOf('/'));
      modules[key](module, module.exports, function (next) { return req(next, dir); });
      return module.exports;
    }

    throw new Error('Browser bundle has no module "' + id + '" (from "' + (fromDir || '.') + '")');
  }

  window.__jasperRequire = function (id) { return req(id, ''); };
})();
`;

/**
 * Compiles and returns the bundle source. Memoised: the compile is the slow
 * part, and every parity case wants the same output.
 */
export function buildBrowserBundle(): string {
  if (cached) return cached;

  compile();
  if (!existsSync(OUT_DIR)) {
    throw new Error(`Browser compile produced nothing at ${OUT_DIR}`);
  }

  const parts: string[] = ['window.__jasperModules = {};'];

  for (const file of walk(OUT_DIR)) {
    const key = relative(OUT_DIR, file).replace(/\\/g, '/');
    const source = readFileSync(file, 'utf-8');

    if (key.endsWith('.json')) {
      parts.push(
        `window.__jasperModules[${JSON.stringify(key)}] = function (module) { module.exports = ${source}; };`,
      );
      continue;
    }

    const id = key.replace(/\.js$/, '');
    parts.push(
      `window.__jasperModules[${JSON.stringify(id)}] = function (module, exports, require) {\n${source}\n};`,
    );
  }

  parts.push(LOADER);
  cached = parts.join('\n');
  return cached;
}

/** The React UMD builds, inlined so the preview page needs no network. */
export function reactSources(): { react: string; reactDom: string } {
  const read = (pkg: string, file: string) => {
    const path = join(REPO_ROOT, 'node_modules', pkg, 'umd', file);
    if (!existsSync(path)) {
      throw new Error(
        `Missing ${path}. The parity test mounts React from its UMD build; install dependencies at the repository root.`,
      );
    }
    return readFileSync(path, 'utf-8');
  };
  return {
    react: read('react', 'react.production.min.js'),
    reactDom: read('react-dom', 'react-dom.production.min.js'),
  };
}
