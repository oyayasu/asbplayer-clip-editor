import { fluencyNoteType } from './FluencyNoteType';

/**
 * New, separate Anki note model. The original Clean v1 model is untouched.
 * {{Vocabulary}} is pre-rendered HTML for an arbitrary number of expressions.
 * VocabularyData is URI-encoded JSON so existing notes can be edited.
 */
export const cleanModelName = 'asbplayer Fluency Clean Unlimited v2';
export const cleanCustomNames = ['Vocabulary', 'VocabularyData'];
export const cleanFields = [
  'Sentence', 'Word', 'Vocabulary', 'VocabularyData',
  'Audio', 'Image', 'Source', 'URL',
];

export const cleanNoteType = {
  modelName: cleanModelName,
  inOrderFields: cleanFields,
  css: fluencyNoteType.css + [
    '.term-group{padding:17px 0;border-top:1px solid #e5e5eb}',
    '.term-top{display:flex;align-items:center;gap:11px;margin-bottom:8px}',
    '.term-number{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;flex-shrink:0;color:#c02950;background:#f6edf0;border-radius:8px;font-size:12px;font-weight:700}',
    '.term-name{font-size:21px;line-height:1.35}',
    '.term-metadata{display:flex;flex-wrap:wrap;gap:12px;font-size:13px;color:#777c8c;margin-bottom:10px}',
    '.term-definition{font-size:17px;line-height:1.48}',
    '.term-source{color:#9297a3;font-size:11px;margin-top:9px}',
    '.nightMode .term-group,.night_mode .term-group{border-color:#3d404b}',
  ].join('\n'),
  cardTemplates: [{
    Front: fluencyNoteType.cardTemplates[0].Front,
    Back: '{{FrontSide}}\n<hr id="answer">\n<div class="fluency-card fluency-answer">' +
      '<div class="fluency-sentence">{{Sentence}}</div>' +
      '<div class="fluency-vocabulary">{{Vocabulary}}</div>' +
      '{{#Source}}<div class="fluency-source">{{Source}}</div>{{/Source}}' +
      '</div>',
  }],
};
