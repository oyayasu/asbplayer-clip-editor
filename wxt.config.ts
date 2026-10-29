import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    permissions: ['scripting', 'activeTab', 'tabs'],
    host_permissions: [
      'https://chatgpt.com/*',
      'https://chat.openai.com/*',
      'https://claude.ai/*',
      'https://gemini.google.com/*',
    ],
  },
});
