#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.argv[2]||'asbplayer');
const get=(name)=>fs.readFileSync(path.join(root,name),'utf8');
const put=(name,content)=>fs.writeFileSync(path.join(root,name),content);
const swap=(source,before,after,label)=>{
  const matches=source.split(before).length-1;
  if(matches!==1)throw Error(label+' expected one match, found '+matches);
  return source.replace(before,after);
};

for(const [name,output] of [
  ['AiPrompt.ts','common/components/AiPrompt.ts'],
  ['AiDefinitionPanel.tsx','common/components/AiDefinitionPanel.tsx'],
]){
  const target=path.join(root,output);
  if(fs.existsSync(target))throw Error('AI panel already installed: '+output);
  fs.copyFileSync(path.resolve(name),target);
}

{
  const file='common/components/AnkiDialog.tsx';
  let source=get(file);
  source=swap(source,
    "import CleanDefinitionPanel from '@project/common/components/CleanDefinitionPanel';",
    "import AiDefinitionPanel from '@project/common/components/AiDefinitionPanel';",
    'AI component import');
  source=swap(source,
    '<CleanDefinitionPanel\n                                entries=',
    '<AiDefinitionPanel\n                                sentence={text}\n                                entries=',
    'AI component mount');
  source=swap(source,
    '                                request={cleanRequest}\n                            />',
    '                            />',
    'AI requires no dictionary backend');
  put(file,source);
}

{
  const file='common/components/CleanNoteType.ts';
  let source=get(file);
  source=swap(source,'asbplayer Fluency Clean Unlimited v2',
    'asbplayer AI Fluency v1','separate Anki model for AI version');
  put(file,source);
}

{
  const file='common/components/AnkiSettingsTab.tsx';
  let source=get(file);
  source=swap(source,'English-only unlimited vocabulary (recommended)',
    'AI Fluency — unlimited expressions','AI model label');
  source=swap(source,
    'Activate unlimited Anki model',
    'Activate AI Anki model',
    'AI model setup button');
  source=swap(source,
    'Unlimited English vocabulary model activated. Existing cards were not modified.',
    'AI Fluency model activated. Existing cards were not modified.',
    'AI model setup confirmation');
  put(file,source);
}

{
  const file='extension/wxt.config.ts';
  let source=get(file);
  source=swap(source,
    'const extName = project.names.short;',
    "const extName = 'asbplayer AI Sister';",
    'sister extension display name');
  put(file,source);
}

console.log('OK: AI sibling installed with manual approved response transfer, independent Anki model and original media controls.');
