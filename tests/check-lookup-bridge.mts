import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fluencyGetJson } from '../asbplayer/common/components/FluencyLookupTransport.ts';

const source=readFileSync('asbplayer/extension/src/handlers/video/http-post-handler.ts','utf8');
assert(source.includes('sendResponse({fluencyDictionary:result})'),
  'The handler must wrap dictionary arrays before the frame bridge spreads the response.');

const entries=[
  {word:'test term',meanings:[{partOfSpeech:'noun',definitions:[{definition:'A definition supplied by an online dictionary.'}]}],phonetics:[]},
];
const oldBridgeReply={...entries,messageId:'request-123'};
assert.equal(Array.isArray(oldBridgeReply),false,'The original regression must be reproducible');

const simulatedBridgeReply={fluencyDictionary:entries,messageId:'request-123'};
const got=await fluencyGetJson('dictionary','a freely typed term',new AbortController().signal,async()=>simulatedBridgeReply);
assert(Array.isArray(got),'Dictionary reply must stay an array after crossing the bridge');
assert.equal((got as typeof entries)[0].meanings[0].partOfSpeech,'noun');
assert.equal((got as typeof entries)[0].meanings[0].definitions[0].definition,entries[0].meanings[0].definitions[0].definition);

const translation={responseStatus:200,responseData:{translatedText:'tradução'},messageId:'request-124'};
const translated=await fluencyGetJson('translation','a freely typed term',new AbortController().signal,async()=>translation);
assert.equal((translated as typeof translation).responseData.translatedText,'tradução','Translation remains unchanged');

console.log('OK: dictionary entries, word classes and definitions survive the frame bridge; translation also works.');
