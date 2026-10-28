import { resolveRemoteDictionary } from '../asbplayer/extension/src/services/remote-dictionary.ts';

const samples = ['adulation', 'unpredictable', 'take for granted'];
for (const term of samples) {
  const start=Date.now();
  try {
    const data=await resolveRemoteDictionary(term);
    console.log(JSON.stringify({term,ms:Date.now()-start,entries:data?.length,provider:data?.[0]?.provider,meanings:data?.[0]?.meanings?.length,firstPOS:data?.[0]?.meanings?.[0]?.partOfSpeech,firstDefinition:data?.[0]?.meanings?.[0]?.definitions?.[0]?.definition?.slice(0,120),IPA:data?.[0]?.phonetics?.[0]?.text}));
    if(term==='adulation'&&!data?.[0]?.meanings?.[0]?.definitions?.[0]?.definition)throw Error('Found translation but no actual English definition');
  } catch(e) {
    console.error(JSON.stringify({term,ms:Date.now()-start,error:String(e)}));
    process.exitCode=1;
  }
}
