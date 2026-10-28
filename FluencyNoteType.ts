/**
 * A dedicated Anki note type for authentic audio + scene cards.
 * Separate structured fields keep the export dialog editable and avoid HTML blobs.
 */
export const fluencyNoteTypeName = 'asbplayer Fluency Audio v1';
export const fluencyFields = ['Sentence', 'Word', 'PartOfSpeech', 'IPA', 'EnglishDefinition', 'Portuguese', 'Audio', 'Image', 'Source', 'URL', 'Definition'] as const;
export const fluencyCustomFields = ['PartOfSpeech', 'IPA', 'EnglishDefinition', 'Portuguese'] as const;

export const fluencyNoteType = {
    modelName: fluencyNoteTypeName,
    inOrderFields: [...fluencyFields],
    css: `
.card {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Arial, sans-serif;
    font-size: 19px;
    line-height: 1.48;
    text-align: left;
    color: #22242a;
    background: #f8f9fb;
    margin: 0 auto;
    max-width: 640px;
    padding: 18px 24px;
}
.fluency-card {
    background: #ffffff;
    color: #24262c;
    border: 1px solid #e5e5eb;
    border-radius: 18px;
    padding: 22px;
    box-shadow: 0 6px 28px rgba(35,38,60,.06);
}
.fluency-caption { color: #757889; font-size: 11px; letter-spacing: .12em; font-weight: 700; margin-bottom: 14px; }
.fluency-image { text-align: center; margin: 8px 0 16px; }
.fluency-image img { max-width: 100%; max-height: 310px; width: auto; height: auto; border-radius: 12px; display: inline-block; }
.fluency-audio { display: flex; align-items: center; justify-content: center; min-height: 58px; }
.fluency-audio .replay-button { margin: 8px; }
.fluency-guide { text-align: center; font-size: 13px; color: #717787; margin-top: 16px; }
.fluency-answer { margin-top: 18px; border-top: 1px solid #e9e9ef; padding-top: 18px; }
.fluency-sentence { font-size: 25px; font-weight: 750; line-height: 1.35; overflow-wrap: anywhere; margin: 0 0 18px; }
.fluency-term { font-size: 20px; font-weight: 600; margin-bottom: 5px; }
.fluency-meta { color: #737688; font-size: 14px; display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; }
.fluency-en { font-size: 17px; color: #272a32; margin-bottom: 12px; overflow-wrap: anywhere; }
.fluency-pt { font-size: 16px; color: #6d7080; margin-bottom: 12px; overflow-wrap: anywhere; }
.fluency-source { margin-top: 20px; font-size: 12px; color: #9b9da9; overflow-wrap: anywhere; }
.fluency-source a { color: #a73a68; }
#answer { display: none; }
.nightMode.card, .night_mode.card { color: #f1f1f5; background: #191b22; }
.nightMode .fluency-card, .night_mode .fluency-card { color: #f1f1f5; background: #252833; border-color: #383b45; box-shadow: none; }
.nightMode .fluency-answer, .night_mode .fluency-answer { border-color: #41434d; }
.nightMode .fluency-sentence, .night_mode .fluency-sentence, .nightMode .fluency-en, .night_mode .fluency-en { color: #f1f1f5; }
`,
    cardTemplates: [
        {
            Front: `<div class="fluency-card">
  <div class="fluency-caption">LISTEN &amp; RECALL</div>
  {{#Image}}<div class="fluency-image">{{Image}}</div>{{/Image}}
  {{#Audio}}<div class="fluency-audio">{{Audio}}</div>{{/Audio}}
  {{^Audio}}<div class="fluency-guide">{{Sentence}}</div>{{/Audio}}
  <div class="fluency-guide">Listen, understand, and try to repeat the line.</div>
</div>`,
            Back: `{{FrontSide}}
<hr id="answer">
<div class="fluency-card fluency-answer">
  <div class="fluency-sentence">{{Sentence}}</div>
  {{#Word}}<div class="fluency-term">{{Word}}</div>{{/Word}}
  <div class="fluency-meta">
    {{#PartOfSpeech}}<span>{{PartOfSpeech}}</span>{{/PartOfSpeech}}
    {{#IPA}}<span>{{IPA}}</span>{{/IPA}}
  </div>
  {{#EnglishDefinition}}<div class="fluency-en">{{EnglishDefinition}}</div>{{/EnglishDefinition}}
  {{#Portuguese}}<div class="fluency-pt">{{Portuguese}}</div>{{/Portuguese}}
  {{#Definition}}<div class="fluency-en">{{Definition}}</div>{{/Definition}}
  {{#Source}}<div class="fluency-source">{{Source}}</div>{{/Source}}
</div>`,
        },
    ],
};
