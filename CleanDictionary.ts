import { resolveRemoteDictionary } from './remote-dictionary';

export type CleanSense = {partOfSpeech:string; definition:string; ipa:string; source:string; label:string};
const tidy=(value:unknown)=>String(value||'').replace(/\{[^}]*\}/g,'').replace(/\s+/g,' ').trim();
const normalized=(v:unknown)=>tidy(v).toLowerCase().replace(/\s+/g,' ').replace(/[.!?,;:]$/,'');
const unique=(items:CleanSense[])=>{
    const seen=new Set<string>();
    return items.filter(s=>{
       const key=s.partOfSpeech+'|'+s.definition;
       if(!s.definition || seen.has(key))return false;
       seen.add(key);
       return true;
    }).slice(0,12);
};
const idiomMatch=(term:string, phrase:string)=>{
    const target=normalized(term), candidate=normalized(phrase);
    return candidate===target || candidate.replace(/[\[\]()*]/g,'')===target;
};

export function parseMerriamWebsterLearners(data:unknown,term:string):CleanSense[]{
    if(!Array.isArray(data))return [];
    const list:CleanSense[]=[];
    for(const entry of data){
        if(!entry||typeof entry!=='object'||!entry.meta)continue;
        const ipa=String(entry.hwi?.prs?.[0]?.ipa||entry.hwi?.altprs?.pr?.ipa||'').trim();
        const phonetic=ipa ? '/'+ipa.replace(/^\/|\/$/g,'')+'/' : '';
        const basePos=String(entry.fl||'expression');
        const baseHw=String(entry.hwi?.hw||entry.meta?.id||'').replaceAll('*','');
        const direct=idiomMatch(term,baseHw)||normalized(String(entry.meta?.id||'').split(':')[0])===normalized(term);
        if(direct){
            const defs=Array.isArray(entry.shortdef)?entry.shortdef:[];
            for(const item of defs.slice(0,6)){
                const definition=tidy(item);
                if(definition && !/^see /.test(definition.toLowerCase()))list.push({
                  partOfSpeech:basePos,definition,ipa:phonetic,
                  label:definition.slice(0,95),
                  source:"Merriam-Webster Learner's Dictionary"
                });
            }
        }
        const dros=Array.isArray(entry.dros)?entry.dros:[];
        for(const sub of dros){
            if(!idiomMatch(term,String(sub?.drp||'')))continue;
            const short=Array.isArray(sub.shortdef)?sub.shortdef:[];
            const textDefs=short.length?short:(
                Array.isArray(sub.def)?sub.def.flatMap((d:any)=>
                  Array.isArray(d?.sseq)?d.sseq.flat(3)
                    .filter((x:any)=>Array.isArray(x)&&x[0]==='text')
                    .map((x:any)=>x[1]):[]):[]);
            for(const def of textDefs.slice(0,6)){
                const definition=tidy(def);
                if(definition)list.push({
                    partOfSpeech:'idiom / phrase',definition,ipa:'',label:definition.slice(0,95),
                    source:"Merriam-Webster Learner's Dictionary"
                });
            }
        }
    }
    return unique(list);
}

const fetchLearners=async(term:string,key:string):Promise<CleanSense[]>=>{
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),6500);
    try{
        const url='https://www.dictionaryapi.com/api/v3/references/learners/json/'+
           encodeURIComponent(term)+'?key='+encodeURIComponent(key);
        const res=await fetch(url,{signal:controller.signal});
        if(!res.ok)throw Error('Merriam-Webster HTTP '+res.status);
        const data=await res.json();
        return parseMerriamWebsterLearners(data,term);
    }finally{clearTimeout(timer);}
};

export async function lookupCleanTerm(term:string,mwKey=''):Promise<{senses:CleanSense[];warning?:string}>{
    const value=term.trim().slice(0,160);
    if(!value)throw Error('Digite um termo para pesquisar.');
    let mwError='';
    if(mwKey){
        try{
            let senses=await fetchLearners(value,mwKey);
            // Multi-word idioms are often nested under their base verb/noun.
            if(!senses.length && value.includes(' ')){
                const first=value.split(/\s+/)[0];
                const nested=await fetchLearners(first,mwKey);
                senses=nested.filter(s=>s.partOfSpeech==='idiom / phrase');
            }
            if(senses.length)return{senses};
        }catch(e){mwError=String(e);}
    }
    try{
        const fallback=await resolveRemoteDictionary(value);
        const senses=unique((Array.isArray(fallback)?fallback:[]).flatMap((entry:any)=>
            (entry.meanings||[]).flatMap((meaning:any)=>
                (meaning.definitions||[]).map((d:any,i:number)=>({
                    partOfSpeech:String(meaning.partOfSpeech||'expression'),
                    definition:tidy(d.definition),
                    ipa:String(entry.phonetics?.[0]?.text||''),
                    source:String(entry.provider||'Online dictionary'),
                    label:tidy(d.definition).slice(0,95)
                }))
            )));
        if(senses.length)return{senses,warning:mwError?'Merriam-Webster unavailable; online alternatives used.':undefined};
    }catch(e){
        throw Error(mwError ? 'Fontes indisponíveis: '+mwError+'; '+String(e):String(e));
    }
    throw Error('Nenhuma definição encontrada para "'+value+'". Tente a forma-base ou outra grafia.');
}
