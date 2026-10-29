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
      'scripting'
    ],
    host_permissions: [
      'https://api.dictionaryapi.dev/*',
      'https://api.mymemory.translated.net/*',
      'https://en.wiktionary.org/*',
      'https://api.datamuse.com/*',
      'https://api.wiktapi.dev/*',
      'https://www.stands4.com/*',
      'https://chatgpt.com/*',
      'https://chat.openai.com/*',
      'https://claude.ai/*',
      'https://gemini.google.com/*'
    ],
    web_accessible_resources: [
      {
        resources: [
          'popup-ui.html', 
          'content-scripts/ai-automation.js',
          'fonts/*',
          'chunks/*'
        ],
        matches: ['<all_urls>']
      }
    ]
  }
});
