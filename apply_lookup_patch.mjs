#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.argv[2] || 'asbplayer');
const patch=(file,needle,replacement,label)=>{
  const filename=path.join(root,file);
  const s=fs.readFileSync(filename,'utf8');
  const count=s.split(needle).length-1;
  if(count!==1)throw Error(label+': expected one match, found '+count);
  fs.writeFileSync(filename,s.replace(needle,replacement));
};
const target=path.join(root,'common/components/FluencyLookupTransport.ts');
if(fs.existsSync(target))throw Error('Already patched.');
fs.copyFileSync(path.resolve(process.cwd(),'FluencyLookupTransport.ts'),target);

const handler=[
  '    // Fluency lookups use strictly allowlisted destinations. No arbitrary URL proxy.',
  '    browser.runtime.onMessage.addListener((request, sender, sendResponse) => {',
  "        if (!request || request.command !== 'asbplayer-fluency-lookup') return undefined;",
  "        if (sender.id !== browser.runtime.id) { sendResponse({error:'Unauthorized sender'}); return true; }",
  "        const {service,term} = request as {service?:string,term?:string};",
  "        if ((service !== 'dictionary' && service !== 'translation') ||",
  "            typeof term !== 'string' || !term.trim() || term.length > 160)) {",
  "            sendResponse({error:'Invalid lookup term'}); return true;",
  '        }',
  "        const url = service === 'dictionary'",
  "            ? 'https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(term)",
  "            : 'https://api.mymemory.translated.net/get?' + new URLSearchParams({q:term,langpair:'en|pt-BR'});",
  '        const controller = new AbortController();',
  '        const timeout=setTimeout(()=>controller.abort(),10000);',
  '        void fetch(url,{signal:controller.signal})',
  '            .then(async response=> {',
  "                if (response.status === 404 && service === 'dictionary') return [];",
  "                if (!response.ok) throw Error(service + ': HTTP ' + response.status);",
  '                return response.json();',
  '            })',
  '            .then(data=>sendResponse({data}))',
  "            .catch(e=>sendResponse({error:e instanceof Error ? e.message : String(e)}))",
  '            .finally(()=>clearTimeout(timeout));',
  '        return true;',
  '    });',
  ''
].join('\n');

patch('extension/src/entrypoints/background.ts',
  '    void configureLogProvider(logProvider);',
  '    void configureLogProvider(logProvider);\n'+handler,
  'Background lookup handler');
console.log('OK: safe dictionary lookup from background, with fixed providers and 10s timeout.');
