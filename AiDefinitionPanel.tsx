import React, { useMemo, useState } from 'react';
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
  onEntriesChange: (updater: (previous: VocabularyEntry[]) => VocabularyEntry[]) => void;
}
const normalize = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

export default function AiDefinitionPanel({ sentence, entries, onEntriesChange }: Props) {
  const [response, setResponse] = useState('');
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
      setError('Clipboard access is unavailable. Select and copy the prompt from the field below.');
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
    gridColumn:'1/-1', minWidth:0, display:'flex', flexDirection:'column', gap:1.5,
    p:1.5, border:'1px solid', borderColor:'divider', borderRadius:2, overflow:'hidden',
  }}>
    <Typography variant="subtitle2" fontWeight={700}>Contextual English definitions · manual AI</Typography>
    <Typography variant="body2" color="text.secondary">
      No dictionary API, keys, accounts or automatic AI requests. Copy the prompt,
      use any AI you prefer, and paste its JSON answer here.
    </Typography>
    <Box sx={{p:1.25,bgcolor:'action.hover',borderRadius:2}}>
      <Typography variant="caption" color="text.secondary">Original subtitle context</Typography>
      <Typography variant="body2" sx={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>
        {sentence.trim() || 'No subtitle text selected. Definitions will rely on the most common meaning.'}
      </Typography>
    </Box>
    <Button type="button" variant="outlined" startIcon={<ContentCopyOutlinedIcon/>}
      disabled={!prompt} onClick={() => { void copyPrompt(); }} sx={{alignSelf:'flex-start',textTransform:'none'}}>
      1. Copy prompt
    </Button>
    <TextField label="Generated prompt (can be selected and copied)" value={prompt}
      fullWidth multiline minRows={2} maxRows={5} size="small" InputProps={{readOnly:true}} />
    <TextField label="2. Paste the JSON response from your AI" value={response}
      onChange={event => { setResponse(event.target.value); setError(''); setMessage(''); }}
      fullWidth multiline minRows={3} maxRows={9} size="small"
      placeholder='{"version":2,"sentence":"Original subtitle","entries":[{"term":"word","meanings":[{"definition":"Contextual English definition","partOfSpeech":"verb","ipa":""}]}]}' />
    <Button type="button" variant="contained" disabled={!response.trim() || !activeEntries.length}
      onClick={importJSON} sx={{alignSelf:'flex-start',textTransform:'none'}}>
      3. Import JSON
    </Button>
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
      return <Box key={index} sx={{
        display:'flex', flexDirection:'column', gap:1, p:1.5,
        bgcolor:'action.hover', borderRadius:2, minWidth:0,
      }}>
        <Typography variant="subtitle2" sx={{overflowWrap:'anywhere'}}>
          {String(index+1).padStart(2,'0')} · {entry.term}
        </Typography>
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
        <Box sx={{display:'grid',gridTemplateColumns:{xs:'1fr',sm:'minmax(0,1fr) minmax(0,1fr)'},gap:1}}>
          <TextField label="Part of speech" size="small" fullWidth value={entry.partOfSpeech}
            onChange={event => changeField(index, 'partOfSpeech', event.target.value)}/>
          <TextField label="IPA (American English, if available)" size="small" fullWidth value={entry.ipa}
            onChange={event => changeField(index, 'ipa', event.target.value)}/>
        </Box>
        <TextField label="Definition (English)" fullWidth multiline minRows={2} maxRows={4}
          size="small" value={entry.definition}
          onChange={event => changeField(index, 'definition', event.target.value)}/>
        {entry.source && <Typography variant="caption" color="text.secondary">
          {entry.source} · Review AI output for accuracy.
        </Typography>}
      </Box>;
    })}
  </Box>;
}
