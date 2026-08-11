import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'Torn Exchange Helper',
        namespace: 'te.helper',
        version: '1.0.0',
        author: 'Ata [2507441]',
        description:
          'TornExchange Helper Script for traders - finish trades and create trade receipts on the fly',
        license: 'MIT',
        match: ['https://www.torn.com/trade.php*'],
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
