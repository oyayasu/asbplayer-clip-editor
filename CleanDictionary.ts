import { resolveRemoteDictionary } from './remote-dictionary';
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
/**
 * Match a user's meaningful phrase inside a longer published dictionary
 * headword. Only use ordered contiguous words; do not fabricate synonyms.
 * E.g. "good graces" is a match for "in (someone's) good graces".
 */
export const idiomMatch=(term:string, phrase:string)=>{
    const simplify=(value:string)=>normalized(value)
        .replace(/[()[\]{}]/g,' ')
        .replace(/[’']/g,'')
        .replace(/[\\/–—-]/g,' ')
        .replace(/[^a-z0-9\s]/g,' ')
        .replace(/\s+/g,' ').trim();
    const target=simplify(term), candidate=simplify(phrase);
    if(!target || !candidate)return false;
    if(candidate===target)return true;
    // A single word is too ambiguous for substring matching.
    if(target.split(' ').length<2)return false;
    return (' '+candidate+' ').includes(' '+target+' ');
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


/**
 * Extract only matching idiom subentries when looking under an adjacent
 * headword (e.g. the singular final word). Exclude the parent word's
 * unrelated definitions.
 */
const parseNestedIdiom=(data:unknown, term:string):CleanSense[]=>{
    if(!Array.isArray(data))return [];
    const result:CleanSense[]=[];
    for(const entry of data){
        if(!entry || typeof entry!=='object')continue;
        for(const sub of Array.isArray(entry.dros)?entry.dros:[]){
            if(!idiomMatch(term,String(sub?.drp||'')))continue;
            const definitions=(Array.isArray(sub.shortdef)&&sub.shortdef.length
                ? sub.shortdef : nestedDefinitionTexts(sub.def));
            for(const item of definitions){
                const definition=tidy(item);
                if(definition && !/^see /.test(definition.toLowerCase()))result.push({
                    partOfSpeech:'idiom / phrase',definition,ipa:'',
                    label:definition.slice(0,95),
                    source:"Merriam-Webster Learner's Dictionary",
                });
            }
        }
    }
    return unique(result);
};

const headwordCandidates=(term:string):string[]=>{
    const tokens=normalized(term).replace(/[()[\\]{}]/g,'').split(/\\s+/).filter(Boolean);
    if(tokens.length<2)return [];
    const last=tokens[tokens.length-1];
    const singular=last.endsWith('ies') ? last.slice(0,-3)+'y'
        : last.endsWith('s') && last.length>3 ? last.slice(0,-1) : last;
    // First word handles phrasal verbs; final noun catches expressions
    // indexed under a headword, such as "good graces" under "grace".
    return [...new Set([tokens[0],singular])].filter(v=>v.length>2 && v!==normalized(term));
};

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
 * Merriam-Webster remains the first choice. WiktApi supplies additional
 * meanings even if Merriam-Webster finds the term. Existing online dictionary
 * fallbacks are only needed if both main sources have no entries.
 */
export async function lookupCleanTerm(term:string,mwKey=''):Promise<{senses:CleanSense[];warning?:string}>{
    const value=term.trim().slice(0,160);
    if(!value)throw Error('Digite um termo para pesquisar.');

    const [merriam,wiktapi]=await Promise.allSettled([
        mwKey ? fetchLearners(value,mwKey) : Promise.resolve([] as CleanSense[]),
        fetchWiktApi(value),
    ]);
    const primary=merriam.status==='fulfilled' ? merriam.value : [];
    const complementary=wiktapi.status==='fulfilled' ? wiktapi.value : [];
    let combined=unique([...primary,...complementary]);
    // If exact lookup fails, try related headwords and read ONLY their
    // dictionary-published idioms. This mimics website phrase search
    // without changing the user's typed term.
    if(!combined.length && mwKey && value.includes(' ')){
        const rootWords=headwordCandidates(value);
        const nested=await Promise.allSettled(rootWords.map(async root=>{
            const controller=new AbortController();
            const timer=setTimeout(()=>controller.abort(),5500);
            try{
                const url='https://www.dictionaryapi.com/api/v3/references/learners/json/'+
                    encodeURIComponent(root)+'?key='+encodeURIComponent(mwKey);
                const response=await fetch(url,{signal:controller.signal});
                if(!response.ok)return [];
                return parseNestedIdiom(await response.json(),value);
            }finally{clearTimeout(timer);}
        }));
        combined=unique(nested.flatMap(result=>result.status==='fulfilled'?result.value:[]));
    }
    if(combined.length){
        return {
            senses:combined,
            warning:merriam.status==='rejected' ? 'Merriam-Webster indisponível; outras fontes foram usadas.' :
                wiktapi.status==='rejected' ? 'WiktApi indisponível; Merriam-Webster respondeu.' : undefined,
        };
    }

    const errors=[
        ...(merriam.status==='rejected' ? ['Merriam-Webster: '+String(merriam.reason)] : []),
        ...(wiktapi.status==='rejected' ? ['WiktApi: '+String(wiktapi.reason)] : []),
    ];
    try{
        const fallback=await resolveRemoteDictionary(value);
        const senses=unique((Array.isArray(fallback)?fallback:[]).flatMap((entry:any)=>
            (entry.meanings||[]).flatMap((meaning:any)=>
                (meaning.definitions||[]).map((d:any)=>({
                    partOfSpeech:String(meaning.partOfSpeech||'expression'),
                    definition:tidy(d.definition),
                    ipa:String(entry.phonetics?.[0]?.text||''),
                    source:String(entry.provider||'Online dictionary'),
                    label:tidy(d.definition).slice(0,95),
                }))
            )));
        if(senses.length)return {senses,warning:errors.length ? errors.join('; ') : undefined};
    }catch(e){
        errors.push(String(e));
    }
    throw Error('Nenhuma definição encontrada para "'+value+'".'+
        (errors.length ? ' Fontes: '+errors.join('; ') : ' Tente outra grafia ou forma-base.'));
}
