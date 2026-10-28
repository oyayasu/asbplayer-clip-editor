#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.argv[2] || 'asbplayer');
const load=p=>fs.readFileSync(path.join(root,p),'utf8');
const save=(p,s)=>fs.writeFileSync(path.join(root,p),s);
const replace=(s,from,to,label)=>{
    const count=s.split(from).length-1;
    if(count!==1) throw Error(label+': expected one match, found '+count);
    return s.replace(from,to);
};

// The Anki UI lives in an about:blank iframe of the streaming page.
// Reuse the existing request bridge, which is already permitted to reach
// the AnkiConnect URL. The backend then fetches only fixed dictionary APIs.
{
    const file='common/components/AnkiDialog.tsx';
    let s=load(file);
    s=replace(s,
        "import type { AnkiSettings, Profile } from '@project/common/settings';",
        "import type { AnkiSettings, Profile } from '@project/common/settings';\nimport type { FluencyBridgeLookup } from '@project/common/components/FluencyLookupTransport';",
        'Bridge type import');
    s=replace(s,
        '    anki: Anki;',
        '    anki: Anki;\n    fluencyLookup?: FluencyBridgeLookup;',
        'Lookup prop declaration');
    s=replace(s,
        '    anki,\n    source:',
        '    anki,\n    fluencyLookup,\n    source:',
        'Lookup prop destructuring');
    s=replace(s,
        '                            <MultiVocabularyPanel\n                                word={word}',
        '                            <MultiVocabularyPanel\n                                fluencyLookup={fluencyLookup}\n                                word={word}',
        'Multi lookup');
    s=replace(s,
        '                            <SmartDefinitionPanel\n                                word={word}',
        '                            <SmartDefinitionPanel\n                                fluencyLookup={fluencyLookup}\n                                word={word}',
        'One-word lookup');
    save(file,s);
}
{
    const file='extension/src/ui/components/AnkiUi.tsx';
    let s=load(file);
    s=replace(s,
        "import { BridgeFetcher } from '@project/extension/src/ui/bridge-fetcher';",
        "import { BridgeFetcher } from '@project/extension/src/ui/bridge-fetcher';\nimport type { FluencyBridgeLookup } from '@project/common/components/FluencyLookupTransport';",
        'UI bridge type');
    const from='    const dialogStateRef = useRef<AnkiDialogState>(undefined);';
    const to=[
        '    const fluencyLookup: FluencyBridgeLookup = useCallback(async (service, term) => {',
        "        if (!anki) throw Error('AnkiConnect ainda não foi configurado.');",
        '        const response = await new BridgeFetcher(bridge).fetch(anki.ankiConnectUrl, {',
        "            action: 'fluencyLookup', service, term,",
        '        });',
        '        if (response?.error) throw Error(response.error);',
        '        return response;',
        '    }, [anki, bridge]);',
        '',
        from
    ].join('\n');
    s=replace(s,from,to,'Bridge lookup callback');
    s=replace(s,
        '                        anki={anki}\n                        onProceed={handleProceed}',
        '                        anki={anki}\n                        fluencyLookup={fluencyLookup}\n                        onProceed={handleProceed}',
        'Forward lookup callback');
    save(file,s);
}
{
    const file='extension/src/handlers/video/http-post-handler.ts';
    let s=load(file);
    s=replace(s,
        "const allowedKeys = ['version', 'action', 'params', 'key', 'text', 'scanLength', 'parser', 'term'];",
        "const allowedKeys = ['version', 'action', 'params', 'key', 'text', 'scanLength', 'parser', 'term', 'service'];",
        'Fixed service property');
    s=replace(s,
        "    'createDeck',",
        "    'createDeck',\n    'fluencyLookup',",
        'Whitelist restricted lookup action');
    const point="        fetch(message.url, {\n            method: 'POST',";
    const code=[
        "        if (message.body?.action === 'fluencyLookup') {",
        '            const {term,service}=message.body;',
        "            if (typeof term !== 'string' || !term.trim() || term.length > 160 ||",
        "                (service !== 'dictionary' && service !== 'translation')) {",
        "                sendResponse({error:'Invalid dictionary term or service'});",
        '                return true;',
        '            }',
        "            const url=service === 'dictionary'",
        "                ? 'https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(term)",
        "                : 'https://api.mymemory.translated.net/get?' + new URLSearchParams({q:term,langpair:'en|pt-BR'});",
        '            const controller=new AbortController();',
        '            const timeout=setTimeout(()=>controller.abort(),10000);',
        '            void fetch(url,{signal:controller.signal})',
        '                .then(async response=>{',
        "                    if (response.status === 404 && service === 'dictionary') return [];",
        "                    if (!response.ok) throw Error('Dictionary provider HTTP '+response.status);",
        '                    return response.json();',
        '                })',
        '                .then(json=>sendResponse(json))',
        "                .catch(e=>sendResponse({error:e instanceof Error ? e.message : String(e)}))",
        '                .finally(()=>clearTimeout(timeout));',
        '            return true;',
        '        }',
        '',
        point
    ].join('\n');
    s=replace(s,point,code,'Dictionary lookup in existing Anki bridge');
    save(file,s);
}
console.log('OK: streaming iframe communicates via existing Anki bridge to restricted dictionary APIs.');
