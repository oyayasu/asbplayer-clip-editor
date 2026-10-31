import React,{useEffect,useMemo,useState} from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import type {VocabularyEntry} from './CleanVocabularyData';
import {
  AI_PROVIDERS,buildAIPrompt,parseAIResult,mergeAIResult,
  type AIProvider,type AIResult,
} from './AiPrompt';

interface Props {
  sentence:string;
  entries:VocabularyEntry[];
  onEntriesChange:(updater:(previous:VocabularyEntry[])=>VocabularyEntry[])=>void;
}
const normalized=(text:string)=>text.trim().replace(/\s+/g,' ').toLowerCase();

export default function AiDefinitionPanel({sentence,entries,onEntriesChange}:Props) {
  const [provider,setProvider]=useState<AIProvider>('chatgpt');
  const [response,setResponse]=useState('');
  const [error,setError]=useState('');
  const [success,setSuccess]=useState('');
  const [copied,setCopied]=useState(false);
  const [imported,setImported]=useState<AIResult|null>(null);
  const [autoLoading,setAutoLoading]=useState(false);
  const [keyInput,setKeyInput]=useState('');
  const [configured,setConfigured]=useState<Record<AIProvider,boolean>>({groq:false,google:false});
  const [configLoading,setConfigLoading]=useState(true);
  const [keySaving,setKeySaving]=useState(false);

  useEffect(()=>{
    let mounted=true;
    void chrome.runtime.sendMessage({type:'AI_API_STATUS'}).then(res=>{
      if(!mounted)return;
      if(!res?.ok)throw Error(res?.error||'Não foi possível carregar as chaves.');
      setConfigured(res.configured);
      setProvider(res.provider);
    }).catch(err=>{
      if(mounted)setError(err instanceof Error?err.message:String(err));
    }).finally(()=>{if(mounted)setConfigLoading(false);});
    return ()=>{mounted=false;};
  },[]);

  const saveKey=async()=>{
    setError('');setSuccess('');setKeySaving(true);
    try{
      const res=await chrome.runtime.sendMessage({
        type:'AI_API_SAVE_KEY',provider,key:keyInput.trim(),
      });
      if(!res?.ok)throw Error(res?.error||'Não foi possível salvar a chave.');
      setConfigured(previous=>({...previous,[provider]:true}));
      setKeyInput('');
      setSuccess('Chave de '+AI_PROVIDERS[provider].label+' salva apenas neste navegador.');
    }catch(err){setError(err instanceof Error?err.message:String(err));}
    finally{setKeySaving(false);}
  };

  const removeKey=async()=>{
    setError('');setSuccess('');setKeySaving(true);
    try{
      const res=await chrome.runtime.sendMessage({type:'AI_API_REMOVE_KEY',provider});
      if(!res?.ok)throw Error(res?.error||'Não foi possível remover a chave.');
      setConfigured(previous=>({...previous,[provider]:false}));
      setKeyInput('');
      setSuccess('Chave removida deste navegador.');
    }catch(err){setError(err instanceof Error?err.message:String(err));}
    finally{setKeySaving(false);}
  };

  const chooseProvider=(next:AIProvider)=>{
    setProvider(next);setKeyInput('');setImported(null);setSuccess('');setError('');setCopied(false);
    void chrome.runtime.sendMessage({type:'AI_API_SELECT_PROVIDER',provider:next})
      .then(res=>{if(!res?.ok)throw Error(res?.error||'Falha ao salvar o provedor.');})
      .catch(err=>setError(err instanceof Error?err.message:String(err)));
  };

  const prompt=useMemo(()=>{
    try{return buildAIPrompt(sentence,entries);}
    catch{return '';}
  },[sentence,entries.map(entry=>entry.term).join('\u0001')]);
  
  const selected=AI_PROVIDERS[provider];
  const active=entries.filter(entry=>entry.term.trim());

  const copyPrompt=async()=>{
    setError('');setSuccess('');
    if(!prompt){setError('Digite uma expressão antes de gerar o prompt.');return;}
    try{
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setSuccess('Prompt copiado. Abra a IA, cole a mensagem e envie.');
    }catch{
      setCopied(false);
      setError('Não foi possível copiar automaticamente. Selecione e copie o texto no campo abaixo.');
    }
  };

  const importAnswer=(text=response)=>{
    setError('');setSuccess('');
    try{
      const result=parseAIResult(text,entries);
      onEntriesChange(previous=>mergeAIResult(previous,result,provider));
      setImported(result);
      setSuccess(result.entries.length+' definição(ões) importada(s). Revise antes de exportar.');
    }catch(err){
      setError(err instanceof Error?err.message:String(err));
    }
  };

  const importFromClipboard=async()=>{
    let text='';
    try {
      text=await navigator.clipboard.readText();
    } catch {
      setError('Não foi possível ler a área de transferência. Cole o JSON no campo acima e clique em importar.');
      return;
    }
    if(!text.trim()){
      setError('A área de transferência está vazia.');
      return;
    }
    setResponse(text);
    importAnswer(text);
  };

  const autoFetchFromAI = async () => {
    setError('');setSuccess('');
    if(!prompt){setError('Adicione uma expressão antes de consultar.');return;}
    if(!configured[provider]){setError('Salve a chave de '+AI_PROVIDERS[provider].label+' primeiro.');return;}
    if(!chrome?.runtime?.id){setError('A extensão foi recarregada. Atualize esta página e tente novamente.');return;}
    setAutoLoading(true);
    try{
      const res=await chrome.runtime.sendMessage({
        type:'AI_API_GENERATE',provider,prompt,
      });
      if(!res?.ok)throw Error(res?.error||'A API não retornou uma resposta.');
      const raw=String(res.raw||'');
      setResponse(raw);
      importAnswer(raw);
    }catch(err){
      setError(err instanceof Error?err.message:String(err));
    }finally{setAutoLoading(false);}
  };

  const changeDefinition=(index:number,value:string)=>{
    onEntriesChange(previous=>{
      let at=-1;
      return previous.map(entry=>{
        if(!entry.term.trim())return entry;
        at++;
        return at===index?{...entry,definition:value}:entry;
      });
    });
  };

  return <Box sx={{gridColumn:'1/-1',display:'flex',flexDirection:'column',
    minWidth:0,overflow:'hidden',gap:1.5,border:'1px solid',
    borderColor:'divider',borderRadius:3,p:2}}>
    <Box sx={{display:'flex',alignItems:'center',gap:1}}>
      <AutoAwesomeOutlinedIcon color="primary" fontSize="small"/>
      <Typography fontWeight={750} variant="h6">AI Definitions</Typography>
    </Box>
    <Typography variant="body2" color="text.secondary">
      Generate American-English dictionary definitions directly with your selected API.
      Only one service is called per request. The subtitle and selected terms are sent
      to that service; keys are stored locally by the extension, not in Anki.
    </Typography>
    <FormControl fullWidth size="small" disabled={configLoading||autoLoading}>
      <InputLabel id="ai-provider">Active AI service</InputLabel>
      <Select labelId="ai-provider" label="Active AI service" value={provider}
        onChange={event=>chooseProvider(event.target.value as AIProvider)}>
        {(Object.keys(AI_PROVIDERS) as AIProvider[]).map(id=>
          <MenuItem key={id} value={id}>{AI_PROVIDERS[id].label}</MenuItem>)}
      </Select>
    </FormControl>
    <Typography variant="caption" color="text.secondary">
      Model: {selected.model} · {configured[provider]?'API key saved':'No API key saved'}
    </Typography>
    <TextField fullWidth size="small" type="password" label={selected.label+' API key'}
      autoComplete="off" value={keyInput}
      placeholder={configured[provider]?'Saved — enter a new key to replace':'Paste your API key here'}
      onChange={event=>setKeyInput(event.target.value)}
      helperText="Your key is kept in extension-local storage (not encrypted); use only your personal Brave profile."/>
    <Box sx={{display:'flex',gap:1,flexWrap:'wrap',alignItems:'center'}}>
      <Button type="button" variant="outlined" disabled={!keyInput.trim()||keySaving}
        sx={{textTransform:'none'}} onClick={()=>void saveKey()}>
        {keySaving?'Saving...':'Save key'}
      </Button>
      <Button type="button" color="error" variant="text" disabled={!configured[provider]||keySaving}
        sx={{textTransform:'none'}} onClick={()=>void removeKey()}>Remove saved key</Button>
      <Button component="a" href={selected.url} target="_blank" rel="noopener noreferrer"
        variant="text" sx={{textTransform:'none'}}>Get API key</Button>
    </Box>

    <Box sx={{display:'flex',gap:1,flexWrap:'wrap'}}>
      <Button type="button" variant="contained" color="success" startIcon={<AutoAwesomeOutlinedIcon/>}
        disabled={!prompt || autoLoading || !configured[provider] || configLoading} onClick={()=>void autoFetchFromAI()}
        sx={{textTransform:'none',flex:'1 1 100%', py: 1.5}}>
        {autoLoading ? 'Generating definitions...' : 'Generate definitions with '+selected.label}
      </Button>
    </Box>

    <Typography variant="caption" color="text.secondary" align="center">
      --- Manual JSON fallback ---
    </Typography>

    <Box sx={{display:'flex',gap:1,flexWrap:'wrap'}}>
      <Button type="button" variant="outlined" startIcon={<ContentCopyOutlinedIcon/>}
        disabled={!prompt} onClick={()=>void copyPrompt()}
        sx={{textTransform:'none',flex:'1 1 180px'}}>
        Copy structured prompt
      </Button>

    </Box>
    
    <TextField label="Prompt preview (select to copy manually)" fullWidth
      multiline minRows={2} maxRows={5} size="small"
      value={prompt} InputProps={{readOnly:true}}
      helperText={copied?'Copied to clipboard':''}/>
      
    <TextField label="Paste the AI response (JSON) manually" fullWidth
      multiline minRows={3} maxRows={10} size="small"
      placeholder='{"version":1,"entries":[{"term":"throw around","partOfSpeech":"phrasal verb","ipa":"","definition":"To discuss ideas informally.","alternativeDefinitions":[]}]}'
      value={response}
      onChange={event=>{setResponse(event.target.value);setError('');setSuccess('');}}/>
      
    <Box sx={{display:'flex',gap:1,flexWrap:'wrap'}}>
      <Button type="button" variant="outlined" color="primary"
        disabled={!active.length} onClick={()=>void importFromClipboard()}
        sx={{textTransform:'none'}}>
        Import copied response
      </Button>
      <Button type="button" variant="outlined" color="primary"
        disabled={!response.trim()||!active.length}
        onClick={()=>importAnswer()} sx={{textTransform:'none'}}>
        Import from text field
      </Button>
    </Box>
    
    {error&&<Alert severity="warning" sx={{py:0}}>{error}</Alert>}
    {success&&<Alert severity="success" sx={{py:0}}>{success}</Alert>}
    
    {active.map((entry,index)=>{
      const options=imported?.entries[index];
      const alternatives=options && normalized(options.term)===normalized(entry.term)
        ? [options.definition,...options.alternativeDefinitions]:[];
      return <Box key={index} sx={{display:'flex',flexDirection:'column',gap:1,
        p:1.5,bgcolor:'action.hover',borderRadius:2}}>
        <Typography variant="subtitle2" fontWeight={750} sx={{overflowWrap:'anywhere'}}>
          {String(index+1).padStart(2,'0')} · {entry.term}
        </Typography>
        {alternatives.length>1&&<FormControl size="small" fullWidth>
          <InputLabel id={'ai-sense-'+index}>AI meaning</InputLabel>
          <Select labelId={'ai-sense-'+index} label="AI meaning"
            value={alternatives.includes(entry.definition)?entry.definition:options?.definition||''}
            onChange={event=>changeDefinition(index,String(event.target.value))}>
            {alternatives.map((definition,i)=><MenuItem key={i} value={definition}
              sx={{whiteSpace:'normal',fontSize:13}}>{definition}</MenuItem>)}
          </Select>
        </FormControl>}
        <Box sx={{display:'grid',
          gridTemplateColumns:{xs:'1fr',sm:'minmax(0,1fr) minmax(0,1fr)'},gap:1}}>
          <TextField label="Part of speech" size="small" fullWidth value={entry.partOfSpeech}
            onChange={event=>onEntriesChange(previous=>previous.map((item,i)=>
              i===index?{...item,partOfSpeech:event.target.value}:item))}/>
          <TextField label="IPA (US, if available)" size="small" fullWidth value={entry.ipa}
            onChange={event=>onEntriesChange(previous=>previous.map((item,i)=>
              i===index?{...item,ipa:event.target.value}:item))}/>
        </Box>
        <TextField label="Definition (English)" multiline minRows={2} maxRows={4}
          size="small" fullWidth value={entry.definition}
          onChange={event=>changeDefinition(index,event.target.value)}/>
        {entry.source&&<Typography variant="caption" color="text.secondary">
          Source: {entry.source} · AI text can be inaccurate; review it.
        </Typography>}
      </Box>;
    })}
  </Box>;
}
