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
 const f='common/anki/anki.ts';
 let s=read(f);
 s=replace(s,
   "import sanitize from 'sanitize-filename';",
   "import sanitize from 'sanitize-filename';\\nimport { cleanModelName, cleanNoteType } from '@project/common/components/CleanNoteType';",
   'Anki custom model import');
 s=replace(s,
   "        const fields: { [key: string]: string } = {};",
   [
     "        // Self-heal this custom build: users should not need to install the note model manually.",
     "        if (this.settingsProvider.noteType === cleanModelName) {",
     "            const models = await this.modelNames(ankiConnectUrl);",
     "            if (!models.includes(cleanModelName)) {",
     "                await this.createModel(cleanNoteType, ankiConnectUrl);",
     "            }",
     "            if (this.settingsProvider.deck) {",
     "                const decks = await this.deckNames(ankiConnectUrl);",
     "                if (!decks.includes(this.settingsProvider.deck)) {",
     "                    await this.createDeck(this.settingsProvider.deck, ankiConnectUrl);",
     "                }",
     "            }",
     "        }",
     "",
     "        const fields: { [key: string]: string } = {};",
   ].join('\\n'),
   'ensure custom Anki model before export');
 write(f,s);
}

{
 const f='common/components/AnkiDialog.tsx';
 let s=read(f);
 const sentenceBlock=[
 "                                    {!model.custom && model.key === 'sentence' && model.field.display && (",
 "                                        <SentenceField",
 "                                            text={text}",
 "                                            label={t('ankiDialog.sentence')}",
 "                                            width={width}",
 "                                            onChangeText={handleSentenceTextChange}",
 "                                            selectedSubtitles={selectedSubtitles}",
 "                                        />",
 "                                    )}",
 ].join('\n');
 const sentenceWithMeta=[
 "                                    {!model.custom && model.key === 'sentence' && model.field.display && (",
 "                                        settings.noteType === cleanModelName ? (",
 "                                            <SentenceField",
 "                                                text={text}",
 "                                                label={t('ankiDialog.sentence')}",
 "                                                width={width}",
 "                                                onChangeText={handleSentenceTextChange}",
 "                                                selectedSubtitles={selectedSubtitles}",
 "                                            />",
 "                                        ) : (",
 "                                            <div style={{minWidth:0}}>",
 "                                                <SentenceField",
 "                                                    text={text}",
 "                                                    label={t('ankiDialog.sentence')}",
 "                                                    width={width}",
 "                                                    onChangeText={handleSentenceTextChange}",
 "                                                    selectedSubtitles={selectedSubtitles}",
 "                                                />",
 "                                                <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',columnGap:12}}>",
 "                                                    <TextField",
 "                                                        variant=\"filled\" color=\"primary\" fullWidth",
 "                                                        label=\"Part of speech\"",
 "                                                        value={customFieldValues.PartOfSpeech || ''}",
 "                                                        onChange={(event)=>setCustomFieldValues(current=>({...current,PartOfSpeech:event.target.value}))}",
 "                                                    />",
 "                                                    <TextField",
 "                                                        variant=\"filled\" color=\"primary\" fullWidth",
 "                                                        label=\"IPA\"",
 "                                                        value={customFieldValues.IPA || ''}",
 "                                                        onChange={(event)=>setCustomFieldValues(current=>({...current,IPA:event.target.value}))}",
 "                                                    />",
 "                                                </div>",
 "                                            </div>",
 "                                        )",
 "                                    )}",
 ].join('\n');
 s=replace(s,sentenceBlock,sentenceWithMeta,'place part of speech and IPA under Sentence');
 s=replace(s,
   "model.custom && model.field.display && !(settings.noteType === cleanModelName && cleanCustomNames.includes(model.key)) && !(settings.noteType === fluencyNoteTypeName",
   "model.custom && model.field.display && !(['PartOfSpeech','IPA'].includes(model.key)) && !(settings.noteType === cleanModelName && cleanCustomNames.includes(model.key)) && !(settings.noteType === fluencyNoteTypeName",
   'avoid duplicate POS/IPA custom fields');
 write(f,s);
}

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
 s=s.replace("import { enqueueUpdateAlert } from '@/services/update-alert';\n",'');
 const updateBlock=[
 "    const updateListener = async (details: Browser.runtime.InstalledDetails) => {",
 "        if (details.reason !== browser.runtime.OnInstalledReason.UPDATE) {",
 "            return;",
 "        }",
 "",
 "        void enqueueUpdateAlert();",
 "    };",
 "",
 ].join('\n');
 s=s.replace(updateBlock,'');
 s=s.replace("    browser.runtime.onInstalled.addListener((details) => void updateListener(details));\n",'');
 s=replace(s,'export default defineBackground(() => {','export default defineBackground(() => {\n    initJsonRelay();','background initialization');
 write(f,s);
}
{
 const f='extension/wxt.config.ts';
 let s=read(f);
 s=replace(s,
   "permissions = [...permissions, 'tabCapture', 'activeTab', 'contextMenus', 'sidePanel', 'offscreen'];",
   "permissions = [...permissions, 'tabCapture', 'activeTab', 'contextMenus', 'sidePanel', 'offscreen', 'scripting'];",
   'Chromium scripting permission');
 s=replace(s,
   "id: project.extension.firefox.id,",
   "id: 'build-automatic-firefox@local',",
   'custom Firefox extension id');
 s=replace(s,"        return {\n            ...manifest,\n            permissions,","        return {\n            ...manifest,\n            host_permissions: Array.from(new Set([...(manifest.host_permissions || []), 'https://chatgpt.com/*', 'https://chat.openai.com/*', 'https://gemini.google.com/*'])),\n            permissions,",'host permissions');
 write(f,s);
}
console.log('PASS: ASB JSON relay integrated into background, public assets and Chromium manifest.');
