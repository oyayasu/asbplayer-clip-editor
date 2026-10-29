/**
 * Public WiktApi adapter for English Wiktionary entries.
 * This supplies additional dictionary senses and IPA; no key or AI is used.
 * Docs: https://wiktapi.dev/quickstart
 */
export interface WiktApiSense {
    partOfSpeech: string;
    definition: string;
    ipa: string;
    source: string;
    label: string;
}
type WiktEntry = {
    lang_code?: unknown;
    pos?: unknown;
    senses?: unknown;
    sounds?: unknown;
};

const text = (value: unknown): string =>
    typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';

const validIpa = (value: string): boolean => {
    if (!value || value.length > 180 || /[0-9]/.test(value)) return false;
    return /[ɐ-ʯˈˌːæðŋʃθɑɔɪʊəɛɝɚʌ]/u.test(value);
};

const pickIpa = (sounds: unknown): string => {
    if (!Array.isArray(sounds)) return '';
    const candidates = sounds.filter(
        (item): item is { ipa: string; tags?: string[] } =>
            item !== null && typeof item === 'object' &&
            typeof (item as {ipa?:unknown}).ipa === 'string'
    );
    const preferred = candidates.find(sound =>
        Array.isArray(sound.tags) &&
        sound.tags.some(tag => /^(US|American|General-American|en-US)$/i.test(tag))
    );
    const first = [preferred, ...candidates].find(
        item => item && validIpa(text(item.ipa))
    );
    if (!first) return '';
    const ipa = text(first.ipa);
    return ipa.startsWith('/') || ipa.startsWith('[') ? ipa : '/' + ipa + '/';
};

export function parseWiktApiEntry(data: unknown): WiktApiSense[] {
    if (!data || typeof data !== 'object') return [];
    const payload = data as { entries?: unknown; definitions?: unknown };
    const records = Array.isArray(payload.definitions) ? payload.definitions : payload.entries;
    if (!Array.isArray(records)) return [];

    const senses: WiktApiSense[] = [];
    const seen = new Set<string>();
    for (const raw of records as WiktEntry[]) {
        // The full /word endpoint currently omits lang_code/pos in its compact
        // entries, despite filtering by ?lang=en. The /definitions endpoint
        // includes them. Reject explicit non-English codes in either format.
        if (!raw || (raw.lang_code && raw.lang_code !== 'en') || !Array.isArray(raw.senses)) continue;
        const pos = text(raw.pos) || 'expression';
        const ipa = pickIpa(raw.sounds);
        for (const entry of raw.senses) {
            if (!entry || typeof entry !== 'object') continue;
            const sense = entry as { glosses?: unknown; raw_glosses?: unknown };
            const glosses = Array.isArray(sense.glosses) ? sense.glosses :
                Array.isArray(sense.raw_glosses) ? sense.raw_glosses : [];
            for (const gloss of glosses) {
                const definition = text(gloss);
                if (!definition || definition.length > 900) continue;
                const key = pos.toLowerCase() + '|' + definition.toLowerCase();
                if (seen.has(key)) continue;
                seen.add(key);
                senses.push({
                    partOfSpeech: pos,
                    definition,
                    ipa,
                    source: 'WiktApi / English Wiktionary',
                    label: definition.slice(0, 95),
                });
                if (senses.length >= 15) return senses;
            }
        }
    }
    return senses;
}

const fetchResource = async (url: string): Promise<unknown> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4800);
    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: { accept: 'application/json' },
        });
        if (response.status === 404) return null;
        if (!response.ok) throw Error('WiktApi HTTP ' + response.status);
        return await response.json();
    } finally {
        clearTimeout(timer);
    }
};

export async function fetchWiktApi(term: string): Promise<WiktApiSense[]> {
    const input = term.trim();
    if (!input || input.length > 160) return [];
    const base = 'https://api.wiktapi.dev/v1/en/word/' +
        encodeURIComponent(input);

    // /definitions includes the part-of-speech (pos) field, while
    // /word includes pronunciation sounds. Both are filtered to English.
    const results = await Promise.allSettled([
        fetchResource(base + '/definitions?lang=en'),
        fetchResource(base + '?lang=en'),
    ]);
    const definitions = results[0].status === 'fulfilled'
        ? parseWiktApiEntry(results[0].value) : [];
    const fullEntry = results[1].status === 'fulfilled'
        ? parseWiktApiEntry(results[1].value) : [];

    const preferred = definitions.length ? definitions : fullEntry;
    const ipa = fullEntry.find(sense => sense.ipa)?.ipa || '';
    if (!preferred.length && results.every(result => result.status === 'rejected')) {
        throw Error('Os endpoints do WiktApi não responderam.');
    }
    return preferred.map(sense => ({
        ...sense,
        ipa: sense.ipa || ipa,
    }));
}
