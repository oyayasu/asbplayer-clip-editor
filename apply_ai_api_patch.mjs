#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || 'asbplayer');
const read = relative => fs.readFileSync(path.join(root,relative), 'utf8');
const write = (relative, value) => fs.writeFileSync(path.join(root,relative), value);
const replaceOnce = (source, needle, replacement, label) => {
  const count = source.split(needle).length - 1;
  if (count !== 1) throw Error(label + ': expected exactly 1 anchor, found ' + count);
  return source.replace(needle, replacement);
};

// This fork consumes the fixed upstream asbplayer commit and installs overlays at build time.
// No content scripts, web page scraping, or externally loaded code are necessary for these APIs.
{
  const file = 'extension/src/entrypoints/background.ts';
  const code = fs.readFileSync(path.resolve('ai-api-background.fragment.ts'), 'utf8');
  const anchor = '    // Fluency lookups use strictly allowlisted destinations. No arbitrary URL proxy.';
  write(file, replaceOnce(read(file), anchor, code + '\n' + anchor, 'API background handler'));
}
{
  const file = 'extension/wxt.config.ts';
  const source = read(file);
  write(file, replaceOnce(source, "'https://www.stands4.com/*'",
    "'https://www.stands4.com/*', 'https://api.groq.com/*', 'https://generativelanguage.googleapis.com/*'",
    'API fixed host permissions'));
}
console.log('OK: GroqCloud and Google AI Studio JSON generation integrated into the AI Sister background.');
