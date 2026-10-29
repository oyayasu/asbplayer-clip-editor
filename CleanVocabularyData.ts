/**
 * Flexible, unbounded Anki vocabulary serialization. Each note has only two
 * vocabulary-related fields regardless of how many expressions the user adds:
 * VocabularyData stores a URI-encoded JSON array, and Vocabulary stores safe
 * HTML that Anki can display directly without running any script.
 */
export interface VocabularyEntry {
  term: string;
  partOfSpeech: string;
  ipa: string;
  definition: string;
  source: string;
}
export const emptyVocabularyEntry = (): VocabularyEntry => ({
  term: '', partOfSpeech: '', ipa: '', definition: '', source: '',
});

export function readVocabulary(encoded: string | undefined, firstWord = ''): VocabularyEntry[] {
  try {
    if (encoded) {
      const parsed: unknown = JSON.parse(decodeURIComponent(encoded));
      if (Array.isArray(parsed) && parsed.length) {
        const result: VocabularyEntry[] = parsed
          .filter(value => value && typeof value === 'object')
          .map(value => {
            const record = value as Record<string, unknown>;
            return {
              term: String(record.term ?? ''),
              partOfSpeech: String(record.partOfSpeech ?? ''),
              ipa: String(record.ipa ?? ''),
              definition: String(record.definition ?? ''),
              source: String(record.source ?? ''),
            };
          });
        if (result.length) return result;
      }
    }
  } catch {
    // Corrupted or edited Anki data does not prevent use of the note.
  }
  return [{...emptyVocabularyEntry(), term: firstWord}];
}
export const serializeVocabulary = (entries: VocabularyEntry[]): string =>
  encodeURIComponent(JSON.stringify(entries.length ? entries : [emptyVocabularyEntry()]));

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export function renderVocabulary(entries: VocabularyEntry[]): string {
  return entries
    .filter(entry => entry.term.trim())
    .map((entry, index) => {
      const word = escapeHtml(entry.term.trim());
      const parts = [entry.partOfSpeech.trim(), entry.ipa.trim()]
        .filter(Boolean).map(escapeHtml).join(' &middot; ');
      const def = escapeHtml(entry.definition.trim()).replace(/\r?\n/g, '<br>');
      const source = escapeHtml(entry.source.trim());
      return [
        '<div class="term-group">',
        '<div class="term-top"><span class="term-number">',
        String(index + 1).padStart(2,'0'),
        '</span><b class="term-name">',word,'</b></div>',
        parts ? '<div class="term-metadata">' + parts + '</div>' : '',
        def ? '<div class="term-definition">' + def + '</div>' : '',
        source ? '<div class="term-source">' + source + '</div>' : '',
        '</div>',
      ].join('');
    }).join('\n');
}
export function updateVocabulary(
  encoded: string | undefined, firstWord: string,
  updater: (entries: VocabularyEntry[]) => VocabularyEntry[]
): {VocabularyData: string; Vocabulary: string} {
  const entries = updater(readVocabulary(encoded, firstWord));
  return {
    VocabularyData: serializeVocabulary(entries),
    Vocabulary: renderVocabulary(entries),
  };
}
