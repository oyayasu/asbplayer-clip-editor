#!/usr/bin/env node
// Apply after apply_manual_ai_patch.mjs. No changes to the original Anki form.
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.argv[2]||'asbplayer');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const write=(p,s)=>fs.writeFileSync(path.join(root,p),s);
const replace=(s,a,b,label)=>{if(!s.includes(a))throw Error('JSON relay patch: '+label+' anchor not found');return s.replace(a,b);};
fs.mkdirSync(path.join(root,'extension/public/json-relay'),{recursive:true});
fs.copyFileSync('json-relay/content.js',path.join(root,'extension/public/json-relay/content.js'));
fs.copyFileSync('JsonRelayBackground.ts',path.join(root,'extension/src/services/json-relay-background.ts'));
{
 const f='extension/src/entrypoints/background.ts';
 let s=read(f);
 s="import { initJsonRelay } from '@/services/json-relay-background';\n"+s;
 s=replace(s,'export default defineBackground(() => {','export default defineBackground(() => {\n    initJsonRelay();','background initialization');
 write(f,s);
}
{
 const f='extension/wxt.config.ts';
 let s=read(f);
 s=replace(s,"let permissions = ['tabs', 'storage', 'unlimitedStorage'];","let permissions = ['tabs', 'storage', 'unlimitedStorage', 'scripting'];",'manifest permissions');
 s=replace(s,"        return {\n            ...manifest,\n            permissions,","        return {\n            ...manifest,\n            host_permissions: Array.from(new Set([...(manifest.host_permissions || []), 'https://chatgpt.com/*', 'https://chat.openai.com/*', 'https://gemini.google.com/*', 'https://claude.ai/*'])),\n            permissions,",'host permissions');
 write(f,s);
}
console.log('PASS: ASB JSON relay integrated into background, public assets and Chromium manifest.');
