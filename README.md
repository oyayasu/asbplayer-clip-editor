# ASB PLAYER JSON-MANUAL

Custom asbplayer extension for learning English through real subtitle scenes, then creating Anki cards with the original sentence, audio, image and one or more vocabulary terms.

## English definitions: copy prompt → paste JSON (no dictionary API)

The **asbplayer Fluency Clean Unlimited v2** Anki model uses a fully manual AI workflow. The extension does **not** connect to an AI service, request dictionary definitions over the internet, store API keys, or automate AI web pages for this model.

1. Capture a scene/subtitle in asbplayer and open the Anki editor. Keep using the **original Word** field and the other Anki fields exactly as before.
2. Enter a word, phrasal verb or idiom in **Word**. Terms do not have to appear verbatim in the subtitle. With the **asbplayer Fluency Clean Unlimited v2** model selected, its multi-expression input still supports **+**. With another model selected, the imported meaning fills the original **Definition** field.
3. Scroll below the original Anki editor to the compact **Manual AI · JSON** section. Click **Copy prompt** (the full prompt stays hidden unless you select **Show prompt**).
4. Paste that prompt into **any AI chat** you choose and ask it to reply.
5. Copy the complete JSON reply and paste it into **Paste the JSON response from your AI**.
6. Click **Import JSON**. The first definition for each term is the meaning that the AI judged most appropriate for the sentence. If the AI supplied other meanings, choose one from the dropdown.
7. Edit **Definition (English)**, **Part of speech**, or **IPA** as needed, then send the Anki card as usual.

The prompt asks for **American English**, grammatical classification, IPA when reliable (otherwise blank), and **English-only** definitions. Alternative meanings can have their own grammatical class and IPA. The JSON must repeat the original subtitle and terms: a mismatched subtitle, missing term or invalid JSON is rejected rather than silently filling the wrong card.

### Expected JSON structure

```json
{
  "version": 2,
  "sentence": "The plane is about to take off.",
  "entries": [
    {
      "term": "take off",
      "meanings": [
        {
          "definition": "To leave the ground and begin to fly.",
          "partOfSpeech": "phrasal verb",
          "ipa": "/teɪk ɔf/"
        },
        {
          "definition": "To remove a piece of clothing.",
          "partOfSpeech": "phrasal verb",
          "ipa": "/teɪk ɔf/"
        }
      ]
    }
  ]
}
```

Only the selected meaning is saved to the card. Other options remain available while the JSON is loaded in the editor. AI-generated information can be inaccurate; verify the chosen definition and transcription.

## Anki model and existing content

The manual editor reuses **asbplayer Fluency Clean Unlimited v2**; there is no forced migration or model renaming. It supports an arbitrary number of expressions per scene using VocabularyData plus pre-rendered Vocabulary HTML. Existing note models and cards are not modified. Audio, screenshots, source information, and clip selection remain part of the editor.

To store **multiple expressions in one card**, open the asbplayer Anki settings and select **Activate unlimited Anki model**. This is optional for the single-term manual prompt/JSON workflow. Keep the desktop Anki application and AnkiConnect available when exporting cards.

## Install / build

1. Open [GitHub Actions](https://github.com/oyayasu/asbplayer-clip-editor/actions/workflows/build.yml) and download the artifact from a successful **Build Chromium** run.
2. Extract its ZIP. In `chrome://extensions` or `brave://extensions`, enable developer mode and choose **Load unpacked**.
3. Select the extracted directory containing `manifest.json`.

The pipeline checks out the pinned upstream asbplayer source, applies the existing project patches, installs the manual AI JSON panel, and validates its input format before compiling. The manual UI requires no AI API keys.

**Scope:** legacy asbplayer note types may retain their former dictionary integrations; the Clean Unlimited model's definitions use **only** the copy/paste process described here.

This project is based on [asbplayer](https://github.com/asbplayer/asbplayer), licensed under AGPL-3.0-or-later. Not affiliated with the upstream project.
