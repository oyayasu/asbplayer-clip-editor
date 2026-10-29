import React, { useEffect, useRef, useState } from 'react';
import type { VocabularyEntry } from './CleanVocabularyData';
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
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';

export type CleanRequest = (input:{
  action:'fluencyCleanLookup'|'fluencySetKey'|'fluencyKeyStatus';
  term?:string;
  key?:string;
})=>Promise<any>;

interface Sense {
  partOfSpeech:string;
  definition:string;
  ipa:string;
  source:string;
  label:string;
}
interface Props {
  entries: VocabularyEntry[];
  onEntriesChange: (updater:(entries:VocabularyEntry[])=>VocabularyEntry[])=>void;
  request:CleanRequest;
}
const normalize=(s:string)=>s.trim().toLowerCase().replace(/\s+/g,' ');

export default function CleanDefinitionPanel({entries,onEntriesChange,request}:Props) {
  const terms=entries.map(entry=>entry.term);
  const [loading,setLoading]=useState<number[]>([]);
  const [errors,setErrors]=useState<Record<number,string>>({});
  const [senses,setSenses]=useState<Record<number,Sense[]>>({});
  const [retry,setRetry]=useState(0);
  const [showKey,setShowKey]=useState(false);
  const [key,setKey]=useState('');
  const [hasKey,setHasKey]=useState(false);
  const [keyMessage,setKeyMessage]=useState('');
  const ref=useRef({terms,entries,onEntriesChange});
  useEffect(()=>{ref.current={terms,entries,onEntriesChange};},[entries,onEntriesChange]);
  useEffect(()=>{
    void request({action:'fluencyKeyStatus'})
      .then(result=>setHasKey(Boolean(result?.configured))).catch(()=>{});
  },[request]);

  const termKeys=terms.map(normalize).join('\u0001');
  useEffect(()=>{
    // The Word inputs are above this panel. They are the only editable
    // vocabulary inputs, so the dictionary can never change their values.
    setSenses({});
    setErrors({});
    const controllers:{cancelled:boolean}[]=[];
    const timers:Array<ReturnType<typeof setTimeout>>=[];
    for(let index=0;index<ref.current.terms.length;index++){
      const term=ref.current.terms[index]?.trim()||'';
      if(!term || (retry===0 && ref.current.entries[index]?.definition.trim()))continue;
      const controller={cancelled:false};
      controllers.push(controller);
      const timer=setTimeout(async()=>{
        if(controller.cancelled)return;
        setLoading(previous=>[...new Set([...previous,index])]);
        setErrors(previous=>({...previous,[index]:''}));
        try{
          const response=await request({action:'fluencyCleanLookup',term});
          if(controller.cancelled||normalize(ref.current.terms[index]||'')!==normalize(term))return;
          if(response?.error)throw Error(String(response.error));
          const results=Array.isArray(response?.senses)?response.senses as Sense[]:[];
          if(!results.length)throw Error('No dictionary definition found.');
          setSenses(previous=>({...previous,[index]:results}));
          const selected=results[0];
          ref.current.onEntriesChange(previous=>previous.map((entry,i)=>
            i===index && normalize(entry.term)===normalize(term)
              ? {
                  ...entry,
                  partOfSpeech:entry.partOfSpeech||selected.partOfSpeech||'',
                  ipa:entry.ipa||selected.ipa||'',
                  definition:entry.definition||selected.definition||'',
                  source:entry.source||selected.source||'',
                }
              : entry));
        }catch(error){
          if(!controller.cancelled)setErrors(previous=>({
            ...previous,[index]:String(error instanceof Error?error.message:error)
          }));
        }finally{
          if(!controller.cancelled)setLoading(previous=>previous.filter(i=>i!==index));
        }
      },600);
      timers.push(timer);
    }
    return()=>{
      controllers.forEach(controller=>controller.cancelled=true);
      timers.forEach(clearTimeout);
    };
  },[termKeys,retry,request]);

  const choose=(index:number,sense:Sense)=>{
    onEntriesChange(previous=>previous.map((entry,i)=>i===index
      ? {...entry,partOfSpeech:sense.partOfSpeech,ipa:sense.ipa,definition:sense.definition,source:sense.source}
      : entry));
  };

  const saveKey=async()=>{
    try{
      const result=await request({action:'fluencySetKey',key:key.trim()});
      if(result?.error)throw Error(String(result.error));
      setKey('');
      setHasKey(Boolean(result.configured));
      setKeyMessage(result.configured?'API key saved locally.':'API key removed.');
      setRetry(previous=>previous+1);
    }catch(error){setKeyMessage('Could not save key: '+String(error));}
  };

  return <Box sx={{
    gridColumn:'1/-1',minWidth:0,display:'flex',flexDirection:'column',
    gap:1.5,border:'1px solid',borderColor:'divider',
    borderRadius:2,p:1.5,overflow:'hidden'
  }}>
    <Box sx={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:1}}>
      <Typography variant="subtitle2" color="text.secondary">
        English dictionary details
      </Typography>
      <IconButton size="small" title="Dictionary settings" onClick={()=>setShowKey(value=>!value)}>
        <SettingsOutlinedIcon fontSize="small"/>
      </IconButton>
    </Box>
    {showKey&&<Box sx={{p:1.5,bgcolor:'action.hover',borderRadius:2,display:'flex',flexDirection:'column',gap:1}}>
      <Typography variant="subtitle2">Dictionary sources</Typography>
      <Typography variant="caption" color="text.secondary">
        Merriam-Webster Learner's when configured, with WiktApi and other online dictionaries.
      </Typography>
      <Box sx={{display:'flex',gap:1,alignItems:'center',flexWrap:'wrap'}}>
        <TextField type="password" variant="outlined"
          label={hasKey?'Replace Merriam-Webster key':'Merriam-Webster API key'}
          size="small" value={key} onChange={event=>setKey(event.target.value)}
          sx={{flex:1,minWidth:180}}/>
        <Button variant="outlined" onClick={()=>void saveKey()} disabled={!key.trim()}>Save key</Button>
        {hasKey&&<Button onClick={()=>{
          void request({action:'fluencySetKey',key:''})
            .then(()=>{setHasKey(false);setKeyMessage('Key removed.');setRetry(value=>value+1);});
        }}>Remove</Button>}
      </Box>
      <Typography variant="caption" color="text.secondary">
        {keyMessage||(hasKey?'Merriam-Webster enabled':'WiktApi and other sources available without a key')}
      </Typography>
    </Box>}
    {terms.every(term=>!term.trim())&&
      <Typography variant="body2" color="text.secondary">
        Type a term in Word above to fill its English definition automatically.
      </Typography>
    }
    {entries.map((entry,index)=>{
      const term=entry.term;
      if(!term.trim())return null;
      const choices=senses[index]||[];
      const isLoading=loading.includes(index);
      return <Box key={index} sx={{
        display:'flex',flexDirection:'column',gap:1,p:1.5,
        bgcolor:'action.hover',borderRadius:2,minWidth:0,
      }}>
        <Box sx={{display:'flex',alignItems:'center',gap:1,justifyContent:'space-between'}}>
          <Typography variant="subtitle2" sx={{overflowWrap:'anywhere',minWidth:0}}>
            {String(index+1).padStart(2,'0')} · {term}
          </Typography>
          {isLoading?<CircularProgress size={18}/>:
          <IconButton size="small" title="Look up this expression again"
            disabled={!term.trim()} onClick={()=>setRetry(value=>value+1)}>
            <RefreshIcon fontSize="small"/>
          </IconButton>}
        </Box>
        {Boolean(errors[index])&&<Alert severity="warning" sx={{py:0}}>{errors[index]}</Alert>}
        {choices.length>1&&
          <FormControl fullWidth size="small">
            <InputLabel id={'sense-'+index}>Dictionary meaning</InputLabel>
            <Select labelId={'sense-'+index} label="Dictionary meaning"
              value={Math.max(0,choices.findIndex(s=>s.definition===entry.definition))}
              onChange={event=>choose(index,choices[Number(event.target.value)])}>
              {choices.map((sense,i)=>
                <MenuItem key={i} value={i} sx={{whiteSpace:'normal',fontSize:13}}>
                  {String(i+1)+'. '+sense.definition.slice(0,130)}
                </MenuItem>)}
            </Select>
          </FormControl>}
        <Box sx={{display:'grid',gridTemplateColumns:{xs:'1fr',sm:'minmax(0,1fr) minmax(0,1fr)'},gap:1}}>
          <TextField size="small" label="Part of speech" fullWidth
            value={entry.partOfSpeech}
            onChange={event=>onEntriesChange(old=>old.map((item,i)=>i===index?{...item,partOfSpeech:event.target.value}:item))}/>
          <TextField size="small" label="IPA (if available)" fullWidth
            value={entry.ipa}
            onChange={event=>onEntriesChange(old=>old.map((item,i)=>i===index?{...item,ipa:event.target.value}:item))}/>
        </Box>
        <TextField size="small" label="Definition (English)" fullWidth multiline minRows={2} maxRows={4}
          value={entry.definition}
          onChange={event=>onEntriesChange(old=>old.map((item,i)=>i===index?{...item,definition:event.target.value}:item))}/>
        {Boolean(entry.source)&&
          <Typography variant="caption" color="text.secondary">
            Source: {entry.source}
          </Typography>}
      </Box>;
    })}
  </Box>;
}
