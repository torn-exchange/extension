import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'Torn Exchange Helper',
        namespace: 'te.helper',
        version: pkg.version,
        author: 'Ata [2507441]',
        description:
          'TornExchange Helper Script for traders - finish trades and create trade receipts on the fly',
        license: 'MIT',
        match: ['https://www.torn.com/trade.php*', 'https://www.torn.com/profiles.php*'],
        icon: 'https://www.google.com/s2/favicons?sz=64&domain=torn.com',
        'run-at': 'document-end',
        grant: ['GM_xmlhttpRequest', 'GM_addStyle', 'GM_setValue', 'GM_getValue'],
      },
      build: {
        fileName: 'te-helper.user.js',
      },
    }),
  ],
});
