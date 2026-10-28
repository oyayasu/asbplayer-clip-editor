import React, { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Slider from '@mui/material/Slider';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import RestoreIcon from '@mui/icons-material/Restore';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import DoneIcon from '@mui/icons-material/Done';
import type { SubtitleModel } from '@project/common';
import { useTranslation } from 'react-i18next';

type Props = {
    interval: number[];
    boundary: number[];
    subtitles: SubtitleModel[];
    onChange: (value: number[]) => void;
    onReset: () => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onApplyToText: () => void;
    applyDisabled: boolean;
};

const format = (value: number): string => {
    const ms = Math.max(0, Math.round(value));
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const clock = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;
    return hours ? `${hours}:${clock}` : clock;
};

const parse = (value: string): number | undefined => {
    const match = /^(?:(\d+):)?(\d+):(\d{1,2})(?:\.(\d{1,3}))?$/.exec(value.trim());
    if (!match) return undefined;
    const hours = Number(match[1] || 0);
    const minutes = Number(match[2]);
    const seconds = Number(match[3]);
    if (seconds >= 60 || (match[1] !== undefined && minutes >= 60)) return undefined;
    return (hours * 3600 + minutes * 60 + seconds) * 1000 + Number((match[4] || '').padEnd(3, '0'));
};

const clamp = (number: number, lower: number, upper: number) => Math.max(lower, Math.min(upper, number));

export default function ClipSelectionPanel({ interval, boundary, subtitles, onChange, onReset, onZoomIn, onZoomOut, onApplyToText, applyDisabled }: Props) {
    const { i18n } = useTranslation();
    const pt = i18n.language.toLowerCase().startsWith('pt');
    const labels = pt
        ? { title: 'Seleção do trecho', description: 'Ajuste o início e o fim do áudio com precisão', start: 'Início', end: 'Fim', duration: 'Duração', near: 'Legendas de referência', hint: 'Clique numa legenda para selecioná-la. Shift + clique para ampliar.', reset: 'Restaurar', zoomIn: 'Aproximar', zoomOut: 'Afastar', apply: 'Aplicar ao texto', invalid: 'Horário inválido (mm:ss.mmm)' }
        : { title: 'Clip selection', description: 'Adjust the beginning and end of the audio precisely', start: 'Start', end: 'End', duration: 'Duration', near: 'Reference subtitles', hint: 'Click a subtitle to select it. Shift + click to extend.', reset: 'Reset', zoomIn: 'Zoom in', zoomOut: 'Zoom out', apply: 'Apply to text', invalid: 'Invalid time (mm:ss.mmm)' };

    const [startDraft, setStartDraft] = useState(format(interval[0]));
    const [endDraft, setEndDraft] = useState(format(interval[1]));
    const [invalid, setInvalid] = useState<'start' | 'end'>();
    useEffect(() => {
        setStartDraft(format(interval[0]));
        setEndDraft(format(interval[1]));
        setInvalid(undefined);
    }, [interval[0], interval[1]]);

    const edge = (which: 'start' | 'end', value: number) => {
        const next = [...interval];
        if (which === 'start') next[0] = clamp(Math.round(value), boundary[0], interval[1] - 1);
        else next[1] = clamp(Math.round(value), interval[0] + 1, boundary[1]);
        if (next[0] < next[1]) onChange(next);
    };

    const commit = (which: 'start' | 'end') => {
        const parsed = parse(which === 'start' ? startDraft : endDraft);
        if (parsed === undefined) { setInvalid(which); return; }
        setInvalid(undefined);
        const value = which === 'start'
            ? clamp(parsed, boundary[0], interval[1] - 1)
            : clamp(parsed, interval[0] + 1, boundary[1]);
        edge(which, value);
        if (which === 'start') setStartDraft(format(value));
        else setEndDraft(format(value));
    };

    const ticks = useMemo(() => {
        const span = Math.max(1, boundary[1] - boundary[0]);
        const increments = [100, 250, 500, 1000, 2000, 5000, 10000, 15000, 30000, 60000, 120000];
        const tick = increments.find((step) => span / step <= 6) || 300000;
        const values: { value: number; label: string }[] = [];
        for (let time = Math.ceil(boundary[0] / tick) * tick; time <= boundary[1] && values.length < 9; time += tick) {
            values.push({ value: time, label: format(time).replace(/\.\d{3}$/, '') });
        }
        return values;
    }, [boundary[0], boundary[1]]);

    const nearby = useMemo(() => {
        const seen = new Set<string>();
        return subtitles.filter((s) => s.text.trim() && s.end >= boundary[0] && s.start <= boundary[1])
            .filter((s) => {
                const key = `${s.start}:${s.end}:${s.text}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            }).sort((a, b) => a.start - b.start).slice(0, 30);
    }, [subtitles, boundary[0], boundary[1]]);

    const nudge = (which: 'start' | 'end') => (
        <Box sx={{ display: 'flex', gap: 0.5, mt: 0.75, flexWrap: 'wrap' }}>
            {[-500, -100, 100, 500].map((delta) => (
                <Button type="button" key={delta} variant="outlined" color="inherit" size="small"
                    sx={{ minWidth: 54, px: 0.5, borderRadius: 1.5, fontSize: 12, textTransform: 'none' }}
                    onClick={() => edge(which, interval[which === 'start' ? 0 : 1] + delta)}>
                    {delta > 0 ? '+' : '−'}{Math.abs(delta / 1000).toFixed(1)}s
                </Button>
            ))}
        </Box>
    );

    return (
        <Box sx={{ mx: 2, mb: 1, px: 2.5, py: 2, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', borderRadius: 2.5, maxHeight: '46vh', overflowY: 'auto', flexShrink: 0 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ContentCutIcon fontSize="small" color="primary"/>
                    <Box>
                        <Typography variant="subtitle1" fontWeight={650}>{labels.title}</Typography>
                        <Typography variant="caption" color="text.secondary">{labels.description}</Typography>
                    </Box>
                </Box>
                <Box>
                    <Tooltip title={labels.reset}><IconButton size="small" onClick={onReset}><RestoreIcon/></IconButton></Tooltip>
                    <Tooltip title={labels.zoomIn}><IconButton size="small" onClick={onZoomIn}><ZoomInIcon/></IconButton></Tooltip>
                    <Tooltip title={labels.zoomOut}><IconButton size="small" onClick={onZoomOut}><ZoomOutIcon/></IconButton></Tooltip>
                    <Tooltip title={labels.apply}><span><IconButton size="small" color="primary" disabled={applyDisabled} onClick={onApplyToText}><DoneIcon/></IconButton></span></Tooltip>
                </Box>
            </Box>
            <Box sx={{ px: 2, pt: 3.5, pb: 1.5 }}>
                <Slider value={interval} min={boundary[0]} max={boundary[1]} step={1} marks={ticks}
                    disableSwap valueLabelDisplay="auto" valueLabelFormat={format}
                    onChange={(_, value) => { const v = value as number[]; if (v[0] < v[1]) onChange(v); }}
                    sx={{ '& .MuiSlider-track': { height: 6 }, '& .MuiSlider-rail': { height: 6 }, '& .MuiSlider-thumb': { width: 16, height: 24, borderRadius: 1.5 }, '& .MuiSlider-markLabel': { fontSize: 10, top: 29 }, '& .MuiSlider-valueLabel': { fontSize: 12 } }} />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr auto' }, gap: 2, mt: 1.5 }}>
                <Box>
                    <TextField fullWidth size="small" label={labels.start} value={startDraft} error={invalid === 'start'} helperText={invalid === 'start' ? labels.invalid : undefined}
                        onChange={(e) => setStartDraft(e.target.value)} onBlur={() => commit('start')}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
                        sx={{ '& input': { fontVariantNumeric: 'tabular-nums' } }}/>
                    {nudge('start')}
                </Box>
                <Box>
                    <TextField fullWidth size="small" label={labels.end} value={endDraft} error={invalid === 'end'} helperText={invalid === 'end' ? labels.invalid : undefined}
                        onChange={(e) => setEndDraft(e.target.value)} onBlur={() => commit('end')}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
                        sx={{ '& input': { fontVariantNumeric: 'tabular-nums' } }}/>
                    {nudge('end')}
                </Box>
                <Box sx={{ minWidth: 115 }}>
                    <TextField fullWidth size="small" label={labels.duration} value={format(interval[1] - interval[0])} slotProps={{ input: { readOnly: true } }}/>
                </Box>
            </Box>
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 0.5 }}>{labels.near}</Typography>
            <Typography variant="caption" color="text.secondary">{labels.hint}</Typography>
            <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', py: 1, alignItems: 'stretch' }}>
                {nearby.map((subtitle, index) => {
                    const included = subtitle.start < interval[1] && subtitle.end > interval[0];
                    return (
                        <Box component="button" type="button" key={`${index}-${subtitle.start}`}
                            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                                const from = clamp(subtitle.start, boundary[0], boundary[1] - 1);
                                const to = clamp(subtitle.end, from + 1, boundary[1]);
                                if (event.shiftKey) onChange([Math.min(interval[0], from), Math.max(interval[1], to)]);
                                else onChange([from, to]);
                            }}
                            sx={{ flex: '0 0 182px', minWidth: 182, minHeight: 86, p: 1.2, textAlign: 'left', color: 'text.primary', bgcolor: included ? 'action.selected' : 'background.paper', border: '1px solid', borderColor: included ? 'primary.main' : 'divider', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit', '&:hover': { borderColor: 'primary.main' } }}>
                            <Typography variant="body2" sx={{ fontWeight: included ? 600 : 400, whiteSpace: 'normal', overflowWrap: 'anywhere' }}>{subtitle.text.trim()}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontVariantNumeric: 'tabular-nums' }}>{format(subtitle.start)} — {format(subtitle.end)}</Typography>
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
}
