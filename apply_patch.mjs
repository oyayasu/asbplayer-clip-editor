#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repo = path.resolve(process.argv[2] || 'asbplayer');
const target = path.join(repo, 'common/components/AnkiDialog.tsx');
const component = path.join(repo, 'common/components/ClipSelectionPanel.tsx');
const componentSource = path.join(process.cwd(), 'ClipSelectionPanel.tsx');

if (!fs.existsSync(target) || !fs.existsSync(componentSource)) {
    throw new Error('Código original ou ClipSelectionPanel.tsx não encontrado.');
}

let source = fs.readFileSync(target, 'utf8');
const replace = (from, to, description) => {
    const occurrences = source.split(from).length - 1;
    if (occurrences !== 1) throw new Error(description + ': eram esperados 1, encontrados ' + occurrences);
    source = source.replace(from, to);
};

if (fs.existsSync(component)) throw new Error('Componente já presente: compilação duplicada não permitida.');

replace(
    "import CardSelectView from '@project/common/components/CardSelectView';",
    "import CardSelectView from '@project/common/components/CardSelectView';\nimport ClipSelectionPanel from '@project/common/components/ClipSelectionPanel';",
    'Import do seletor'
);

for (const line of [
    "import Grid from '@mui/material/Grid';\n",
    "import RestoreIcon from '@mui/icons-material/Restore';\n",
    "import Slider from '@mui/material/Slider';\n",
    "import ZoomInIcon from '@mui/icons-material/ZoomIn';\n",
    "import ZoomOutIcon from '@mui/icons-material/ZoomOut';\n",
    "import DoneIcon from '@mui/icons-material/Done';\n",
]) replace(line, '', 'Remover import antigo');

replace(
    "    root: {\n        '& .MuiTextField-root': {\n            marginBottom: theme.spacing(1),\n        },\n    },",
    "    root: {\n        zoom: 0.9,\n        width: '111.111%',\n        display: 'grid',\n        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',\n        gap: theme.spacing(1.5, 2.5),\n        '& > *': { minWidth: 0 },\n        '& .MuiTextField-root': { marginBottom: theme.spacing(1) },\n        [theme.breakpoints.down('sm')]: { gridTemplateColumns: '1fr' },\n    },",
    'Layout em duas colunas'
);

const unusedStyleStart = source.indexOf('    rangeSelectSlider: {');
if (unusedStyleStart !== -1) {
    const unusedStyleEnd = source.indexOf('\n    },', unusedStyleStart);
    if (unusedStyleEnd === -1) throw new Error('Estilo antigo inválido');
    source = source.slice(0, unusedStyleStart) + source.slice(unusedStyleEnd + '\n    },'.length);
}

const helperStart = source.indexOf('const sliderValueLabelFormat = (ms: number) => {');
const helperEnd = source.indexOf('enum TutorialStep {', helperStart);
if (helperStart < 0 || helperEnd < helperStart) throw new Error('Utilitário antigo não identificado');
source = source.slice(0, helperStart) + source.slice(helperEnd);

replace('const boundaryIntervalSubtitleCountRadius = 1;', 'const boundaryIntervalSubtitleCountRadius = 3;', 'Contexto de legenda');
replace('const boundaryIntervalSubtitleTimeRadius = 5000;', 'const boundaryIntervalSubtitleTimeRadius = 15000;', 'Janela de contexto');
replace('label: `${s.text.trim().substring(0, Math.min(s.text.length, 3))}...`,', 'label: s.text.trim(),', 'Texto completo');

replace(
    '<Dialog open={open} disableRestoreFocus disableEnforceFocus fullWidth maxWidth="sm" onClose={onCancel}>',
    `<Dialog
                open={open}
                disableRestoreFocus
                disableEnforceFocus
                fullWidth
                maxWidth="lg"
                PaperProps={{ sx: { width: 'min(1100px, calc(100vw - 32px))', maxWidth: '1100px', maxHeight: '92vh', borderRadius: 3 } }}
                onClose={onCancel}
            >`,
    'Janela ampliada'
);

const start = '                        {timestampInterval && timestampBoundaryInterval && timestampMarks && (';
const end = '                        )}\n                    </form>';
const from = source.indexOf(start);
const to = source.indexOf(end, from);
if (from < 0 || to < 0 || source.indexOf(start, from + 1) !== -1) throw new Error('Seletor antigo não identificado');
if (!source.slice(from, to).includes('<Slider') || !source.slice(from, to).includes('handleZoomOutTimestampInterval'))
    throw new Error('Seletor alterado no repositório original. Nenhuma modificação aplicada.');
source = source.slice(0, from) + source.slice(to + '                        )}'.length);

const newPanel = `                {timestampInterval && timestampBoundaryInterval && timestampMarks && (
                    <ClipSelectionPanel
                        interval={timestampInterval}
                        boundary={timestampBoundaryInterval}
                        subtitles={card.surroundingSubtitles}
                        onChange={(value) => handleTimestampIntervalChange(null, value)}
                        onReset={handleResetTimestampInterval}
                        onZoomIn={handleZoomInTimestampInterval}
                        onZoomOut={handleZoomOutTimestampInterval}
                        onApplyToText={handleApplyTimestampIntervalToText}
                        applyDisabled={
                            (lastAppliedTimestampIntervalToText !== undefined &&
                                timestampInterval[0] === lastAppliedTimestampIntervalToText[0] &&
                                timestampInterval[1] === lastAppliedTimestampIntervalToText[1]) ||
                            disableApplyTextSelection
                        }
                    />
                )}
`;
replace('                </DialogContent>\n                <DialogActions>', '                </DialogContent>\n' + newPanel + '                <DialogActions>', 'Painel de edição');

fs.writeFileSync(target, source);
fs.copyFileSync(componentSource, component);
console.log('Editor instalado no código-fonte, pronto para validação de TypeScript.');
