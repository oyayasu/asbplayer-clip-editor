#!/usr/bin/env node
// Give the Firefox build its own name and Gecko add-on ID without replacing
// asbplayer's native browser-specific WXT manifest and permissions.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? 'asbplayer');
const variant = process.argv[3];
const variants = {
  main: {
    oldName: 'const extName = project.names.short;',
    name: 'asbplayer Fluency Firefox',
    id: 'asbplayer-fluency-firefox@oyayasu.github',
  },
  'ai-sibling-prototype': {
    oldName: "const extName = 'asbplayer AI Sister';",
    name: 'asbplayer AI Sister Firefox',
    id: 'asbplayer-ai-sister-firefox@oyayasu.github',
  },
};
if (!(variant in variants)) {
  throw new Error('Expected variant main or ai-sibling-prototype');
}
const file = path.join(root, 'extension', 'wxt.config.ts');
let source = fs.readFileSync(file, 'utf8');
function replaceOnce(before, after) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`Expected one instance of ${before}, found ${count}`);
  source = source.replace(before, after);
}
const { oldName, name, id } = variants[variant];
replaceOnce(oldName, `const extName = ${JSON.stringify(name)};`);
replaceOnce('id: project.extension.firefox.id,', `id: ${JSON.stringify(id)},`);
fs.writeFileSync(file, source);
console.log(`Firefox identity set: ${name} (${id})`);
