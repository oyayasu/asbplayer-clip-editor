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
    const payload = data as { entries?: unknown };
    if (!Array.isArray(payload.entries)) return [];

    const senses: WiktApiSense[] = [];
    const seen = new Set<string>();
    for (const raw of payload.entries as WiktEntry[]) {
        if (!raw || raw.lang_code !== 'en' || !Array.isArray(raw.senses)) continue;
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

export async function fetchWiktApi(term: string): Promise<WiktApiSense[]> {
    const input = term.trim();
    if (!input || input.length > 160) return [];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4800);
    try {
        const url = 'https://api.wiktapi.dev/v1/en/word/' +
            encodeURIComponent(input) + '?lang=en';
        const response = await fetch(url, {
            signal: controller.signal,
            headers: { accept: 'application/json' },
        });
        if (response.status === 404) return [];
        if (!response.ok) throw Error('WiktApi HTTP ' + response.status);
        return parseWiktApiEntry(await response.json());
    } finally {
        clearTimeout(timer);
    }
}
