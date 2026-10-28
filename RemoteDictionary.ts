/**
 * Remote-only English dictionary resolver.
 * No bundled definitions or term-specific responses.
 * Sources: Wiktionary, Datamuse and Free Dictionary API.
 * The two first sources are queried independently; the third is a fallback.
 */
type Definition = { definition: string; example?: string };
type Meaning = { partOfSpeech: string; definitions: Definition[] };
type Entry = { meanings: Meaning[]; phonetics: Array<{text:string}>; provider: string };

const normalizeTerm=(term:string)=>term.trim().toLowerCase().replace(/\s+/g,' ');
const decode=(text:string)=>text
  .replace(/&nbsp;|&#160;/gi,' ')
  .replace(/&amp;/gi,'&').replace(/&quot;/gi,'"')
  .replace(/&apos;|&#39;|&#x27;/gi,"'")
  .replace(/&lt;/gi,'<').replace(/&gt;/gi,'>')
  .replace(/&#(\d+);/g,(_,v)=>String.fromCodePoint(Number(v)))
  .replace(/&#x([\da-f]+);/gi,(_,v)=>String.fromCodePoint(parseInt(v,16)));
const plain=(html:string)=>decode(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')
   .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'')
   .replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()).slice(0,950);
const timeoutFetch=async(url:string, ms=4000):Promise<any>=>{
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),ms);
  try {
    const response=await fetch(url,{signal:controller.signal,headers:{accept:'application/json'}});
    if(response.status===404)return null;
    if(!response.ok)throw Error('HTTP '+response.status);
    return await response.json();
  } finally { clearTimeout(timer); }
};
async function wiktionary(term:string):Promise<Entry|null>{
  const data=await timeoutFetch('https://en.wiktionary.org/api/rest_v1/page/definition/'+encodeURIComponent(term));
  if(!data||!Array.isArray(data.en))return null;
  const meanings:Meaning[]=data.en.map((entry:any)=>({
    partOfSpeech:String(entry.partOfSpeech||'').toLowerCase(),
    definitions:(Array.isArray(entry.definitions)?entry.definitions:[])
       .map((d:any)=>({definition:plain(String(d.definition||'')),example:plain(String(d.examples?.[0]||''))}))
       .filter((d:Definition)=>d.definition.length>5).slice(0,8)
  })).filter((m:Meaning)=>m.definitions.length>0);
  return meanings.length?{meanings,phonetics:[],provider:'Wiktionary'}:null;
}
async function datamuse(term:string):Promise<Entry|null>{
  const params=new URLSearchParams({sp:term,md:'dpr',ipa:'1',max:'10'});
  const data=await timeoutFetch('https://api.datamuse.com/words?'+params.toString());
  if(!Array.isArray(data))return null;
  const exact=data.find((v:any)=>normalizeTerm(String(v.word||''))===normalizeTerm(term));
  if(!exact)return null;
  const defs:Array<string>=Array.isArray(exact.defs)?exact.defs:[];
  const meanings:Meaning[]=[];
  for(const def of defs.slice(0,14)){
    const [part, ...rest]=def.split('\t');
    const definition=rest.join(' ').trim();
    if(!definition)continue;
    const partOfSpeech:Record<string,string>={adj:'adjective',adv:'adverb',n:'noun',v:'verb',u:'expression'};
    const pos=partOfSpeech[part]||part||'expression';
    let m=meanings.find(m=>m.partOfSpeech===pos);
    if(!m){m={partOfSpeech:pos,definitions:[]};meanings.push(m);}
    m.definitions.push({definition});
  }
  const pron=Array.isArray(exact.tags)?exact.tags.find((t:any)=>typeof t==='string'&&t.startsWith('pron:')):undefined;
  const pronunciation=pron?String(pron).slice(5).trim():'';
  const phonetics=pronunciation?[{text:pronunciation.startsWith('/')?pronunciation:'/'+pronunciation+'/'}]:[];
  return meanings.length||phonetics.length?{meanings,phonetics,provider:'Datamuse'}:null;
}
async function freeDictionary(term:string):Promise<Entry|null>{
  const data=await timeoutFetch('https://api.dictionaryapi.dev/api/v2/entries/en/'+encodeURIComponent(term),3500);
  const first=Array.isArray(data)?data[0]:null;
  if(!first)return null;
  return {
    meanings:(Array.isArray(first.meanings)?first.meanings:[]).map((m:any)=>({
      partOfSpeech:String(m.partOfSpeech||''),
      definitions:(Array.isArray(m.definitions)?m.definitions:[])
        .map((d:any)=>({definition:String(d.definition||'').slice(0,950),example:String(d.example||'')}))
        .filter((d:Definition)=>d.definition).slice(0,8)
    })),
    phonetics:(Array.isArray(first.phonetics)?first.phonetics:[])
      .filter((p:any)=>typeof p.text==='string'&&p.text.length>2)
      .map((p:any)=>({text:p.text})),
    provider:'Free Dictionary API'
  };
}
export async function resolveRemoteDictionary(term:string):Promise<any>{
  const [wik,dat]=await Promise.allSettled([wiktionary(term),datamuse(term)]);
  const sources:Entry[]=[];
  if(wik.status==='fulfilled'&&wik.value)sources.push(wik.value);
  if(dat.status==='fulfilled'&&dat.value)sources.push(dat.value);
  if(sources.every(s=>s.meanings.length===0)){
    try {const free=await freeDictionary(term);if(free)sources.push(free);}catch{}
  }
  const allMeanings=sources.flatMap(s=>s.meanings);
  const phonetic=sources.flatMap(s=>s.phonetics).find(p=>p.text.startsWith('/'))||
                 sources.flatMap(s=>s.phonetics)[0];
  if(!allMeanings.length){
    const reasons=[wik,dat].filter(x=>x.status==='rejected').map(x=>String((x as PromiseRejectedResult).reason));
    if(reasons.length===2)throw Error('Dicionários online indisponíveis ('+reasons.slice(0,2).join('; ')+')');
    return [];
  }
  return [{word:term, meanings:allMeanings, phonetics:phonetic?[phonetic]:[],
    provider:sources.map(s=>s.provider).join(' + ')}];
}
