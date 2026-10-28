import { fluencyNoteType } from './FluencyNoteType';

export const cleanModelName = 'asbplayer Fluency Clean v1';
export const MAX_CLEAN_TERMS = 5;
export const cleanCustomNames = Array.from({length:MAX_CLEAN_TERMS},(_,i)=>i===0?'':String(i+1))
  .flatMap((suffix,i)=>[
    ...(i===0?[]:['Word'+suffix]),
    'PartOfSpeech'+suffix,'IPA'+suffix,'EnglishDefinition'+suffix,'DictionarySource'+suffix
  ]);
export const cleanFields = ['Sentence','Word',...cleanCustomNames,'Audio','Image','Source','URL'];

const slot=(i:number)=>{
  const s=i===1?'':String(i);
  const w='Word'+s;
  const part='PartOfSpeech'+s;
  const ipa='IPA'+s;
  const def='EnglishDefinition'+s;
  const src='DictionarySource'+s;
  return [
    '{{#'+w+'}}',
    '<div class="term-group">',
    '<div class="term-top"><span class="term-number">'+String(i).padStart(2,'0')+'</span><b class="term-name">{{'+w+'}}</b></div>',
    '<div class="term-metadata">{{#'+part+'}}<span>{{'+part+'}}</span>{{/'+part+'}}',
    '{{#'+ipa+'}}<span>{{'+ipa+'}}</span>{{/'+ipa+'}}</div>',
    '{{#'+def+'}}<div class="term-definition">{{'+def+'}}</div>{{/'+def+'}}',
    '{{#'+src+'}}<div class="term-source">{{'+src+'}}</div>{{/'+src+'}}',
    '</div>',
    '{{/'+w+'}}',
  ].join('\n');
};

export const cleanNoteType = {
  modelName:cleanModelName,
  inOrderFields:cleanFields,
  css:fluencyNoteType.css + [
    '.term-group{padding:17px 0;border-top:1px solid #e5e5eb}',
    '.term-top{display:flex;align-items:center;gap:11px;margin-bottom:8px}',
    '.term-number{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;flex-shrink:0;color:#c02950;background:#f6edf0;border-radius:8px;font-size:12px;font-weight:700}',
    '.term-name{font-size:21px;line-height:1.35}',
    '.term-metadata{display:flex;flex-wrap:wrap;gap:12px;font-size:13px;color:#777c8c;margin-bottom:10px}',
    '.term-definition{font-size:17px;line-height:1.48}',
    '.term-source{color:#9297a3;font-size:11px;margin-top:9px}',
    '.nightMode .term-group,.night_mode .term-group{border-color:#3d404b}'
  ].join('\n'),
  cardTemplates:[{
    Front:fluencyNoteType.cardTemplates[0].Front,
    Back:'{{FrontSide}}\n<hr id="answer">\n<div class="fluency-card fluency-answer">'+
      '<div class="fluency-sentence">{{Sentence}}</div>'+
      Array.from({length:MAX_CLEAN_TERMS},(_,i)=>slot(i+1)).join('\n')+
      '{{#Source}}<div class="fluency-source">{{Source}}</div>{{/Source}}'+
      '</div>'
  }]
};
