import assert from 'node:assert/strict';
import {detectExpression, suggestTerms} from '../FluencyPhraseMatcher.ts';

const samples = [
 ['Michael tends to procrastinate a bit whenever he has to do work.', 'tend to'],
 ["I can't figure out what happened.", 'figure out'],
 ['They worked things out last night.', 'work things out'],
 ['She holds a grudge.', 'hold a grudge'],
 ['We ended up staying home.', 'end up'],
 ['He is a sore loser.', 'sore loser'],
 ['This is a lightbulb.', undefined],
];
for (const [text, expected] of samples) {
    assert.equal(detectExpression(text), expected, text);
}
const terms = suggestTerms('Michael tends to procrastinate a bit whenever he has to do work.');
assert.equal(terms[0], 'tend to');
assert(terms.includes('procrastinate'));
assert(!terms.includes('the'));
console.log('OK: auto-select known expressions, preserve selectable individual vocabulary, avoid unsupported guesses.');
