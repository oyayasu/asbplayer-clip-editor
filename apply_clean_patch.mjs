#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.argv[2]||'asbplayer');
const load=p=>fs.readFileSync(path.join(root,p),'utf8');
const save=(p,s)=>fs.writeFileSync(path.join(root,p),s);
const swap=(s,a,b,name)=>{
  const matches=s.split(a).length-1;
  if(matches!==1)throw Error(name+': expected exactly one occurrence; got '+matches);
  return s.replace(a,b);
};
for(const [file,destination] of [
  ['CleanNoteType.ts','common/components/CleanNoteType.ts'],
  ['CleanDefinitionPanel.tsx','common/components/CleanDefinitionPanel.tsx'],
  ['CleanWordFields.tsx','common/components/CleanWordFields.tsx'],
  ['CleanVocabularyData.ts','common/components/CleanVocabularyData.ts'],
  ['CleanDictionary.ts','extension/src/services/clean-dictionary.ts'],
  ['WiktApiProvider.ts','extension/src/services/wiktapi-provider.ts'],
  ['Stands4Phrases.ts','extension/src/services/stands4-phrases.ts']
]){
  const target=path.join(root,destination);
  if(fs.existsSync(target))throw Error('Double patch: '+target);
  fs.copyFileSync(path.resolve(process.cwd(),file),target);
}

{
 const file='common/components/AnkiDialog.tsx';let s=load(file);
 s=swap(s,
   "import MultiVocabularyPanel from '@project/common/components/MultiVocabularyPanel';",
   "import MultiVocabularyPanel from '@project/common/components/MultiVocabularyPanel';\nimport CleanDefinitionPanel from '@project/common/components/CleanDefinitionPanel';\nimport CleanWordFields from '@project/common/components/CleanWordFields';\nimport type { CleanRequest } from '@project/common/components/CleanDefinitionPanel';\nimport { cleanModelName, cleanCustomNames } from '@project/common/components/CleanNoteType';\nimport { readVocabulary, updateVocabulary } from '@project/common/components/CleanVocabularyData';",
   'clean UI imports');
 s=swap(s,"    fluencyLookup?: FluencyBridgeLookup;",
   "    fluencyLookup?: FluencyBridgeLookup;\n    cleanRequest?: CleanRequest;",'clean request prop');
 s=swap(s,"    fluencyLookup,\n    source:",
   "    fluencyLookup,\n    cleanRequest,\n    source:",'clean request destructuring');
 s=swap(s,"    const [allowIncompleteFluency, setAllowIncompleteFluency] = useState(false);",
   "    const [allowIncompleteFluency, setAllowIncompleteFluency] = useState(false);\n    const [showMediaDetails,setShowMediaDetails]=useState(false);",
   'details state');
 const before="    const fluencyIncomplete = (settings.noteType === fluencyNoteTypeName &&";
 const add=[
   "    const cleanEntries=readVocabulary(customFieldValues.VocabularyData,word);",
   "    const cleanIncomplete = settings.noteType === cleanModelName &&",
   "        (!cleanEntries.some(entry=>entry.term.trim()) ||",
   "        cleanEntries.some(entry=>entry.term.trim() && !entry.definition.trim()));",
   ""
 ].join('\n');
 s=swap(s,before,add+before,'clean card validation');
 s=swap(s,"    const fluencyExportBlocked = fluencyIncomplete && !allowIncompleteFluency;",
   "    const fluencyExportBlocked = (fluencyIncomplete || cleanIncomplete) && !allowIncompleteFluency;",
   'block incomplete clean export');
 s=swap(s,
    '<form className={classes.root}>',
    "<form className={classes.root} style={settings.noteType === cleanModelName ? {gridTemplateColumns:'minmax(0, 1fr)'} : undefined}>",
    'clean one-column layout');
 s=swap(s,
    "!model.custom && model.key === 'definition' && model.field.display && (",
    "!model.custom && model.key === 'definition' && model.field.display && settings.noteType !== cleanModelName && (",
    'hide duplicate Definition');
 s=swap(s,
    "!model.custom && model.key === 'word' && model.field.display && settings.noteType !== multiNoteTypeName && (",
    "!model.custom && model.key === 'word' && model.field.display && settings.noteType !== multiNoteTypeName && settings.noteType !== cleanModelName && (",
    'hide duplicate Word');
 s=swap(s,
   "                                            selectedSubtitles={selectedSubtitles}\n                                        />\n                                    )}",
   [
     "                                            selectedSubtitles={selectedSubtitles}",
     "                                        />",
     "                                    )}",
     "                                    {settings.noteType === cleanModelName && !model.custom && model.key === 'sentence' && (",
     "                                        <CleanWordFields",
     "                                            entries={readVocabulary(customFieldValues.VocabularyData,word)}",
     "                                            onFirstChange={setWord}",
     "                                            onEntriesChange={(updater)=>setCustomFieldValues(current=>({...current,...updateVocabulary(current.VocabularyData,word,updater)}))}",
     "                                        />",
     "                                    )}"
   ].join('\n'),
   'render single Word field with plus button, below Sentence');
 s=swap(s,
    "image && !model.custom && model.key === 'image' && model.field.display && (",
    "image && !model.custom && model.key === 'image' && model.field.display && (settings.noteType !== cleanModelName || showMediaDetails) && (",
    'collapse image details');
 s=swap(s,
    "!model.custom && model.key === 'source' && model.field.display && (",
    "!model.custom && model.key === 'source' && model.field.display && (settings.noteType !== cleanModelName || showMediaDetails) && (",
    'collapse source details');
 s=swap(s,
    "!model.custom && model.key === 'url' && model.field.display && card.url && (",
    "!model.custom && model.key === 'url' && model.field.display && card.url && (settings.noteType !== cleanModelName || showMediaDetails) && (",
    'collapse URL details');
 s=swap(s,
    "model.custom && model.field.display && !(settings.noteType === fluencyNoteTypeName",
    "model.custom && model.field.display && !(settings.noteType === cleanModelName && cleanCustomNames.includes(model.key)) && !(settings.noteType === fluencyNoteTypeName",
    'hide duplicate custom fields');
 const clip=[
 "                        {settings.noteType === cleanModelName && timestampInterval && timestampBoundaryInterval && timestampMarks && (",
 "                            <ClipSelectionPanel",
 "                                interval={timestampInterval}",
 "                                boundary={timestampBoundaryInterval}",
 "                                subtitles={card.surroundingSubtitles}",
 "                                onChange={(value) => handleTimestampIntervalChange(null, value)}",
 "                                onReset={handleResetTimestampInterval}",
 "                                onZoomIn={handleZoomInTimestampInterval}",
 "                                onZoomOut={handleZoomOutTimestampInterval}",
 "                                onApplyToText={handleApplyTimestampIntervalToText}",
 "                                applyDisabled={(lastAppliedTimestampIntervalToText !== undefined &&",
 "                                    timestampInterval[0] === lastAppliedTimestampIntervalToText[0] &&",
 "                                    timestampInterval[1] === lastAppliedTimestampIntervalToText[1]) || disableApplyTextSelection}",
 "                            />",
 "                        )}",
 "                        {settings.noteType === cleanModelName && cleanRequest && (",
 "                            <CleanDefinitionPanel",
 "                                entries={readVocabulary(customFieldValues.VocabularyData,word)}",
 "                                onEntriesChange={(updater)=>setCustomFieldValues(current=>({...current,...updateVocabulary(current.VocabularyData,word,updater)}))}",
 "                                request={cleanRequest}",
 "                            />",
 "                        )}",
 "                        {settings.noteType === cleanModelName && (",
 "                            <Button variant=\"text\" type=\"button\" size=\"small\"",
 "                                onClick={()=>setShowMediaDetails(v=>!v)} sx={{justifySelf:'start',textTransform:'none'}}>",
 "                                {showMediaDetails ? 'Hide image & source details' : 'Show image & source details'}",
 "                            </Button>",
 "                        )}",
 ""].join('\n');
 s=swap(s,"                        <ListField\n                            variant=\"filled\"\n                            label=\"Tags\"",
   clip+"                        <ListField\n                            variant=\"filled\"\n                            label=\"Tags\"",
   'insert clean editor and clip');
 s=swap(s,
   "                {timestampInterval && timestampBoundaryInterval && timestampMarks && (\n                    <ClipSelectionPanel",
   "                {settings.noteType !== cleanModelName && timestampInterval && timestampBoundaryInterval && timestampMarks && (\n                    <ClipSelectionPanel",
   'hide duplicated clip selection outside clean editor');
 save(file,s);
}
{
 const file='extension/src/ui/components/AnkiUi.tsx';let s=load(file);
 s=swap(s,
    "import type { FluencyBridgeLookup } from '@project/common/components/FluencyLookupTransport';",
    "import type { FluencyBridgeLookup } from '@project/common/components/FluencyLookupTransport';\nimport type { CleanRequest } from '@project/common/components/CleanDefinitionPanel';",
    'frame clean request import');
 s=swap(s,
    "    const dialogStateRef = useRef<AnkiDialogState>(undefined);",
    [
      "    const cleanRequest: CleanRequest = useCallback(async (input) => {",
      "        if (!anki) throw Error('AnkiConnect is not configured.');",
      "        const response=await new BridgeFetcher(bridge).fetch(anki.ankiConnectUrl,input);",
      "        if (response?.error) throw Error(String(response.error));",
      "        return response;",
      "    },[anki,bridge]);",
      "    const dialogStateRef = useRef<AnkiDialogState>(undefined);"
    ].join('\n'),
    'clean bridge callback');
 s=swap(s,"                        fluencyLookup={fluencyLookup}\n                        onProceed={handleProceed}",
     "                        fluencyLookup={fluencyLookup}\n                        cleanRequest={cleanRequest}\n                        onProceed={handleProceed}",
     'forward clean bridge');
 save(file,s);
}
{
 const file='common/components/AnkiSettingsTab.tsx';let s=load(file);
 s=swap(s,
   "import { multiNoteType, multiNoteTypeName, multiCustomFieldNames } from '@project/common/components/FluencyMultiNoteType';",
   "import { multiNoteType, multiNoteTypeName, multiCustomFieldNames } from '@project/common/components/FluencyMultiNoteType';\nimport { cleanNoteType, cleanModelName, cleanCustomNames } from '@project/common/components/CleanNoteType';",
   'clean setup import');
 s=swap(s,
   "    const [installingMulti, setInstallingMulti] = useState(false);",
   "    const [installingMulti, setInstallingMulti] = useState(false);\n    const [installingClean,setInstallingClean]=useState(false);\n    const [cleanMessage,setCleanMessage]=useState('');",
   'clean setup state');
 const installer=[
 "    const handleInstallClean = useCallback(async()=>{",
 "        setInstallingClean(true);setCleanMessage('');",
 "        try {",
 "            await anki.version(ankiConnectUrl);",
 "            const [models,decks]=await Promise.all([anki.modelNames(ankiConnectUrl),anki.deckNames(ankiConnectUrl)]);",
 "            if(!models.includes(cleanModelName))await anki.createModel(cleanNoteType,ankiConnectUrl);",
 "            const deckToUse=deck||'English - Real Audio';",
 "            if(!decks.includes(deckToUse))await anki.createDeck(deckToUse,ankiConnectUrl);",
 "            const mapped=Object.fromEntries(cleanCustomNames.map(name=>[name,name]));",
 "            onSettingsChanged({",
 "                deck:deckToUse,noteType:cleanModelName,sentenceField:'Sentence',",
 "                wordField:'Word',definitionField:'',audioField:'Audio',imageField:'Image',",
 "                sourceField:'Source',urlField:'URL',track1Field:'',track2Field:'',track3Field:'',",
 "                customAnkiFields:mapped,customAnkiFieldSettings:{},",
 "            });",
 "            await requestAnkiConnect();",
 "            setCleanMessage('Unlimited English vocabulary model activated. Existing cards were not modified.');",
 "        }catch(e){asbError('anki/clean-setup',e);setCleanMessage('Could not create model: '+String(e));}",
 "        finally{setInstallingClean(false);}",
 "    },[anki,ankiConnectUrl,deck,onSettingsChanged,requestAnkiConnect]);",
 ""
 ].join('\n');
 s=swap(s,
   "    const handleCreateTestCard = useCallback(async () => {",
   installer+"    const handleCreateTestCard = useCallback(async () => {",
   'clean setup callback');
 s=swap(s,
   "                <strong>English Fluency — várias expressões por cena (NOVO)</strong>",
   "                <strong>English Fluency — várias expressões por cena (ANTERIOR)</strong>",
   'rename old installer');
 s=swap(s,
   "            <Stack spacing={1} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2, mt: 1 }}>\n                <strong>English Fluency — várias expressões por cena (ANTERIOR)</strong>",
   [
   "            <Stack spacing={1} sx={{border:'1px solid',borderColor:'divider',borderRadius:2,p:2,mt:1}}>",
   "                <strong>English-only unlimited vocabulary (recommended)</strong>",
   "                <FormHelperText>Add as many expressions as needed per scene. Each definition stays editable. The new Anki model preserves existing cards.</FormHelperText>",
   "                <Button type=\"button\" variant=\"contained\" disabled={installingClean} onClick={()=>{void handleInstallClean();}}>",
   "                    {installingClean?'Configuring...':'Activate unlimited Anki model'}",
   "                </Button>",
   "                {cleanMessage && <FormHelperText>{cleanMessage}</FormHelperText>}",
   "            </Stack>",
   "            <Stack spacing={1} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2, mt: 1 }}>",
   "                <strong>English Fluency — várias expressões por cena (ANTERIOR)</strong>"
   ].join('\n'),
   'clean setup button');
 save(file,s);
}
{
 const file='extension/src/handlers/video/http-post-handler.ts';let s=load(file);
 s=swap(s,
   "import { resolveRemoteDictionary } from '@/services/remote-dictionary';",
   "import { resolveRemoteDictionary } from '@/services/remote-dictionary';\nimport { lookupCleanTerm } from '@/services/clean-dictionary';",
   'clean handler import');
 s=swap(s,
   "    'fluencyLookup',",
   "    'fluencyLookup',\n    'fluencyCleanLookup',\n    'fluencySetKey',\n    'fluencyKeyStatus',\n    'fluencyPhrasesSetKey',\n    'fluencyPhrasesStatus',",
   'clean whitelisted actions');
 s=swap(s,
   "        if (message.body?.action === 'fluencyLookup') {",
   [
     "        if (message.body?.action === 'fluencySetKey') {",
     "            const key=message.body.key;",
     "            if(typeof key!=='string'||key.length>160){sendResponse({error:'Invalid API key'});return true;}",
     "            void browser.storage.local.set({asbplayerMwKey:key.trim()}).then(()=>",
     "              sendResponse({configured:Boolean(key.trim())})).catch(e=>sendResponse({error:String(e)}));",
     "            return true;",
     "        }",
     "        if (message.body?.action === 'fluencyKeyStatus') {",
     "            void browser.storage.local.get('asbplayerMwKey').then(item=>",
     "              sendResponse({configured:Boolean(item.asbplayerMwKey)})).catch(e=>sendResponse({error:String(e)}));",
     "            return true;",
     "        }",
     "        if (message.body?.action === 'fluencyPhrasesSetKey') {",
     "            const uid=message.body.uid;",
     "            const token=message.body.token;",
     "            if(typeof uid!=='string'||typeof token!=='string'||uid.length>100||token.length>250){",
     "                sendResponse({error:'Invalid STANDS4 credentials'});return true;",
     "            }",
     "            void browser.storage.local.set({asbplayerPhrasesUid:uid.trim(),asbplayerPhrasesToken:token.trim()})",
     "              .then(()=>sendResponse({configured:Boolean(uid.trim()&&token.trim())}))",
     "              .catch(()=>sendResponse({error:'Could not store STANDS4 credentials'}));",
     "            return true;",
     "        }",
     "        if (message.body?.action === 'fluencyPhrasesStatus') {",
     "            void browser.storage.local.get(['asbplayerPhrasesUid','asbplayerPhrasesToken'])",
     "              .then(item=>sendResponse({configured:Boolean(item.asbplayerPhrasesUid&&item.asbplayerPhrasesToken)}))",
     "              .catch(()=>sendResponse({configured:false}));",
     "            return true;",
     "        }",
     "        if (message.body?.action === 'fluencyCleanLookup') {",
     "            const term=message.body.term;",
     "            const source=message.body.source||'auto';",
     "            if(!['auto','merriam','phrases','wiktapi','wiktionary','datamuse','freeDictionary'].includes(source)){",
     "                sendResponse({error:'Unknown dictionary provider'});return true;",
     "            }",
     "            if(typeof term!=='string'||!term.trim()||term.length>160){",
     "                sendResponse({error:'Invalid lookup term'});return true;",
     "            }",
     "            void browser.storage.local.get(['asbplayerMwKey','asbplayerPhrasesUid','asbplayerPhrasesToken'])",
     "              .then(item=>lookupCleanTerm(term,String(item.asbplayerMwKey||''),source,",
     "                String(item.asbplayerPhrasesUid||''),String(item.asbplayerPhrasesToken||'')))",
     "              .then(result=>sendResponse(result))",
     "              .catch(e=>sendResponse({error:e instanceof Error?e.message:String(e)}));",
     "            return true;",
     "        }",
     "        if (message.body?.action === 'fluencyLookup') {"
   ].join('\n'),
   'intercept clean actions before old dictionary');
 save(file,s);
}
{
 const file='extension/src/ui/bridge-fetcher.ts';
 let s=load(file);
 s=swap(s,
   "body?.action === 'fluencyLookup' ? 14000 : undefined",
   "(body?.action === 'fluencyLookup' || body?.action === 'fluencyCleanLookup') ? 18000 : undefined",
   'allow full Merriam-Webster and fallback timeout');
 save(file,s);
}
{
  const file='extension/wxt.config.ts';
  let s=load(file);
  s=swap(s,
    "'https://en.wiktionary.org/*', 'https://api.datamuse.com/*'",
    "'https://en.wiktionary.org/*', 'https://api.datamuse.com/*', 'https://api.wiktapi.dev/*', 'https://www.stands4.com/*'",
    'WiktApi host permission');
  save(file,s);
}
console.log('OK: Clean Definition, original AudioField, ClipSelection and separate Anki model.');
