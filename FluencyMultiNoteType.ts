import { fluencyNoteType } from './FluencyNoteType';

// New note type: existing one-expression cards remain untouched.
export const multiNoteTypeName = 'asbplayer Fluency Multi v1';
export const MAX_MULTI_TERMS = 5;

export const multiCustomFieldNames: string[] = [
    'PartOfSpeech', 'IPA', 'EnglishDefinition', 'Portuguese',
    ...Array.from({ length: MAX_MULTI_TERMS - 1 }, (_, i) => i + 2).flatMap(
        i => ['Word' + i, 'PartOfSpeech' + i, 'IPA' + i, 'EnglishDefinition' + i, 'Portuguese' + i]
    ),
];

export const multiFields = [
    'Sentence', 'Word', ...multiCustomFieldNames,
    'Audio', 'Image', 'Source', 'URL', 'Definition',
];

const slotTemplate = (i: number) => {
    const suffix = i === 1 ? '' : String(i);
    const word = 'Word' + suffix;
    const pos = 'PartOfSpeech' + suffix;
    const ipa = 'IPA' + suffix;
    const english = 'EnglishDefinition' + suffix;
    const portuguese = 'Portuguese' + suffix;
    const colors = ['#9471cc','#159c91','#d68a38','#518bbf','#b55b7c'];
    return '{{#' + word + '}}' +
        '<div class="fluency-term-block" style="--term-color:' + colors[i-1] + '">' +
          '<div class="fluency-term-header"><span class="fluency-term-index">' + String(i).padStart(2,'0') + '</span>' +
          '<span class="fluency-term">{{' + word + '}}</span></div>' +
          '<div class="fluency-meta">{{#' + pos + '}}<span>{{' + pos + '}}</span>{{/' + pos + '}}' +
          '{{#' + ipa + '}}<span>{{' + ipa + '}}</span>{{/' + ipa + '}}</div>' +
          '{{#' + english + '}}<div class="fluency-en">{{' + english + '}}</div>{{/' + english + '}}' +
          '{{#' + portuguese + '}}<div class="fluency-pt">{{' + portuguese + '}}</div>{{/' + portuguese + '}}' +
        '</div>{{/' + word + '}}';
};

export const multiNoteType = {
    modelName: multiNoteTypeName,
    inOrderFields: multiFields,
    css: fluencyNoteType.css + [
      '.fluency-term-block { padding: 14px 0 16px; border-top: 1px solid #ececf1; }',
      '.fluency-term-header { display:flex; align-items:center; gap:12px; margin-bottom:5px; }',
      '.fluency-term-index { color: var(--term-color); background: #f1edf8; display:inline-flex; align-items:center; justify-content:center; width:34px; height:34px; flex:0 0 34px; border-radius:10px; font-size:13px; font-weight:700; }',
      '.fluency-term { font-size:21px; font-weight:650; }',
      '.fluency-term-block .fluency-meta { margin:2px 0 12px 46px; }',
      '.fluency-term-block .fluency-en { margin-left:46px; }',
      '.fluency-term-block .fluency-pt { margin-left:46px; }',
      '.nightMode .fluency-term-block, .night_mode .fluency-term-block {border-color:#41434d;}',
      '@media(max-width:420px){ .fluency-term-block .fluency-meta,.fluency-term-block .fluency-en,.fluency-term-block .fluency-pt{margin-left:0;} }',
    ].join('\n'),
    cardTemplates: [{
        Front: fluencyNoteType.cardTemplates[0].Front,
        Back: '{{FrontSide}}\n<hr id="answer">\n<div class="fluency-card fluency-answer">' +
              '<div class="fluency-sentence">{{Sentence}}</div>' +
              Array.from({length: MAX_MULTI_TERMS}, (_,index) => slotTemplate(index+1)).join('\n') +
              '{{#Source}}<div class="fluency-source">{{Source}}</div>{{/Source}}</div>',
    }],
};
