/**
 * STANDS4 Phrases API (Phrases.com).
 * Official docs: https://www.phrases.com/phrases_api.php
 * Endpoint: https://www.stands4.com/services/v2/phrases.php
 * Requires a developer UID and token. Never bundle those credentials.
 * The response gives phrase explanations and examples but generally no IPA.
 */
export type Stands4PhraseSense = {
    partOfSpeech: string;
    definition: string;
    ipa: string;
    source: string;
    label: string;
};
type Result = {term?:unknown;explanation?:unknown;example?:unknown};
const string = (value:unknown) => typeof value === 'string' ? value.replace(/\s+/g,' ').trim() : '';
const simplify = (value:string) => value.toLowerCase().replace(/\s+/g,' ').replace(/[.?!;:]$/,'').trim();

export function parseStands4Phrases(payload:unknown,requestedTerm:string):Stands4PhraseSense[] {
    if(!payload || typeof payload!=='object')return [];
    const body=payload as {results?:unknown;result?:unknown;error?:unknown};
    if(body.error)return [];
    const wrapper=body.results && typeof body.results==='object'
       ? body.results as {result?:unknown} : body;
    const raw=wrapper.result;
    const array=Array.isArray(raw)?raw:(raw&&typeof raw==='object'?[raw]:[]);
    const unique=new Set<string>();
    const result:Stands4PhraseSense[]=[];
    for(const item of array as Result[]){
        if(!item || typeof item!=='object')continue;
        const definition=string(item.explanation);
        const headword=string(item.term);
        if(!definition)continue;
        // This API may return several related phrases; all are explicitly
        // labeled in the sense, rather than silently misattributed.
        const label=headword && simplify(headword)!==simplify(requestedTerm)
            ? headword+' — '+definition.slice(0,100)
            : definition.slice(0,100);
        const key=simplify(headword)+'|'+simplify(definition);
        if(unique.has(key))continue;
        unique.add(key);
        result.push({
          partOfSpeech:'expression',
          definition,
          ipa:'',
          source:'STANDS4 Phrases',
          label,
        });
        if(result.length>=15)break;
    }
    return result;
}

export async function fetchStands4Phrases(
    term:string, uid:string, token:string
):Promise<Stands4PhraseSense[]>{
    if(!uid.trim()||!token.trim())throw Error('Configure seu usuário e token STANDS4 nas opções do dicionário.');
    const endpoint='https://www.stands4.com/services/v2/phrases.php';
    const query=new URLSearchParams({
       uid:uid.trim(),tokenid:token.trim(),phrase:term.trim(),format:'json'
    });
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),6500);
    try{
       const response=await fetch(endpoint+'?'+query.toString(),{
           signal:controller.signal,headers:{accept:'application/json'}
       });
       if(response.status===429)throw Error('Limite de consultas da STANDS4 atingido (100 por dia no plano gratuito).');
       if(!response.ok)throw Error('STANDS4 HTTP '+response.status);
       const payload:unknown=await response.json();
       if(payload && typeof payload==='object' && 'error' in payload){
           throw Error('STANDS4 recusou a consulta. Confira o acesso e as credenciais.');
       }
       return parseStands4Phrases(payload,term);
    }finally{clearTimeout(timeout);}
}
