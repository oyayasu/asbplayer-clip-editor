import React from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { VocabularyEntry } from './CleanVocabularyData';
import { emptyVocabularyEntry } from './CleanVocabularyData';

type Props = {
  entries: VocabularyEntry[];
  onFirstChange: (word: string) => void;
  onEntriesChange: (updater: (entries: VocabularyEntry[]) => VocabularyEntry[]) => void;
};

/** No number of fixed Anki slots; every + appends a new entry. */
export default function CleanWordFields({ entries, onFirstChange, onEntriesChange }: Props) {
  const changeTerm=(index:number,value:string)=>{
    if(index===0)onFirstChange(value);
    onEntriesChange(previous=>previous.map((entry,i)=>i===index
      ? {...emptyVocabularyEntry(),term:value}
      : entry));
  };
  const removeTerm=(index:number)=>{
    const next=entries.filter((_,i)=>i!==index);
    if(index===0)onFirstChange(next[0]?.term||'');
    onEntriesChange(previous=>{
      const remaining=previous.filter((_,i)=>i!==index);
      return remaining.length?remaining:[emptyVocabularyEntry()];
    });
  };

  return <Box sx={{
    gridColumn:'1/-1', minWidth:0, p:1.5, border:'1px solid',
    borderColor:'divider', borderRadius:2, display:'flex',
    flexDirection:'column',gap:1,
  }}>
    {entries.map((entry,index)=>
      <Box key={index} sx={{display:'flex',gap:1,alignItems:'center',minWidth:0}}>
        <TextField label={'Word / Expression '+(index+1)}
          placeholder={index===0?'Type any word, phrasal verb or idiom':'Another word or expression'}
          variant="outlined" size="small" fullWidth
          value={entry.term}
          onChange={event=>changeTerm(index,event.target.value)}
          sx={{minWidth:0}} />
        {index===entries.length-1&&
          <Tooltip title="Add another word or expression">
            <IconButton type="button" color="primary"
              aria-label="Add another word or expression"
              onClick={()=>onEntriesChange(previous=>[...previous,emptyVocabularyEntry()])}>
              <AddIcon/>
            </IconButton>
          </Tooltip>}
        {entries.length>1&&
          <Tooltip title="Remove this expression">
            <IconButton type="button" aria-label={'Remove expression '+(index+1)}
              onClick={()=>removeTerm(index)}>
              <DeleteOutlineIcon/>
            </IconButton>
          </Tooltip>}
      </Box>
    )}
  </Box>;
}
