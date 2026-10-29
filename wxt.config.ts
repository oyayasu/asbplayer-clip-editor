import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    permissions: [
      'tabs',
      'storage',
      'unlimitedStorage',
      'tabCapture',
      'activeTab',
      'contextMenus',
      'sidePanel',
      'offscreen',
      'scripting' // <--- A permissão mágica para injetar o espião
    ],
    host_permissions: [
      'https://api.dictionaryapi.dev/*',
      'https://api.mymemory.translated.net/*',
      'https://en.wiktionary.org/*',
      'https://api.datamuse.com/*',
      'https://api.wiktapi.dev/*',
      'https://www.stands4.com/*',
      // Permissões para a IA:
      'https://chatgpt.com/*',
      'https://chat.openai.com/*',
      'https://claude.ai/*',
      'https://gemini.google.com/*'
    ]
  }
});
