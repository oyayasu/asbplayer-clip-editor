#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repo = path.resolve(process.argv[2] || 'asbplayer');
const load = name => fs.readFileSync(path.join(repo, name), 'utf8');
const save = (name, contents) => fs.writeFileSync(path.join(repo, name), contents);

const changeOnce = (text, before, after, label) => {
    const occurrences = text.split(before).length - 1;
    if (occurrences !== 1) throw new Error(label + ': expected 1 match, got ' + occurrences);
    return text.replace(before, after);
};

for (const name of ['FluencyNoteType.ts', 'SmartDefinitionPanel.tsx', 'FluencyPhraseMatcher.ts']) {
    const target = path.join(repo, 'common/components', name);
    if (fs.existsSync(target)) throw new Error(name + ' already present, refusing to patch twice.');
    fs.copyFileSync(path.join(process.cwd(), name), target);
}

// A) Capture more than a pretty layout: enable useful, editable fields in the export dialogue.
{
    const filename = 'common/components/AnkiDialog.tsx';
    let s = load(filename);
    s = changeOnce(s,
        "import ClipSelectionPanel from '@project/common/components/ClipSelectionPanel';",
        "import ClipSelectionPanel from '@project/common/components/ClipSelectionPanel';\nimport SmartDefinitionPanel from '@project/common/components/SmartDefinitionPanel';\nimport { fluencyNoteTypeName, fluencyCustomFields } from '@project/common/components/FluencyNoteType';",
        'AnkiDialog imports'
    );

    s = changeOnce(s, "    const [definition, setDefinition] = useState<string>('');", "    const [definition, setDefinition] = useState<string>('');\n    const [allowIncompleteFluency, setAllowIncompleteFluency] = useState(false);", "Optional incomplete card confirmation");
    s = changeOnce(s, "    const [selectedSubtitles, setSelectedSubtitles] = useState<SubtitleModel[]>([]);", "    const [selectedSubtitles, setSelectedSubtitles] = useState<SubtitleModel[]>([]);\n    useEffect(() => setAllowIncompleteFluency(false), [card.subtitle]);", "Reset incomplete confirmation");
    s = changeOnce(s, "    const handleProceed = useCallback(", "    const fluencyIncomplete = settings.noteType === fluencyNoteTypeName &&\n        (!word.trim() || !customFieldValues.EnglishDefinition?.trim() || !customFieldValues.Portuguese?.trim());\n    const fluencyExportBlocked = fluencyIncomplete && !allowIncompleteFluency;\n\n    const handleProceed = useCallback(", "Check required fluency fields");
    s = changeOnce(s, "        async (mode: AnkiExportMode, noteIds?: number[]) => {\n            if (mode === 'updateSpecific') {", "        async (mode: AnkiExportMode, noteIds?: number[]) => {\n            if (fluencyExportBlocked) return;\n            if (mode === 'updateSpecific') {", "Block unconfirmed incomplete export");
    s = changeOnce(s, "        [buildExportParams, onProceed]\n    );", "        [buildExportParams, onProceed, fluencyExportBlocked]\n    );", "Export callback dependencies");
    s = changeOnce(s,
        '{model.custom && model.field.display && (',
        '{model.custom && model.field.display && !(settings.noteType === fluencyNoteTypeName && fluencyCustomFields.some((name) => name === model.key)) && (',
        'Replace duplicate custom fields'
    );

    const smartPanel = `                        {settings.noteType === fluencyNoteTypeName && (
                            <SmartDefinitionPanel
                                word={word}
                                values={{
                                    PartOfSpeech: customFieldValues.PartOfSpeech || '',
                                    IPA: customFieldValues.IPA || '',
                                    EnglishDefinition: customFieldValues.EnglishDefinition || '',
                                    Portuguese: customFieldValues.Portuguese || '',
                                }}
                                onFieldsChange={(values) =>
                                    setCustomFieldValues((current) => ({ ...current, ...values }))
                                }
                            />
                        )}
                        {settings.noteType === fluencyNoteTypeName && fluencyIncomplete && (
                            <Alert severity="warning" sx={{ gridColumn: '1 / -1' }}
                                action={
                                    <Button size="small" color="inherit" onClick={() => setAllowIncompleteFluency((v) => !v)}>
                                        {allowIncompleteFluency ? 'Cancelar' : 'Exportar incompleto'}
                                    </Button>
                                }>
                                Este cartão ainda não tem expressão, definição em inglês e significado em português.
                                Escolha um termo e confira os campos ou autorize explicitamente a exportação incompleta.
                            </Alert>
                        )}
`;
    s = changeOnce(s, '                        <ListField\n                            variant="filled"\n                            label="Tags"',
        smartPanel + '                        <ListField\n                            variant="filled"\n                            label="Tags"', 'Automatic fields editor');
    save(filename, s);
}

// B) One click sets up the entire model and all mappings through the existing AnkiConnect client.
// Existing decks/models remain untouched; if a deck is already selected, reuse it.
{
    const filename = 'common/components/AnkiSettingsTab.tsx';
    let s = load(filename);
    s = changeOnce(s,
        "import SwitchLabelWithHoverEffect from '@project/common/components/SwitchLabelWithHoverEffect';",
        "import SwitchLabelWithHoverEffect from '@project/common/components/SwitchLabelWithHoverEffect';\nimport Alert from '@mui/material/Alert';\nimport { fluencyNoteType, fluencyNoteTypeName, fluencyCustomFields } from '@project/common/components/FluencyNoteType';",
        'Settings imports');
    s = changeOnce(s, "    const [fieldNames, setFieldNames] = useState<string[]>();",
        "    const [fieldNames, setFieldNames] = useState<string[]>();\n    const [installingFluency, setInstallingFluency] = useState(false);\n    const [fluencyMessage, setFluencyMessage] = useState<{ text: string; error: boolean }>();",
        'Settings install state');

    const handler = `
    const handleInstallFluency = useCallback(async () => {
        setInstallingFluency(true);
        setFluencyMessage(undefined);
        try {
            await anki.version(ankiConnectUrl);
            const [knownModels, knownDecks] = await Promise.all([
                anki.modelNames(ankiConnectUrl),
                anki.deckNames(ankiConnectUrl),
            ]);
            if (!knownModels.includes(fluencyNoteTypeName)) {
                await anki.createModel(fluencyNoteType, ankiConnectUrl);
            }
            const chosenDeck = deck || 'English - Real Audio';
            if (!knownDecks.includes(chosenDeck)) {
                await anki.createDeck(chosenDeck, ankiConnectUrl);
            }
            const mappedFields = Object.fromEntries(fluencyCustomFields.map((name) => [name, name]));
            onSettingsChanged({
                deck: chosenDeck,
                noteType: fluencyNoteTypeName,
                sentenceField: 'Sentence',
                definitionField: 'Definition',
                wordField: 'Word',
                imageField: 'Image',
                audioField: 'Audio',
                sourceField: 'Source',
                urlField: 'URL',
                track1Field: '',
                track2Field: '',
                track3Field: '',
                customAnkiFields: mappedFields,
                customAnkiFieldSettings: {},
            });
            await requestAnkiConnect();
            setFluencyMessage({ text: 'Modelo de áudio criado e campos configurados. Você já pode criar cartões no asbplayer.', error: false });
        } catch (e) {
            asbError('anki/fluency-setup', e);
            setFluencyMessage({
                text: 'Não foi possível configurar o Anki. Verifique se ele está aberto e se o AnkiConnect está funcionando. ' + String(e),
                error: true,
            });
        } finally {
            setInstallingFluency(false);
        }
    }, [anki, ankiConnectUrl, deck, onSettingsChanged, requestAnkiConnect]);

`;
    s = changeOnce(s,
        '    const handleCreateTestCard = useCallback(async () => {',
        handler + '    const handleCreateTestCard = useCallback(async () => {',
        'Install note model handler');

    const panel = `
            <Stack spacing={1} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2, mt: 1 }}>
                <strong>English Fluency — cartões automáticos</strong>
                <FormHelperText>Frente: imagem + áudio real. Verso: frase, classe gramatical, IPA, definição em inglês e significado em português.</FormHelperText>
                <Button type="button" variant="contained" disabled={installingFluency}
                    onClick={() => { void handleInstallFluency(); }}>
                    {installingFluency ? 'Configurando Anki...' : 'Configurar modelo automaticamente'}
                </Button>
                {fluencyMessage && <Alert severity={fluencyMessage.error ? 'error' : 'success'}>{fluencyMessage.text}</Alert>}
            </Stack>
`;
    s = changeOnce(s,
        '            <SwitchLabelWithHoverEffect',
        panel + '            <SwitchLabelWithHoverEffect',
        'Settings one-click setup button');
    save(filename, s);
}

// C) Allow the extension's isolated UI to contact the two dictionary providers.
{
    const filename = 'extension/wxt.config.ts';
    let s = load(filename);
    s = changeOnce(s,
        '            default_locale: project.defaultLanguage,',
        "            default_locale: project.defaultLanguage,\n            host_permissions: ['https://api.dictionaryapi.dev/*', 'https://api.mymemory.translated.net/*'],",
        'Dictionary host permissions');
    save(filename, s);
}


// D) The extension's sandbox POST proxy rejects AnkiConnect actions unless
//    included in its security allowlist. These two were previously absent:
//    as a result, the one-click setup failed with "Invalid request".
{
    const filename = 'extension/src/handlers/video/http-post-handler.ts';
    let s = load(filename);
    s = changeOnce(s,
        "    'modelFieldNames',",
        "    'modelFieldNames',\n    'createModel',\n    'createDeck',",
        'AnkiConnect whitelist for the dedicated setup actions');
    save(filename, s);
}

console.log('Fluency card template, auto-lookup UI, Anki mappings and API permissions installed.');
