/**
 * Conservative phrase matching for a subtitle-only workflow.
 * Only selects a phrase automatically when it has a curated, high-confidence match.
 * Never assumes that an arbitrary subtitle word is the learner's target.
 */
const patterns: Array<{ pattern: RegExp; term: string }> = [
    { pattern: /\bwork(?:s|ed|ing)?\s+things\s+out\b/i, term: 'work things out' },
    { pattern: /\b(?:held|hold|holds|holding)\s+a\s+grudge\b/i, term: 'hold a grudge' },
    { pattern: /\b(?:stood|stand|stands|standing)\s+(?:my|your|his|her|our|their)\s+ground\b/i, term: 'stand your ground' },
    { pattern: /\b(?:took|take|takes|taking)\s+out\s+a\s+loan\b/i, term: 'take out a loan' },
    { pattern: /\b(?:tend|tends|tended|tending)\s+to\b/i, term: 'tend to' },
    { pattern: /\b(?:figure|figures|figured|figuring)\s+out\b/i, term: 'figure out' },
    { pattern: /\b(?:ended|end|ends|ending)\s+up\b/i, term: 'end up' },
    { pattern: /\b(?:worked|work|works|working)\s+out\b/i, term: 'work out' },
    { pattern: /\b(?:pick|picks|picked|picking)\s+a\s+fight\b/i, term: 'pick a fight' },
    { pattern: /\b(?:give|gives|gave|giving)\s+it\s+a\s+shot\b/i, term: 'give it a shot' },
    { pattern: /\b(?:called|call|calls|calling)\s+for\s+backup\b/i, term: 'call for backup' },
    { pattern: /\b(?:straightened|straighten|straightens|straightening)\s+out\b/i, term: 'straighten out' },
    { pattern: /\bbottom\s+line\b/i, term: 'bottom line' },
    { pattern: /\bsore\s+loser\b/i, term: 'sore loser' },
    { pattern: /\b(?:mop|mops|mopped|mopping)\s+the\s+floor\s+with\s+(?:me|you|him|her|us|them|someone)\b/i, term: 'mop the floor with someone' },
    { pattern: /\btied\s+up\b/i, term: 'tied up' },
    { pattern: /\bjump(?:s|ed|ing)?\s+bad\b/i, term: 'jump bad' },
];

const stopwords = new Set([
    'a','an','and','are','as','at','be','been','but','by','can','could','did','do','does','for','from',
    'had','has','have','he','her','him','his','i','if','in','is','it','its','me','my','of','on','or',
    'our','she','so','some','than','that','the','their','them','there','these','they','this','those',
    'to','us','was','we','were','what','when','where','which','who','why','will','with','would','you',
    'your','not','just','very','ever','whenever','whomever','more','most','much','any','all','only',
    'really','also','too','now','then'
]);

export function detectExpressions(sentence: string): string[] {
    // Keep the order in which the expressions actually occur in the scene.
    const matches = patterns.map(({pattern,term}) => ({term, index: sentence.search(pattern)}))
        .filter(match => match.index >= 0)
        .sort((a,b) => a.index - b.index);
    return [...new Set(matches.map(match => match.term))];
}

export function detectExpression(sentence: string): string | undefined {
    return detectExpressions(sentence)[0];
}

export function suggestTerms(sentence: string): string[] {
    const phrase = detectExpression(sentence);
    const words = sentence.match(/[a-z]+(?:['’][a-z]+)?(?:-[a-z]+)*/gi) ?? [];
    const filtered = Array.from(new Set(words.map((w) => w.toLowerCase())))
        .filter((w) => w.length > 3 && !stopwords.has(w))
        .slice(0, 12);
    return [...(phrase ? [phrase] : []), ...filtered.filter(w => w !== phrase)].slice(0, 13);
}
