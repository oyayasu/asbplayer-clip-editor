import React, { useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { MAX_CLEAN_TERMS } from './CleanNoteType';

export type CleanRequest = (input:{action:'fluencyCleanLookup'|'fluencySetKey'|'fluencyKeyStatus';term?:string;key?:string})=>Promise<any>;
interface Sense {partOfSpeech:string;definition:string;ipa:string;source:string;label:string}
interface Props {
  word:string;
  values:Record<string,string>;
  onWordChange:(word:string)=>void;
  onFieldsChange:(fields:Record<string,string>)=>void;
  request:CleanRequest;
}
const fields=['PartOfSpeech','IPA','EnglishDefinition','DictionarySource'];
const full=(n:number,k:string)=>k+(n===0?'':n+1);
const normalize=(s:string)=>s.trim().toLowerCase().replace(/\s+/g,' ');

export default function CleanDefinitionPanel({word,values,onWordChange,onFieldsChange,request}:Props) {
  const terms=useMemo(()=>Array.from({length:MAX_CLEAN_TERMS},(_,n)=>n===0?word:values[full(n,'Word')]||''),[word,values]);
  const [count,setCount]=useState(Math.max(1,terms.reduce((max,t,i)=>t.trim()?i+1:max,0)));
  const [loading,setLoading]=useState<number[]>([]);
  const [errors,setErrors]=useState<Record<number,string>>({});
  const [senses,setSenses]=useState<Record<number,Sense[]>>({});
  const [retry,setRetry]=useState(0);
  const [showKey,setShowKey]=useState(false);
  const [key,setKey]=useState('');
  const [hasKey,setHasKey]=useState(false);
  const [keyMessage,setKeyMessage]=useState('');
  const ref=useRef({terms,values,onFieldsChange});
  useEffect(()=>{ref.current={terms,values,onFieldsChange};},[terms,values,onFieldsChange]);
  useEffect(()=>{void request({action:'fluencyKeyStatus'}).then(r=>setHasKey(Boolean(r?.configured))).catch(()=>{});},[request]);
  useEffect(()=>{
    const last=terms.reduce((max,t,i)=>t.trim()?i+1:max,0);
    if(last>count)setCount(last);
  },[terms,count]);

  const termKeys=terms.map(normalize).join('\u0001');
  useEffect(()=>{
    const controllers:{cancelled:boolean}[]=[];
    const timers:Array<ReturnType<typeof setTimeout>>=[];
    for(let index=0;index<count;index++){
      const term=ref.current.terms[index]?.trim()||'';
      if(!term)continue;
      const controller={cancelled:false};
      controllers.push(controller);
      const timer=setTimeout(async()=>{
        if(controller.cancelled)return;
        setLoading(p=>[...new Set([...p,index])]);
        setErrors(p=>({...p,[index]:''}));
        try{
          const response=await request({action:'fluencyCleanLookup',term});
          if(controller.cancelled||normalize(ref.current.terms[index]||'')!==normalize(term))return;
          if(response?.error)throw Error(String(response.error));
          const result=Array.isArray(response?.senses)?response.senses as Sense[]:[];
          if(!result.length)throw Error('Nenhuma definição encontrada.');
          setSenses(p=>({...p,[index]:result}));
          const current=ref.current.values;
          const update:Record<string,string>={};
          const selected=result[0];
          if(!current[full(index,'PartOfSpeech')])update[full(index,'PartOfSpeech')]=selected.partOfSpeech||'';
          if(!current[full(index,'IPA')])update[full(index,'IPA')]=selected.ipa||'';
          if(!current[full(index,'EnglishDefinition')])update[full(index,'EnglishDefinition')]=selected.definition||'';
          if(!current[full(index,'DictionarySource')])update[full(index,'DictionarySource')]=selected.source||'';
          if(Object.keys(update).length)ref.current.onFieldsChange(update);
        }catch(e){
          if(!controller.cancelled)setErrors(p=>({...p,[index]:String(e instanceof Error?e.message:e)}));
        }finally{
          if(!controller.cancelled)setLoading(p=>p.filter(i=>i!==index));
        }
      },600);
      timers.push(timer);
    }
    return()=>{controllers.forEach(c=>c.cancelled=true);timers.forEach(clearTimeout);};
  },[termKeys,count,retry,request]);

  const changeTerm=(index:number,value:string)=>{
    const clear:Record<string,string>={};
    for(const field of fields)clear[full(index,field)]='';
    if(index===0)onWordChange(value);
    else clear[full(index,'Word')]=value;
    onFieldsChange(clear);
    setSenses(p=>({...p,[index]:[]}));
    setErrors(p=>({...p,[index]:''}));
  };
  const removeTerm=(index:number)=>{
    const remaining=terms.map((term,i)=>({
      term,...Object.fromEntries(fields.map(f=>[f,values[full(i,f)]||'']))
    })).filter((_,i)=>i!==index).filter(item=>item.term.trim());
    const patch:Record<string,string>={};
    for(let i=0;i<MAX_CLEAN_TERMS;i++){
      if(i>0)patch[full(i,'Word')]=remaining[i]?.term||'';
      for(const f of fields)patch[full(i,f)]=String(remaining[i]?.[f]||'');
    }
    onWordChange(remaining[0]?.term||'');
    onFieldsChange(patch);
    setCount(Math.max(1,remaining.length));
    setSenses({});
    setErrors({});
    setRetry(r=>r+1);
  };
  const choose=(index:number,sense:Sense)=>{
    onFieldsChange({
      [full(index,'PartOfSpeech')]:sense.partOfSpeech,
      [full(index,'IPA')]:sense.ipa,
      [full(index,'EnglishDefinition')]:sense.definition,
      [full(index,'DictionarySource')]:sense.source
    });
  };
  const saveKey=async()=>{
    try {
      const status=await request({action:'fluencySetKey',key:key.trim()});
      if(status?.error)throw Error(String(status.error));
      setKey('');setHasKey(Boolean(status.configured));
      setKeyMessage(status.configured?'Chave salva somente no Brave.':'Chave removida.');
    } catch(e){setKeyMessage('Não foi possível salvar a chave: '+String(e));}
  };
  return <Box sx={{gridColumn:'1/-1',minWidth:0,display:'flex',flexDirection:'column',gap:1.5,
     border:'1px solid',borderColor:'divider',borderRadius:3,p:2,overflow:'hidden'}}>
    <Box sx={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:1}}>
      <Box sx={{minWidth:0}}>
        <Typography variant="h6" fontWeight={750}>Definition</Typography>
        <Typography variant="caption" color="text.secondary">Type a word, phrasal verb or idiom. English definitions are filled automatically.</Typography>
      </Box>
      <IconButton onClick={()=>setShowKey(v=>!v)} title="Dictionary settings"><SettingsOutlinedIcon/></IconButton>
    </Box>
    {showKey&&<Box sx={{p:1.5,bgcolor:'action.hover',borderRadius:2,display:'flex',flexDirection:'column',gap:1}}>
      <Typography variant="subtitle2">Dictionary source</Typography>
      <Typography variant="caption" color="text.secondary">
        Merriam-Webster Learner's is preferred when you provide your free API key; Wiktionary and other online dictionaries are used as backups.
      </Typography>
      <Box sx={{display:'flex',gap:1,alignItems:'center',flexWrap:'wrap'}}>
        <TextField type="password" variant="outlined" label={hasKey?'Replace Merriam-Webster API key':'Merriam-Webster API key'} size="small"
            value={key} onChange={e=>setKey(e.target.value)} sx={{flex:1,minWidth:180}}/>
        <Button variant="outlined" onClick={()=>void saveKey()} disabled={!key.trim()}>Save key</Button>
        {hasKey&&<Button onClick={()=>{setKey('');void request({action:'fluencySetKey',key:''}).then(()=>{setHasKey(false);setKeyMessage('Chave removida.');});}}>Remove</Button>}
      </Box>
      <Typography variant="caption" color="text.secondary">{keyMessage||(hasKey?'Merriam-Webster connected':'Online fallback available without a key')}</Typography>
    </Box>}
    {Array.from({length:count},(_,index)=>{
      const value=terms[index]||'';
      const choices=senses[index]||[];
      const isLoading=loading.includes(index);
      return <Box key={index} sx={{display:'flex',flexDirection:'column',gap:1,p:1.5,bgcolor:'action.hover',borderRadius:2,minWidth:0}}>
        <Box sx={{display:'flex',alignItems:'center',gap:1,minWidth:0}}>
          <Typography variant="caption" color="primary" fontWeight={700}>{String(index+1).padStart(2,'0')}</Typography>
          <TextField size="small" variant="outlined" label="Word or expression" fullWidth
            placeholder="Enter any term"
            value={value} onChange={e=>changeTerm(index,e.target.value)}
            sx={{minWidth:0,flex:1}}/>
          {isLoading?<CircularProgress size={18}/>:null}
          <IconButton onClick={()=>setRetry(r=>r+1)} title="Search again" disabled={!value.trim()||isLoading} size="small"><RefreshIcon/></IconButton>
          {count>1&&<IconButton onClick={()=>removeTerm(index)} title="Remove term" size="small"><DeleteOutlineIcon/></IconButton>}
        </Box>
        {Boolean(errors[index])&&<Alert severity="warning" sx={{py:0}}>{errors[index]}</Alert>}
        {choices.length>1&&
          <FormControl fullWidth size="small">
            <InputLabel id={'sense-'+index}>Dictionary sense</InputLabel>
            <Select labelId={'sense-'+index} label="Dictionary sense"
              value={Math.max(0,choices.findIndex(s=>s.definition===values[full(index,'EnglishDefinition')]))}
              onChange={e=>choose(index,choices[Number(e.target.value)])}>
              {choices.map((sense,i)=><MenuItem key={i} value={i} sx={{whiteSpace:'normal',fontSize:13}}>
                {String(i+1)+'. '+sense.definition.slice(0,130)}
              </MenuItem>)}
            </Select>
          </FormControl>}
        <Box sx={{display:'grid',gridTemplateColumns:{xs:'1fr',sm:'minmax(0,1fr) minmax(0,1fr)'},gap:1}}>
          <TextField size="small" label="Part of speech" fullWidth value={values[full(index,'PartOfSpeech')]||''}
            onChange={e=>onFieldsChange({[full(index,'PartOfSpeech')]:e.target.value})}/>
          <TextField size="small" label="IPA (if available)" fullWidth value={values[full(index,'IPA')]||''}
            onChange={e=>onFieldsChange({[full(index,'IPA')]:e.target.value})}/>
        </Box>
        <TextField size="small" label="Definition (English)" fullWidth multiline minRows={2} maxRows={4}
           value={values[full(index,'EnglishDefinition')]||''}
           onChange={e=>onFieldsChange({[full(index,'EnglishDefinition')]:e.target.value})}/>
        {Boolean(values[full(index,'DictionarySource')])&&
          <Typography variant="caption" color="text.secondary">Source: {values[full(index,'DictionarySource')]}</Typography>}
      </Box>;
    })}
    <Divider/>
    <Button type="button" variant="outlined" startIcon={<AddIcon/>} disabled={count>=MAX_CLEAN_TERMS}
       onClick={()=>setCount(Math.min(MAX_CLEAN_TERMS,count+1))} sx={{alignSelf:'flex-start',textTransform:'none'}}>
      Add another expression
    </Button>
  </Box>;
}
