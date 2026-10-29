import { lookupIndividualDictionary } from './remote-dictionary';
import type { IndividualDictionary } from './remote-dictionary';
import { fetchWiktApi } from './wiktapi-provider';

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
// Merriam-Webster nests idiom definitions under def[].sseq[][] with
// ["sense", {dt:[["text", "{bc}definition ..."]]}] nodes.
const nestedDefinitionTexts=(node:unknown):string[]=>{
    const values:string[]=[];
    const walk=(part:any)=>{
        if(Array.isArray(part)){
            if(part[0]==='text' && typeof part[1]==='string'){
                values.push(part[1]);return;
            }
            for(const child of part)walk(child);
        } else if(part && typeof part==='object'){
            for(const [key,value] of Object.entries(part)){
                if(key==='dt'||key==='sseq'||key==='sense'||key==='def')walk(value);
            }
        }
    };
    walk(node);
    return values;
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
            const textDefs=short.length?short:nestedDefinitionTexts(sub.def);
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

/**
 * No definitions from different providers are merged. Auto checks providers
 * in priority order; selecting a provider searches only that provider.
 * TheFreeDictionary is linked externally until Farlex grants API access.
 */
export type CleanDictionarySource =
    'auto' | 'merriam' | 'wiktapi' | IndividualDictionary;

const sources:Exclude<CleanDictionarySource,'auto'>[]=[
    'merriam','wiktapi','wiktionary','datamuse','freeDictionary'
];

const convertOther=(payload:any[]):CleanSense[]=>unique(
    payload.flatMap((entry:any)=>
        (entry.meanings||[]).flatMap((meaning:any)=>
            (meaning.definitions||[]).map((d:any)=>({
                partOfSpeech:String(meaning.partOfSpeech||'expression'),
                definition:tidy(d.definition),
                ipa:String(entry.phonetics?.[0]?.text||''),
                source:String(entry.provider||'Online dictionary'),
                label:tidy(d.definition).slice(0,95),
            }))
        ))
);

const fromProvider=async(term:string,key:string,source:Exclude<CleanDictionarySource,'auto'>):Promise<CleanSense[]>=>{
    if(source==='merriam'){
        if(!key.trim())throw Error('Configure sua chave gratuita Merriam-Webster nas opções do dicionário.');
        return fetchLearners(term,key);
    }
    if(source==='wiktapi')return unique(await fetchWiktApi(term));
    return convertOther(await lookupIndividualDictionary(term,source));
};

export async function lookupCleanTerm(
    term:string,mwKey='',source:CleanDictionarySource='auto'
):Promise<{senses:CleanSense[];provider:string;warning?:string}>{
    const value=term.trim().slice(0,160);
    if(!value)throw Error('Digite um termo para pesquisar.');
    if(source!=='auto' && !sources.includes(source))
        throw Error('Fonte de dicionário inválida.');

    const selected=source==='auto'
        ? sources.filter(provider=>provider!=='merriam'||Boolean(mwKey.trim()))
        : [source];

    const errors:string[]=[];
    for(const provider of selected){
        try {
            const senses=await fromProvider(value,mwKey,provider);
            if(senses.length)
                return {senses,provider};
        }catch(e){
            const detail=e instanceof Error?e.message:String(e);
            errors.push(provider+': '+detail);
        }
    }
    const message=source==='auto'
        ? 'Nenhum dos dicionários disponíveis encontrou uma definição.'
        : 'Nenhuma definição encontrada nesta fonte.';
    throw Error(message+(errors.length?' '+errors.join(' | '):' Tente outra fonte no seletor.'));
}
