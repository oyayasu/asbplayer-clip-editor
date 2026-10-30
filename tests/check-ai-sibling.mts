import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {buildAIPrompt,parseAIResult,mergeAIResult,AI_PROVIDERS} from '../AiPrompt.ts';

const entry=(term:string)=>({
  term,partOfSpeech:'',ipa:'',definition:'',source:''
});
const entries=[entry('snap'),entry('throw around'),entry('good graces')];
const prompt=buildAIPrompt("She'd snap me like a twig.",entries);
assert(prompt.includes("She'd snap me like a twig."));
assert(prompt.includes('"throw around"'));
assert(prompt.includes('"good graces"'));
assert(prompt.includes('Return ONLY a valid JSON object'));
assert(prompt.includes('IPA'));
assert(!prompt.includes('Translate into Portuguese'));
assert.equal(Object.keys(AI_PROVIDERS).length,3);

const reply=JSON.stringify({version:1,entries:[
  {term:'snap',partOfSpeech:'verb',ipa:'/snæp/',definition:'To break suddenly with a sharp sound.',alternativeDefinitions:['To speak sharply.']},
  {term:'throw around',partOfSpeech:'phrasal verb',ipa:'',definition:'To discuss ideas casually.',alternativeDefinitions:[]},
  {term:'good graces',partOfSpeech:'noun phrase',ipa:'',definition:'Favor or approval.',alternativeDefinitions:[]}
]});
const parsed=parseAIResult('Here is the JSON:\n'+reply,entries);
assert.equal(parsed.entries.length,3);
assert.equal(parsed.entries[1].partOfSpeech,'phrasal verb');
assert.equal(parsed.entries[0].alternativeDefinitions[0],'To speak sharply.');
const updated=mergeAIResult(entries,parsed,'gemini');
assert.equal(updated[1].definition,'To discuss ideas casually.');
assert.equal(updated[2].source,'AI · Gemini');
assert.equal(updated[0].ipa,'/snæp/');
const padded=parseAIResult('~~~\n'+reply+'\n~~~',entries);
assert.equal(padded.entries.length,3);

assert.throws(()=>parseAIResult('not JSON',entries),/JSON/);
assert.throws(()=>parseAIResult(
  JSON.stringify({version:1,entries:[{term:'wrong',partOfSpeech:'noun',definition:'foo'}]}),
  [entry('snap')]),/não corresponde/);
assert.throws(()=>parseAIResult(
  JSON.stringify({version:1,entries:[{term:'snap',partOfSpeech:'noun',definition:'foo'}]}),entries),
  /quantidade/);
assert.throws(()=>parseAIResult(
  JSON.stringify({version:1,entries:[{term:'snap',partOfSpeech:'noun',definition:''}]}),
  [entry('snap')]),/não preencheu/);

const panel=readFileSync('AiDefinitionPanel.tsx','utf8');
const manifest=readFileSync('wxt.config.ts','utf8');

assert(panel.includes('navigator.clipboard.writeText(prompt)'));
assert(panel.includes('parseAIResult(text,entries)'));
assert(panel.includes('navigator.clipboard.readText()'));
assert(panel.includes('onEntriesChange(previous=>mergeAIResult'));
assert(manifest.includes('https://chatgpt.com/*'));

console.log('PASS: AI sibling, contextual prompts, strict JSON and automation handler verification.');
