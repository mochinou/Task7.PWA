import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Tiny build-time helper for the hand-written Service Worker (pwa/service-worker.js).
 *
 * After Vite finishes writing `dist/`, this plugin:
 *  1. Collects every file of the application shell (hashed JS/CSS bundles, index.html,
 *     offline.html, manifest.json, icons) into a precache manifest.
 *  2. Derives a cache version from the content hash of those files + the SW source,
 *     so every deploy with changed code produces a byte-different sw.js. The browser
 *     detects that difference and installs the new worker (update flow).
 *  3. Writes dist/sw.js with the manifest, version and API base URL injected.
 *  4. Copies index.html -> 404.html so GitHub Pages serves the SPA for deep links.
 */

const EXCLUDED_FROM_PRECACHE = [
  /^sw\.js$/,
  /^404\.html$/,
  /\.map$/,
  /^screenshots\//, // only used by the browser install dialog
  /^_redirects$/,
  /^\.nojekyll$/,
];

function walk(dir, root = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(absolute, root);
    return [path.relative(root, absolute).split(path.sep).join('/')];
  });
}

export function serviceWorkerPlugin({ swSrc, apiBaseUrl }) {
  let config;

  return {
    name: 'novastore-service-worker',
    apply: 'build',

    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },

    closeBundle: {
      sequential: true,
      order: 'post',
      handler() {
        const outDir = path.resolve(config.root, config.build.outDir);
        const indexHtml = path.join(outDir, 'index.html');
        if (!fs.existsSync(indexHtml)) return;

        // GitHub Pages SPA fallback: unknown paths (e.g. /products/5 on first load)
        // receive 404.html, which is the same app shell.
        fs.copyFileSync(indexHtml, path.join(outDir, '404.html'));
        fs.writeFileSync(path.join(outDir, '.nojekyll'), '');

        const swTemplate = fs.readFileSync(path.resolve(config.root, swSrc), 'utf8');

        const precacheFiles = walk(outDir)
          .filter((file) => !EXCLUDED_FROM_PRECACHE.some((pattern) => pattern.test(file)))
          .sort();

        const hash = createHash('sha256');
        hash.update(swTemplate);
        hash.update(apiBaseUrl);
        for (const file of precacheFiles) {
          hash.update(file);
          hash.update(fs.readFileSync(path.join(outDir, file)));
        }
        const version = hash.digest('hex').slice(0, 12);

        const output = swTemplate
          .replace(
            'const PRECACHE_FILES = self.__PRECACHE_MANIFEST__;',
            `const PRECACHE_FILES = ${JSON.stringify(precacheFiles, null, 2)};`
          )
          .replace("const CACHE_VERSION = '__CACHE_VERSION__';", `const CACHE_VERSION = '${version}';`)
          .replace("const API_BASE_URL = '__API_BASE_URL__';", `const API_BASE_URL = '${apiBaseUrl}';`);

        if (/__(PRECACHE_MANIFEST|CACHE_VERSION|API_BASE_URL)__/.test(output)) {
          throw new Error('[pwa] Failed to inject build values into sw.js');
        }

        fs.writeFileSync(path.join(outDir, 'sw.js'), output);

        config.logger.info(
          `\n[pwa] sw.js generated — cache version ${version}, ${precacheFiles.length} precached files`
        );
      },
    },
  };
}
