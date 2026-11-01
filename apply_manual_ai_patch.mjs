#!/usr/bin/env node
// Install the entirely manual contextual prompt/JSON workflow AFTER apply_clean_patch.
// Retains the existing Clean Unlimited Anki note type and media/clip editor.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || 'asbplayer');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const write = (name, content) => fs.writeFileSync(path.join(root, name), content);
const swap = (source, from, to, label) => {
  const count = source.split(from).length - 1;
  if (count !== 1) throw Error(label + ': expected one match, found ' + count);
  return source.replace(from, to);
};

for (const file of ['AiPrompt.ts', 'AiDefinitionPanel.tsx']) {
  const destination = path.join(root, 'common/components', file);
  if (fs.existsSync(destination)) throw Error('Already patched: ' + destination);
  fs.copyFileSync(path.resolve(file), destination);
}

// Use the existing subtitle text, preserving the built-in Anki, clip, and audio fields.
{
  const file = 'common/components/AnkiDialog.tsx';
  let s = read(file);
  s = swap(s,
    "import CleanDefinitionPanel from '@project/common/components/CleanDefinitionPanel';",
    "import AiDefinitionPanel from '@project/common/components/AiDefinitionPanel';",
    'AI panel import');
  s = swap(s, "import type { CleanRequest } from '@project/common/components/CleanDefinitionPanel';\n", '', 'remove clean API type');
  s = swap(s, '    cleanRequest?: CleanRequest;\n', '', 'remove API prop');
  s = swap(s, '    cleanRequest,\n', '', 'remove API destructuring');
  s = swap(s,
    '{settings.noteType === cleanModelName && cleanRequest && (',
    '{settings.noteType === cleanModelName && (',
    'mount manual dictionary without API');
  s = swap(s,
    '<CleanDefinitionPanel\n                                entries=',
    '<AiDefinitionPanel\n                                sentence={text}\n                                entries=',
    'pass current subtitle sentence');
  s = swap(s, '                                request={cleanRequest}\n', '', 'remove API request');

  // Keep the original Anki form, including its built-in Word and Definition
  // fields. Put only the compact manual AI tools AFTER the entire form.
  // The unlimited model continues to use its dedicated vocabulary entries.
  const modelGatedPanel = [
    "                        {settings.noteType === cleanModelName && (",
    "                            <AiDefinitionPanel",
    "                                sentence={text}",
    "                                entries={readVocabulary(customFieldValues.VocabularyData,word)}",
    "                                onEntriesChange={(updater)=>setCustomFieldValues(current=>({...current,...updateVocabulary(current.VocabularyData,word,updater)}))}",
    "                            />",
    "                        )}",
  ].join('\n');
  s = swap(s, modelGatedPanel, '', 'remove old model-gated manual panel');

  const manualPanel = [
    "                    <AiDefinitionPanel",
    "                        sentence={text}",
    "                        entries={settings.noteType === cleanModelName",
    "                            ? readVocabulary(customFieldValues.VocabularyData, word)",
    "                            : [{",
    "                                term: word, definition,",
    "                                partOfSpeech: customFieldValues.PartOfSpeech || '',",
    "                                ipa: customFieldValues.IPA || '', source: '',",
    "                            }]}",
    "                        showEntryFields={settings.noteType === cleanModelName}",
    "                        onEntriesChange={(updater) => {",
    "                            if (settings.noteType === cleanModelName) {",
    "                                setCustomFieldValues((current) => ({",
    "                                    ...current,",
    "                                    ...updateVocabulary(current.VocabularyData, word, updater),",
    "                                }));",
    "                                return;",
    "                            }",
    "                            const updated = updater([{",
    "                                term: word, definition,",
    "                                partOfSpeech: customFieldValues.PartOfSpeech || '',",
    "                                ipa: customFieldValues.IPA || '', source: '',",
    "                            }])[0];",
    "                            if (!updated) return;",
    "                            setWord(updated.term);",
    "                            setDefinition(updated.definition);",
    "                            setCustomFieldValues((current) => ({",
    "                                ...current, PartOfSpeech: updated.partOfSpeech, IPA: updated.ipa,",
    "                            }));",
    "                        }}",
    "                    />",
  ].join('\n');
  s = swap(s,
    "                    </form>\n                    {showQuickSelectFtue",
    "                    </form>\n" + manualPanel + "\n                    {showQuickSelectFtue",
    'place manual tools below the untouched Anki form');

  write(file, s);
}

// The dialog has no connection to any dictionary service or extension messaging.
{
  const file = 'extension/src/ui/components/AnkiUi.tsx';
  let s = read(file);
  s = swap(s, "import type { CleanRequest } from '@project/common/components/CleanDefinitionPanel';\n", '', 'remove frame API import');
  s = swap(s, [
    "    const cleanRequest: CleanRequest = useCallback(async (input) => {",
    "        if (!anki) throw Error('AnkiConnect is not configured.');",
    "        const response=await new BridgeFetcher(bridge).fetch(anki.ankiConnectUrl,input);",
    "        if (response?.error) throw Error(String(response.error));",
    "        return response;",
    "    },[anki,bridge]);",
    "",
  ].join('\n'), '', 'remove clean background callback');
  s = swap(s, '                        cleanRequest={cleanRequest}\n', '', 'remove frame API prop');
  write(file, s);
}

// Remove the Clean-only lookup endpoint, credential storage and host permissions.
// Older, separate note types keep their own independent implementation.
{
  const file = 'extension/src/handlers/video/http-post-handler.ts';
  let s = read(file);
  s = swap(s, "import { lookupCleanTerm } from '@/services/clean-dictionary';\n", '', 'remove clean API handler import');
  s = swap(s, [
    "    'fluencyCleanLookup',",
    "    'fluencySetKey',",
    "    'fluencyKeyStatus',",
    "    'fluencyPhrasesSetKey',",
    "    'fluencyPhrasesStatus',",
    "",
  ].join('\n'), '', 'remove clean API action whitelist');
  const start = s.indexOf("        if (message.body?.action === 'fluencySetKey') {");
  const end = s.indexOf("        if (message.body?.action === 'fluencyLookup') {", start);
  if (start < 0 || end <= start) throw Error('Could not isolate Clean API routes');
  s = s.slice(0, start) + s.slice(end);
  write(file, s);
}
{
  const file = 'extension/src/ui/bridge-fetcher.ts';
  write(file, swap(read(file),
    "(body?.action === 'fluencyLookup' || body?.action === 'fluencyCleanLookup') ? 18000 : undefined",
    "body?.action === 'fluencyLookup' ? 14000 : undefined", 'remove clean API timeout'));
}
{
  const file = 'extension/wxt.config.ts';
  write(file, swap(read(file),
    "'https://en.wiktionary.org/*', 'https://api.datamuse.com/*', 'https://api.wiktapi.dev/*', 'https://www.stands4.com/*'",
    "'https://en.wiktionary.org/*', 'https://api.datamuse.com/*'", 'remove clean-only API hosts'));
}
// Use an exact, short name in the browser extension manager and toolbar.
{
  const file = 'extension/wxt.config.ts';
  let s = read(file);
  s = swap(s,
    'const extName = project.names.short;',
    "const extName = 'ASB PLAYER JSON-MANUAL';",
    'extension display title');
  s = swap(s,
    'const name = `${title}: Language-learning with subtitles`;',
    'const name = title;',
    'manifest display name (no appended tagline)');
  write(file, s);
}

for (const file of [
  'common/components/CleanDefinitionPanel.tsx',
  'extension/src/services/clean-dictionary.ts',
  'extension/src/services/wiktapi-provider.ts',
  'extension/src/services/stands4-phrases.ts',
]) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) throw Error('Missing Clean file: ' + file);
  fs.unlinkSync(full);
}

// Reuse the existing Anki model so users do not need to reinstall or migrate cards.
{
  const file = 'common/components/AnkiSettingsTab.tsx';
  let s = read(file);
  s = swap(s, 'English-only unlimited vocabulary (recommended)',
    'Contextual English definitions — manual AI / JSON', 'manual model label');
  s = swap(s,
    'Add as many expressions as needed per scene. Each definition stays editable. The new Anki model preserves existing cards.',
    'Copy a subtitle-aware prompt to any AI, paste its JSON reply, and choose the best English meaning. No dictionary APIs or keys. Existing cards stay intact.',
    'manual model explanation');
  write(file, s);
}
console.log('PASS: manual prompt/JSON dictionary installed, no Clean lookup API and no Anki model migration.');
