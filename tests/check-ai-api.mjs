#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.argv[2]||'asbplayer');
const read=p=>readFileSync(path.join(root,p),'utf8');
const background=read('extension/src/entrypoints/background.ts');
const manifest=read('extension/wxt.config.ts');
const panel=read('common/components/AiDefinitionPanel.tsx');
const prompt=read('common/components/AiPrompt.ts');

assert.match(background,/AI_API_GENERATE/);
assert.match(background,/AI_API_SAVE_KEY/);
assert.match(background,/AI_API_REMOVE_KEY/);
assert.match(background,/AI_API_SELECT_PROVIDER/);
assert.match(background,/AI_API_STATUS/);
assert.match(background,/sender.id !== browser.runtime.id/);
assert.match(background,/browser.storage.local.set/);
assert.match(background,/browser.storage.local.get/);
assert.match(background,/browser.storage.local.remove/);
assert.match(background,/https:\/\/api\.groq\.com\/openai\/v1\/chat\/completions/);
assert.match(background,/https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-3\.8-flash:generateContent/);
assert.match(background,/openai\/gpt-oss-120b/);
assert.match(background,/strict: true/);
assert.match(background,/responseJsonSchema:/);
assert.match(background,/alternativeDefinitions/);
assert.match(background,/AbortController/);
assert(!background.includes('AI_AUTOMATION_RUN'),'API branch should not scrape signed-in AI tabs');
assert(!background.includes('runAiAutomation'),'API branch must not use old DOM automation');

assert.match(manifest,/https:\/\/api\.groq\.com\/\*/);
assert.match(manifest,/https:\/\/generativelanguage\.googleapis\.com\/\*/);

assert.match(panel,/AI_API_GENERATE/);
assert.match(panel,/AI_API_SAVE_KEY/);
assert.match(panel,/AI_API_REMOVE_KEY/);
assert.match(panel,/AI_API_STATUS/);
assert.match(panel,/AI_API_SELECT_PROVIDER/);
assert.match(panel,/type="password"/);
assert.match(panel,/parseAIResult\(text,entries\)/);
assert.match(panel,/onEntriesChange\(previous=>mergeAIResult/);
assert.match(panel,/navigator\.clipboard\.writeText\(prompt\)/);
assert.match(panel,/navigator\.clipboard\.readText\(\)/);
assert(!panel.includes('AI_AUTOMATION_REQUEST'));
assert(!panel.includes('fetch('));

assert.match(prompt,/export type AIProvider = 'groq'\|'google'/);
assert.match(prompt,/partOfSpeech/);
assert.match(prompt,/alternativeDefinitions/);
assert.match(prompt,/version:1/);

console.log('PASS: provider isolation, local key storage, structured API output, JSON parser, host permissions, and manual fallback.');
