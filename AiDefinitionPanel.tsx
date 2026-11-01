import React, { useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import type { VocabularyEntry } from './CleanVocabularyData';
import { buildAIPrompt, parseAIResult, mergeAIResult, type AIResult, type AIMeaning } from './AiPrompt';

interface Props {
  sentence: string;
  entries: VocabularyEntry[];
  request?: (input: { provider: string; prompt: string }) => Promise<{ ok: boolean; response?: string; error?: string }>;
  onEntriesChange: (updater: (previous: VocabularyEntry[]) => VocabularyEntry[]) => void;
  showEntryFields?: boolean;
}
const normalize = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

export default function AiDefinitionPanel({ sentence, entries, request, onEntriesChange, showEntryFields = false }: Props) {
  const [response, setResponse] = useState('');
  const [provider, setProvider] = useState(() => {
    try {
      const saved = localStorage.getItem('asb-json-relay-provider');
      return saved === 'gemini' ? 'gemini' : 'chatgpt';
    } catch { return 'chatgpt'; }
  });
  const [mode, setMode] = useState<'manual' | 'automatic'>(() => {
    try { return localStorage.getItem('asb-json-relay-mode') === 'automatic' ? 'automatic' : 'manual'; }
    catch { return 'manual'; }
  });
  const currentRequest = useRef('');
  const busy = useRef(false);
  const mounted = useRef(true);
  const [working, setWorking] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [imported, setImported] = useState<{ result: AIResult; signature: string } | null>(null);
  const termsKey = entries.map(entry => entry.term.trim()).filter(Boolean).join('\u001f');
  const signature = normalize(sentence) + '\u001e' + termsKey;
  const prompt = useMemo(() => {
    try { return buildAIPrompt(sentence, entries); }
    catch { return ''; }
  }, [sentence, termsKey]);
  const activeEntries = entries.filter(entry => entry.term.trim());
  const available = imported?.signature === signature ? imported.result : null;

  const copyPrompt = async () => {
    setError('');
    setMessage('');
    if (!prompt) { setError('Type a word or expression before copying the prompt.'); return; }
    try {
      await navigator.clipboard.writeText(prompt);
      setMessage('Prompt copied. Paste it into any AI chat, then copy the JSON reply back here.');
    } catch {
      setShowPrompt(true);
      setError('Clipboard access is unavailable. Select and copy the expanded prompt.');
    }
  };


  // A response is only allowed to update the exact provider + subtitle + term snapshot that requested it.
  const requestKey = provider + '\\u001d' + signature;
  useEffect(() => {
    try {
      localStorage.setItem('asb-json-relay-mode', mode);
      localStorage.setItem('asb-json-relay-provider', provider);
    } catch { /* storage disabled */ }
  }, [mode, provider]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; currentRequest.current = ''; };
  }, []);

  const fillAutomatically = async () => {
    if (mode !== 'automatic' || !prompt || !activeEntries.length || busy.current) return;
    const key = requestKey;
    currentRequest.current = key;
    busy.current = true;
    setWorking(true);
    setError('');
    setMessage('');
    try {
      if (!request) throw Error('Automatic relay is unavailable in this editor context.');
      const result = await request({ provider, prompt });
      if (!result?.ok) throw Error(result?.error || 'Could not collect the AI response.');
      const raw = String(result.response || '');
      const parsed = parseAIResult(raw, entries, sentence);
      if (mounted.current && currentRequest.current === key) {
        setResponse(raw);
        onEntriesChange(previous => mergeAIResult(previous, parsed));
        setImported({ result: parsed, signature });
        setMessage('Definitions filled automatically. Review before exporting.');
      }
    } catch (cause) {
      if (mounted.current && currentRequest.current === key)
        setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      busy.current = false;
      if (mounted.current && currentRequest.current === key) setWorking(false);
    }
  };

  const importJSON = () => {
    setError('');
    setMessage('');
    try {
      const parsed = parseAIResult(response, entries, sentence);
      onEntriesChange(previous => mergeAIResult(previous, parsed));
      setImported({ result: parsed, signature });
      setMessage('Imported ' + parsed.entries.length + ' term(s). The first meaning is the best contextual match; you can choose another below.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const chooseMeaning = (activeIndex: number, meaning: AIMeaning) => {
    onEntriesChange(previous => {
      let slot = -1;
      return previous.map(entry => {
        if (!entry.term.trim()) return entry;
        slot++;
        return slot === activeIndex ? {
          ...entry, definition: meaning.definition,
          partOfSpeech: meaning.partOfSpeech, ipa: meaning.ipa,
          source: 'AI · manual JSON',
        } : entry;
      });
    });
  };

  const changeField = (activeIndex: number, field: 'partOfSpeech' | 'ipa' | 'definition', value: string) => {
    onEntriesChange(previous => {
      let slot = -1;
      return previous.map(item => {
        if (!item.term.trim()) return item;
        slot++;
        return slot === activeIndex ? {...item, [field]:value} : item;
      });
    });
  };

  return <Box sx={{
    mt:1.5, pt:1.5, pb:0.5, minWidth:0, borderTop:'1px solid',
    borderColor:'divider', display:'flex', flexDirection:'column', gap:1,
  }}>
    <Box sx={{display:'flex',alignItems:'center',flexWrap:'wrap',gap:1}}>
      <Typography variant="subtitle2" fontWeight={700} sx={{mr:1}}>AI · JSON</Typography>
      <Button type="button" size="small" variant={mode === 'manual' ? 'contained' : 'outlined'}
        onClick={() => setMode('manual')} sx={{textTransform:'none'}}>Manual</Button>
      <Button type="button" size="small" variant={mode === 'automatic' ? 'contained' : 'outlined'}
        onClick={() => setMode('automatic')} sx={{textTransform:'none'}}>Automatic</Button>
    </Box>
    {mode === 'automatic' ? (
      <Box sx={{display:'flex',alignItems:'center',gap:1,flexWrap:'wrap'}}>
        <FormControl size="small" sx={{minWidth:125}}>
          <InputLabel id="json-relay-provider">AI tab</InputLabel>
          <Select labelId="json-relay-provider" label="AI tab" value={provider}
            onChange={event=>{currentRequest.current='';setError('');setMessage('');setProvider(String(event.target.value));}}>
            <MenuItem value="chatgpt">ChatGPT</MenuItem>
            <MenuItem value="gemini">Gemini</MenuItem>
          </Select>
        </FormControl>
        <Button type="button" size="small" variant="contained"
          disabled={!prompt || !activeEntries.length || working}
          onClick={()=>{void fillAutomatically();}} sx={{textTransform:'none'}}>
          {working ? 'Filling…' : 'Fill'}
        </Button>
        <Typography variant="caption" color="text.secondary">
          {working ? 'Waiting for AI response…' : prompt ? 'Fills all AI fields from your open AI tab.' : 'Enter a word to fill.'}
        </Typography>
      </Box>
    ) : (
      <>
        <Box sx={{display:'flex',alignItems:'center',flexWrap:'wrap',gap:1}}>
          <Button type="button" size="small" variant="outlined"
            startIcon={<ContentCopyOutlinedIcon/>} disabled={!prompt}
            onClick={() => { void copyPrompt(); }} sx={{textTransform:'none'}}>Copy prompt</Button>
          <Button type="button" size="small" variant="text" disabled={!prompt}
            onClick={() => setShowPrompt(value => !value)} sx={{textTransform:'none'}}>
            {showPrompt ? 'Hide prompt' : 'Show prompt'}
          </Button>
        </Box>
        {showPrompt && <TextField label="Generated prompt" value={prompt}
          fullWidth multiline minRows={1} maxRows={3} size="small"
          InputProps={{readOnly:true}} />}
        <Box sx={{display:'flex',alignItems:'flex-end',gap:1,minWidth:0}}>
          <TextField label="Paste AI JSON" value={response}
            onChange={event => { setResponse(event.target.value); setError(''); setMessage(''); }}
            fullWidth multiline minRows={2} maxRows={5} size="small"
            placeholder="Paste the JSON response here" />
          <Button type="button" size="small" variant="contained"
            disabled={!response.trim() || !activeEntries.length} onClick={importJSON}
            sx={{textTransform:'none',flexShrink:0,whiteSpace:'nowrap',mb:1}}>Import JSON</Button>
        </Box>
      </>
    )}
    {error && <Alert severity="warning" sx={{py:0}}>{error}</Alert>}
    {message && <Alert severity="success" sx={{py:0}}>{message}</Alert>}
    {activeEntries.map((entry, index) => {
      const data = available?.entries[index];
      const meanings = data && normalize(data.term) === normalize(entry.term) ? data.meanings : [];
      const matching = meanings.findIndex(sense =>
        sense.definition === entry.definition &&
        sense.partOfSpeech === entry.partOfSpeech &&
        sense.ipa === entry.ipa
      );
      if (!showEntryFields && meanings.length < 2) return null;
      return <Box key={index} sx={{
        display:'flex', flexDirection:'column', gap:1, p:showEntryFields ? 1 : 0,
        bgcolor:showEntryFields ? 'action.hover' : undefined,
        borderRadius:1, minWidth:0,
      }}>
        {showEntryFields && <Typography variant="subtitle2" sx={{overflowWrap:'anywhere'}}>
          {String(index+1).padStart(2,'0')} · {entry.term}
        </Typography>}
        {meanings.length > 1 && <FormControl fullWidth size="small">
          <InputLabel id={'ai-meaning-'+index}>Meaning (best contextual match first)</InputLabel>
          <Select labelId={'ai-meaning-'+index} label="Meaning (best contextual match first)"
            value={matching < 0 ? '' : String(matching)}
            onChange={event => chooseMeaning(index, meanings[Number(event.target.value)])}>
            {meanings.map((sense, choice) => <MenuItem key={choice}
              value={String(choice)} sx={{whiteSpace:'normal',overflowWrap:'anywhere',fontSize:13}}>
              {String(choice+1) + '. ' + sense.definition + ' · ' + sense.partOfSpeech}
            </MenuItem>)}
          </Select>
        </FormControl>}
        {showEntryFields && <>
          <Box sx={{display:'grid',gridTemplateColumns:{xs:'1fr',sm:'minmax(0,1fr) minmax(0,1fr)'},gap:1}}>
            <TextField label="Part of speech" size="small" fullWidth value={entry.partOfSpeech}
              onChange={event => changeField(index, 'partOfSpeech', event.target.value)}/>
            <TextField label="IPA (American English, if available)" size="small" fullWidth value={entry.ipa}
              onChange={event => changeField(index, 'ipa', event.target.value)}/>
          </Box>
          <TextField label="Definition (English)" fullWidth multiline minRows={2} maxRows={4}
            size="small" value={entry.definition}
            onChange={event => changeField(index, 'definition', event.target.value)}/>
        </>}
      </Box>;
    })}
  </Box>;
}
