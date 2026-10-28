#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.argv[2] || 'asbplayer');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const write=(p,s)=>fs.writeFileSync(path.join(root,p),s);
const replace=(s,from,to,label)=>{
  const count=s.split(from).length-1;
  if(count!==1)throw Error(label+': expected one exact match, got '+count);
  return s.replace(from,to);
};
for(const file of ['FluencyMultiNoteType.ts','MultiVocabularyPanel.tsx']){
  const dst=path.join(root,'common/components',file);
  if(fs.existsSync(dst))throw Error('Already patched: '+file);
  fs.copyFileSync(path.resolve(process.cwd(),file),dst);
}
{
  const file='common/components/AnkiDialog.tsx';
  let s=read(file);
  s=replace(s,
    "import SmartDefinitionPanel from '@project/common/components/SmartDefinitionPanel';",
    "import SmartDefinitionPanel from '@project/common/components/SmartDefinitionPanel';\nimport MultiVocabularyPanel from '@project/common/components/MultiVocabularyPanel';\nimport { multiNoteTypeName, multiCustomFieldNames, MAX_MULTI_TERMS } from '@project/common/components/FluencyMultiNoteType';",
    'Multi editor import');
  s=replace(s,
    "    const fluencyIncomplete = settings.noteType === fluencyNoteTypeName &&\n        (!word.trim() || !customFieldValues.EnglishDefinition?.trim() || !customFieldValues.Portuguese?.trim());",
    [
      "    const multiIncomplete = settings.noteType === multiNoteTypeName &&",
      "        (!word.trim() || !customFieldValues.EnglishDefinition?.trim() || !customFieldValues.Portuguese?.trim() ||",
      "            Array.from({ length: MAX_MULTI_TERMS - 1 }, (_, k) => k + 2).some((i) => {",
      "                const extra = customFieldValues['Word' + i]?.trim();",
      "                return extra && (!customFieldValues['EnglishDefinition' + i]?.trim() ||",
      "                    !customFieldValues['Portuguese' + i]?.trim());",
      "            }));",
      "    const fluencyIncomplete = (settings.noteType === fluencyNoteTypeName &&",
      "        (!word.trim() || !customFieldValues.EnglishDefinition?.trim() || !customFieldValues.Portuguese?.trim())) || multiIncomplete;",
    ].join('\n'),
    'Verify every selected definition before export');
  s=replace(s,
    "model.key === 'word' && model.field.display && (",
    "model.key === 'word' && model.field.display && settings.noteType !== multiNoteTypeName && (",
    'Hide redundant single Word field');
  s=replace(s,
    "{model.custom && model.field.display && !(settings.noteType === fluencyNoteTypeName && fluencyCustomFields.some((name) => name === model.key)) && (",
    "{model.custom && model.field.display && !(settings.noteType === fluencyNoteTypeName && fluencyCustomFields.some((name) => name === model.key)) && !(settings.noteType === multiNoteTypeName && multiCustomFieldNames.includes(model.key)) && (",
    'Hide duplicate custom input fields');
  s=replace(s,
    "                        {settings.noteType === fluencyNoteTypeName && (\n                            <SmartDefinitionPanel",
    [
      "                        {settings.noteType === multiNoteTypeName && (",
      "                            <MultiVocabularyPanel",
      "                                sentence={text}",
      "                                word={word}",
      "                                values={customFieldValues}",
      "                                onWordChange={setWord}",
      "                                onFieldsChange={(changes) => setCustomFieldValues((current) => ({ ...current, ...changes }))}",
      "                            />",
      "                        )}",
      "                        {settings.noteType === fluencyNoteTypeName && (",
      "                            <SmartDefinitionPanel"
    ].join('\n'),
    'Render multi-editor');
  s=replace(s,
    "{settings.noteType === fluencyNoteTypeName && fluencyIncomplete && (",
    "{(settings.noteType === fluencyNoteTypeName || settings.noteType === multiNoteTypeName) && fluencyIncomplete && (",
    'Confirm incomplete multi cards');
  write(file,s);
}
{
 const file='common/components/AnkiSettingsTab.tsx';
 let s=read(file);
 s=replace(s,
   "import { fluencyNoteType, fluencyNoteTypeName, fluencyCustomFields } from '@project/common/components/FluencyNoteType';",
   "import { fluencyNoteType, fluencyNoteTypeName, fluencyCustomFields } from '@project/common/components/FluencyNoteType';\nimport { multiNoteType, multiNoteTypeName, multiCustomFieldNames } from '@project/common/components/FluencyMultiNoteType';",
   'New note type import');
 s=replace(s,
   "    const [installingFluency, setInstallingFluency] = useState(false);",
   "    const [installingFluency, setInstallingFluency] = useState(false);\n    const [installingMulti, setInstallingMulti] = useState(false);\n    const [multiMessage, setMultiMessage] = useState<{ text: string; error: boolean }>();",
   'New setup state');

 const install=[
 "    const handleInstallMulti = useCallback(async () => {",
 "        setInstallingMulti(true);",
 "        setMultiMessage(undefined);",
 "        try {",
 "            await anki.version(ankiConnectUrl);",
 "            const [models, decks] = await Promise.all([",
 "                anki.modelNames(ankiConnectUrl),",
 "                anki.deckNames(ankiConnectUrl),",
 "            ]);",
 "            if (!models.includes(multiNoteTypeName)) await anki.createModel(multiNoteType, ankiConnectUrl);",
 "            const selectedDeck = deck || 'English - Real Audio';",
 "            if (!decks.includes(selectedDeck)) await anki.createDeck(selectedDeck, ankiConnectUrl);",
 "            const mapped = Object.fromEntries(multiCustomFieldNames.map((name) => [name, name]));",
 "            onSettingsChanged({",
 "                deck: selectedDeck,",
 "                noteType: multiNoteTypeName,",
 "                sentenceField: 'Sentence',",
 "                wordField: 'Word',",
 "                definitionField: 'Definition',",
 "                imageField: 'Image',",
 "                audioField: 'Audio',",
 "                sourceField: 'Source',",
 "                urlField: 'URL',",
 "                track1Field: '',",
 "                track2Field: '',",
 "                track3Field: '',",
 "                customAnkiFields: mapped,",
 "                customAnkiFieldSettings: {},",
 "            });",
 "            await requestAnkiConnect();",
 "            setMultiMessage({ text: 'Modelo multi-expressões ativado. Agora confira as expressões antes de exportar.', error: false });",
 "        } catch (e) {",
 "            asbError('anki/multi-setup',e);",
 "            setMultiMessage({ text: 'Erro ao criar o modelo: ' + String(e), error:true });",
 "        } finally { setInstallingMulti(false); }",
 "    }, [anki, ankiConnectUrl, deck, onSettingsChanged, requestAnkiConnect]);",
 "",
 ].join('\n');
 s=replace(s,
   '    const handleCreateTestCard = useCallback(async () => {',
   install+'    const handleCreateTestCard = useCallback(async () => {',
   'Multi model setup callback');
 s=replace(s,
   "            <Stack spacing={1} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2, mt: 1 }}>\n                <strong>English Fluency — cartões automáticos</strong>",
   [
    "            <Stack spacing={1} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2, mt: 1 }}>",
    "                <strong>English Fluency — várias expressões por cena (NOVO)</strong>",
    "                <FormHelperText>Até cinco expressões independentes com definição, tradução e IPA próprios; um único áudio e imagem para a cena.</FormHelperText>",
    "                <Button type=\"button\" variant=\"contained\" disabled={installingMulti} onClick={() => { void handleInstallMulti(); }}>",
    "                    {installingMulti ? 'Configurando...' : 'Ativar modelo multi-expressões no Anki'}",
    "                </Button>",
    "                {multiMessage && <Alert severity={multiMessage.error ? 'error' : 'success'}>{multiMessage.text}</Alert>}",
    "            </Stack>",
    "            <Stack spacing={1} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2, mt: 1 }}>",
    "                <strong>Modelo anterior: uma expressão por cartão</strong>"
   ].join('\n'),
   'One-click configuration UI');
 write(file,s);
}
console.log('OK: Multi model, independent definitions, multi-editor and one-click Anki setup installed.');
