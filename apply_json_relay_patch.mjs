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
 const f='common/components/AnkiDialog.tsx';
 let s=read(f);
 s=replace(s,'    inTutorial?: boolean;\n}','    inTutorial?: boolean;\n    jsonRelayRequest?: (input: { provider: string; prompt: string }) => Promise<{ ok: boolean; response?: string; error?: string }>;\n}','Anki dialog relay prop');
 s=replace(s,'    inTutorial,\n}: AnkiDialogProps) => {','    inTutorial,\n    jsonRelayRequest,\n}: AnkiDialogProps) => {','Anki dialog relay destructuring');
 s=replace(s,'                    <AiDefinitionPanel\n                        sentence={text}','                    <AiDefinitionPanel\n                        sentence={text}\n                        request={jsonRelayRequest}','pass relay request to panel');
 write(f,s);
}
{
 const f='extension/src/ui/components/AnkiUi.tsx';
 let s=read(f);
 const anchor="    const showAnkiDialogQuickSelectFtue = !isMobile && ftueHasSeenAnkiDialogQuickSelect === false;";
 const callback=[
 "    const jsonRelayRequest = useCallback(",
 "        async ({ provider, prompt }: { provider: string; prompt: string }) => {",
 "            return bridge.sendMessageFromServerAndExpectResponse(",
 "                { command: 'json-relay', messageId: uuidv4(), provider, prompt } as any,",
 "                190_000",
 "            );",
 "        },",
 "        [bridge]",
 "    );",
 "",
 anchor
 ].join('\n');
 s=replace(s,anchor,callback,'Anki UI relay callback');
 s=replace(s,'                        mp3Encoder={mp3Encoder}\n','                        mp3Encoder={mp3Encoder}\n                        jsonRelayRequest={jsonRelayRequest}\n','pass relay callback to dialog');
 write(f,s);
}
for (const f of ['extension/src/controllers/anki-ui-controller.ts','extension/src/controllers/tab-anki-ui-controller.ts']) {
 let s=read(f);
 const relayCase=[
 "                        case 'json-relay': {",
 "                            const relayMessage = message as any;",
 "                            const relayResult = await browser.runtime.sendMessage({",
 "                                action: 'ASB_JSON_RELAY_RUN',",
 "                                provider: relayMessage.provider,",
 "                                prompt: relayMessage.prompt,",
 "                            });",
 "                            client.sendMessage({ ...relayResult, messageId: relayMessage.messageId });",
 "                            return;",
 "                        }",
 "                        case 'openSettings': {",
 ].join('\n');
 s=replace(s,"                        case 'openSettings': {",relayCase,'controller relay forwarding: '+f);
 write(f,s);
}

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
