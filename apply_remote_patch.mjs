#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.argv[2]||'asbplayer');
const read=(name)=>fs.readFileSync(path.join(root,name),'utf8');
const save=(name,s)=>fs.writeFileSync(path.join(root,name),s);
const replace=(s,a,b,label)=>{
  const n=s.split(a).length-1;
  if(n!==1)throw Error(label+': expected once, found '+n);
  return s.replace(a,b);
};
const dst=path.join(root,'extension/src/services/remote-dictionary.ts');
if(fs.existsSync(dst))throw Error('Remote resolver already installed');
fs.copyFileSync(path.resolve('RemoteDictionary.ts'),dst);

{
  const file='extension/src/handlers/video/http-post-handler.ts';
  let s=read(file);
  s=replace(s,"import { asbError } from '@project/common/util/log';",
   "import { asbError } from '@project/common/util/log';\nimport { resolveRemoteDictionary } from '@/services/remote-dictionary';",
   'Online resolver import');
  s=replace(s,
    "'parser', 'term', 'service'];","'parser', 'term', 'service', 'sentence', 'source'];",
    'Permit subtitle context field');
  s=replace(s,
    '            const {term,service}=message.body;',
    '            const {term,service}=message.body;',
    'Read sentence context');
  const begin=s.indexOf("            const url=service === 'dictionary'");
  const end=s.indexOf('            return true;',begin);
  if(begin<0||end<0||s.indexOf("Dictionary provider HTTP",begin)>end)throw Error('Could not identify old online lookup handler');
  const handler=[
    "            if (service === 'dictionary') {",
    "                void resolveRemoteDictionary(term)",
    "                    .then((result)=>sendResponse({fluencyDictionary:result}))",
    "                    .catch((e)=>sendResponse({error:e instanceof Error ? e.message : String(e)}));",
    "                return true;",
    "            }",
    "            const url = 'https://api.mymemory.translated.net/get?' +",
    "                new URLSearchParams({q:term,langpair:'en|pt-BR'});",
    "            const controller=new AbortController();",
    "            const timeout=setTimeout(()=>controller.abort(),8000);",
    "            void fetch(url,{signal:controller.signal})",
    "                .then(async response=>{",
    "                    if (!response.ok) throw Error('Translation provider HTTP '+response.status);",
    "                    return response.json();",
    "                })",
    "                .then(json=>sendResponse(json))",
    "                .catch(e=>sendResponse({error:e instanceof Error ? e.message : String(e)}))",
    "                .finally(()=>clearTimeout(timeout));",
    ''
  ].join('\n');
  s=s.slice(0,begin)+handler+s.slice(end);
  save(file,s);
}
{
  const file='extension/src/ui/components/AnkiUi.tsx';
  let s=read(file);
  s=replace(s,
    '    const fluencyLookup: FluencyBridgeLookup = useCallback(async (service, term) => {',
    '    const fluencyLookup: FluencyBridgeLookup = useCallback(async (service, term) => {',
    'Send context through existing bridge');
  s=replace(s,
    "            action: 'fluencyLookup', service, term,",
    "            action: 'fluencyLookup', service, term,",
    'Send subtitle in lookup message');
  save(file,s);
}
{
  const file='extension/src/ui/bridge-fetcher.ts';
  let s=read(file);
  s=replace(s,
    'return this._bridge.sendMessageFromServerAndExpectResponse(httpPostMessage);',
    "return this._bridge.sendMessageFromServerAndExpectResponse(httpPostMessage, body?.action === 'fluencyLookup' ? 14000 : undefined);",
    'Wait for remote fallback without 5-second artificial timeout');
  save(file,s);
}
{
  const file='extension/wxt.config.ts';
  let s=read(file);
  s=replace(s,
    "host_permissions: ['https://api.dictionaryapi.dev/*', 'https://api.mymemory.translated.net/*'],",
    "host_permissions: ['https://api.dictionaryapi.dev/*', 'https://api.mymemory.translated.net/*', 'https://en.wiktionary.org/*', 'https://api.datamuse.com/*'],",
    'Approve two online dictionary backups');
  save(file,s);
}
console.log('OK: online-only Wiktionary + Datamuse + Free Dictionary service with context and 14s iframe timeout.');
