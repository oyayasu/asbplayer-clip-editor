import React, { useEffect, useMemo, useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import { detectExpressions, suggestTerms } from './FluencyPhraseMatcher';
import { curated, dictionaryLookup, translationLookup, normalize } from './SmartDefinitionPanel';
import { MAX_MULTI_TERMS } from './FluencyMultiNoteType';

interface Props {
    sentence: string;
    word: string;
    values: Record<string,string>;
    onWordChange: (term: string) => void;
    onFieldsChange: (changes: Record<string,string>) => void;
}

type FluencyField = 'PartOfSpeech' | 'IPA' | 'EnglishDefinition' | 'Portuguese';
const fieldNames: FluencyField[] = ['PartOfSpeech','IPA','EnglishDefinition','Portuguese'];
const suffixFor = (index: number) => index === 0 ? '' : String(index + 1);
const nameFor = (index: number, field: string) => field + suffixFor(index);
const colors = ['#9471cc','#159c91','#d68a38','#518bbf','#b55b7c'];

export default function MultiVocabularyPanel({sentence, word, values, onWordChange, onFieldsChange}: Props) {
    const terms = useMemo(() => Array.from({length:MAX_MULTI_TERMS}, (_,i) =>
        i === 0 ? word : (values[nameFor(i,'Word')] || '')), [word,values]);
    const [slotCount,setSlotCount] = useState(Math.max(1,terms.reduce((m,t,i) => t.trim() ? i + 1 : m, 0)));
    const [working,setWorking] = useState<number[]>([]);
    const [messages,setMessages] = useState<Record<number,string>>({});
    const latest = useRef({values,terms});
    useEffect(() => { latest.current = {values,terms}; }, [values,terms]);

    // Auto-select known idioms from the scene, but do not replace an existing word.
    useEffect(() => {
        if (terms.some(t => t.trim())) return;
        const found = detectExpressions(sentence).slice(0,3);
        if (found.length === 0) return;
        onWordChange(found[0]);
        const changes: Record<string,string> = {};
        for (let i=1; i<found.length; i++) changes[nameFor(i,'Word')] = found[i];
        if (Object.keys(changes).length) onFieldsChange(changes);
        setSlotCount(Math.max(1, found.length));
    }, [sentence,terms,onWordChange,onFieldsChange]);

    useEffect(() => {
        const lastFilled = terms.reduce((m,t,i) => t.trim() ? i + 1 : m, 0);
        if (lastFilled > slotCount) setSlotCount(lastFilled);
    },[terms,slotCount]);

    // One request per selected term; no copying the first term's definition to others.
    const keys = terms.map(normalize).join('|');
    useEffect(() => {
        const active: AbortController[] = [];
        const actions: number[] = [];
        for (let index=0;index<MAX_MULTI_TERMS;index++) {
            const term=latest.current.terms[index]?.trim() || '';
            if (!term) continue;
            const current=latest.current.values;
            const needs = fieldNames.some(field => !current[nameFor(index,field)]?.trim());
            if (!needs) continue;
            const controller=new AbortController();
            active.push(controller);
            actions.push(index);
            const timer=setTimeout(async () => {
                if (controller.signal.aborted) return;
                setWorking(old => old.includes(index) ? old : [...old,index]);
                try {
                    const known=curated[normalize(term)];
                    const [dict,trans]=await Promise.allSettled([
                        known ? Promise.resolve(known) : dictionaryLookup(term,controller.signal),
                        known ? Promise.resolve(known.Portuguese) : translationLookup(term,controller.signal),
                    ]);
                    if (controller.signal.aborted || normalize(latest.current.terms[index]||'') !== normalize(term)) return;
                    const info=dict.status === 'fulfilled' ? dict.value : {};
                    const translation=trans.status === 'fulfilled' ? trans.value : '';
                    const candidate: Record<string,string> = {
                        PartOfSpeech: info.PartOfSpeech || '',
                        IPA: info.IPA || '',
                        EnglishDefinition: info.EnglishDefinition || '',
                        Portuguese: translation,
                    };
                    const changes:Record<string,string>={};
                    for(const field of fieldNames) {
                        const full=nameFor(index,field);
                        if (!latest.current.values[full]?.trim() && candidate[field]) changes[full]=candidate[field];
                    }
                    if (Object.keys(changes).length) {
                        // Do not override user-edited fields, and do not merge old term's meanings.
                        onFieldsChange(changes);
                    }
                    setMessages(old => ({...old,[index]:
                        !candidate.EnglishDefinition || !candidate.Portuguese
                            ? 'Definição incompleta. Confira o significado ou preencha manualmente.'
                            : known ? 'Expressão reconhecida. Verifique a cena.'
                            : 'Sugestão automática. Verifique se o significado combina com a cena.'
                    }));
                } catch {
                    if (!controller.signal.aborted) setMessages(old => ({...old,[index]:'Consulta indisponível. Preencha os campos manualmente.'}));
                } finally {
                    if (!controller.signal.aborted) setWorking(old => old.filter(x => x!==index));
                }
            },450);
            controller.signal.addEventListener('abort',()=>clearTimeout(timer),{once:true});
        }
        return () => active.forEach(controller=>controller.abort());
    // The effect intentionally only responds to term changes; editing definitions
    // must not cause another network request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    },[keys]);

    const changeWord = (index:number,value:string) => {
        const previous=terms[index];
        if (normalize(previous) === normalize(value) && previous === value) return;
        const reset:Record<string,string>={};
        for(const field of fieldNames)reset[nameFor(index,field)]='';
        if(index===0)onWordChange(value);
        else reset[nameFor(index,'Word')]=value;
        onFieldsChange(reset);
        setMessages(old=>({...old,[index]:''}));
    };

    const removeTerm = (index:number) => {
        const all: Array<Record<string,string>> = terms.map((text,i)=>({
            text,...Object.fromEntries(fieldNames.map(field=>[field,values[nameFor(i,field)] || '']))
        })).filter((_item,i)=>i!==index).filter(item=>item.text.trim());
        const patch:Record<string,string>={};
        for(let i=0;i<MAX_MULTI_TERMS;i++){
            if(i>0)patch[nameFor(i,'Word')]=all[i]?.text || '';
            for(const field of fieldNames) patch[nameFor(i,field)]=String(all[i]?.[field] || '');
        }
        onWordChange(all[0]?.text || '');
        onFieldsChange(patch);
        setSlotCount(Math.max(1,all.length));
        setMessages({});
    };

    const candidates = useMemo(() => suggestTerms(sentence)
        .filter(term=>!terms.some(existing=>normalize(existing)===normalize(term)))
        .slice(0,12), [sentence,terms]);
    const addTerm = (value='') => {
        if (slotCount>=MAX_MULTI_TERMS) return;
        const index=slotCount;
        setSlotCount(index+1);
        if(value)changeWord(index,value);
    };

    return <Box sx={{ gridColumn:'1 / -1',p:2, border:'1px solid',borderColor:'divider',borderRadius:2.5,bgcolor:'action.hover' }}>
        <Box sx={{ display:'flex',justifyContent:'space-between',gap:2,flexWrap:'wrap',alignItems:'center' }}>
            <Box>
                <Typography variant="h6" sx={{fontWeight:700}}>Vocabulary — uma cena, várias expressões</Typography>
                <Typography variant="caption" color="text.secondary">O áudio e a imagem são compartilhados. Cada expressão tem seu próprio significado.</Typography>
            </Box>
            <Chip size="small" variant="outlined" label={terms.slice(0,slotCount).filter(x=>x.trim()).length+' / '+MAX_MULTI_TERMS+' termos'}/>
        </Box>
        {slotCount>3 && <Alert severity="info" sx={{mt:1}}>Para memorizar melhor, considere dividir cenas com mais de 3 expressões em cartões separados.</Alert>}
        <Box sx={{display:'flex', flexWrap:'wrap',gap:0.8,my:1.5}}>
            {candidates.map(candidate=><Chip key={candidate} size="small" label={candidate} clickable
                onClick={()=>addTerm(candidate)} disabled={slotCount>=MAX_MULTI_TERMS}/>)}
        </Box>
        {Array.from({length:slotCount},(_,index)=>{
            const term=terms[index] || '';
            const active=working.includes(index);
            const suffix=suffixFor(index);
            return <Paper key={index} variant="outlined" sx={{borderRadius:2,p:1.5,mb:1.5,borderLeft:'4px solid '+colors[index]}}>
                <Box sx={{display:'flex',gap:1,alignItems:'center',mb:1}}>
                    <Typography variant="subtitle2" sx={{minWidth:24,color:colors[index],fontWeight:700}}>{String(index+1).padStart(2,'0')}</Typography>
                    <TextField fullWidth variant="outlined" size="small" label={'Expressão '+(index+1)}
                        placeholder={index===0?'sore loser':'mop the floor with someone'}
                        value={term} onChange={e=>changeWord(index,e.target.value)}/>
                    {active && <CircularProgress size={17}/>}
                    <IconButton title="Remover expressão" onClick={()=>removeTerm(index)} size="small"><DeleteOutlineIcon/></IconButton>
                </Box>
                <Box sx={{display:'grid',gridTemplateColumns:{xs:'1fr',sm:'1fr 1fr'},gap:1}}>
                    {fieldNames.map((field)=>{
                        const labels:Record<FluencyField,string>={PartOfSpeech:'Classificação',IPA:'IPA (opcional)',EnglishDefinition:'Definition (English)',Portuguese:'Significado em português'};
                        return <TextField key={field} size="small" fullWidth variant="outlined" multiline={field==='EnglishDefinition'||field==='Portuguese'}
                            label={labels[field]} value={values[field+suffix]||''}
                            onChange={e=>onFieldsChange({[field+suffix]:e.target.value})}/>;
                    })}
                </Box>
                {messages[index] && <Typography variant="caption" color="text.secondary" sx={{display:'block',mt:0.7}}>{messages[index]}</Typography>}
            </Paper>;
        })}
        <Button type="button" variant="outlined" startIcon={<AddIcon/>} disabled={slotCount>=MAX_MULTI_TERMS}
            onClick={()=>addTerm()} sx={{textTransform:'none',borderRadius:2}}>Adicionar expressão</Button>
        <Typography variant="caption" sx={{display:'block',mt:1.5}} color="text.secondary">
            Traduções automáticas e definições podem estar fora de contexto. Se algum campo não for encontrado, ele fica editável para revisão.
        </Typography>
    </Box>;
}
