import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { detectExpression, suggestTerms } from './FluencyPhraseMatcher';
import { fluencyGetJson } from './FluencyLookupTransport';
import type { FluencyBridgeLookup } from './FluencyLookupTransport';

export type FluencyFields = {
    PartOfSpeech: string;
    IPA: string;
    EnglishDefinition: string;
    Portuguese: string;
};

type Props = {
    sentence: string;
    word: string;
    values: FluencyFields;
    onWordChange: (value: string) => void;
    onFieldsChange: (value: FluencyFields) => void;
    fluencyLookup?: FluencyBridgeLookup;
};

const emptyFields: FluencyFields = { PartOfSpeech: '', IPA: '', EnglishDefinition: '', Portuguese: '' };
export const normalize = (value: string) => value.trim().toLowerCase().replace(/[!?.,;:]+$/g, '').replace(/\s+/g, ' ');

type DictionaryEntry = {
    phonetic?: string;
    phonetics?: Array<{ text?: string }>;
    meanings?: Array<{ partOfSpeech?: string; definitions?: Array<{ definition?: string; example?: string }> }>;
};

export const dictionaryLookup = async (term: string, signal: AbortSignal, viaBridge?: FluencyBridgeLookup, sentence=''): Promise<Partial<FluencyFields>> => {
    if (!/^[a-z][a-z '-]{0,75}$/i.test(term)) return {};
    const data: unknown = await fluencyGetJson('dictionary', term, signal, viaBridge, sentence);
    if (!Array.isArray(data)) return {};
    const entry = data[0] as DictionaryEntry | undefined;
    if (!entry) return {};
    const meaning = entry.meanings?.find(m => Boolean(m.definitions?.[0]?.definition));
    const ipa = entry.phonetics?.find(p => p.text?.startsWith('/'))?.text
        || entry.phonetics?.find(p => p.text)?.text || entry.phonetic || '';
    return {
        PartOfSpeech: meaning?.partOfSpeech || '',
        IPA: ipa,
        EnglishDefinition: meaning?.definitions?.[0]?.definition || '',
    };
};

export const translationLookup = async (term: string, signal: AbortSignal, viaBridge?: FluencyBridgeLookup): Promise<string> => {
    const data: any = await fluencyGetJson('translation', term, signal, viaBridge);
    if (Number(data.responseStatus) !== 200) throw new Error('translation unavailable');
    const text = String(data.responseData?.translatedText || '').trim();
    return text && text.toLowerCase() !== term.toLowerCase() ? text : '';
};

export default function SmartDefinitionPanel({ sentence, word, values, onWordChange, onFieldsChange, fluencyLookup }: Props) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [retry, setRetry] = useState(0);
    const [autoSearch, setAutoSearch] = useState(true);
    const latest = useRef({ values, onFieldsChange });
    const lastAuto = useRef<FluencyFields>(emptyFields);
    useEffect(() => { latest.current = { values, onFieldsChange }; }, [values, onFieldsChange]);

    const tokens = useMemo(() => suggestTerms(sentence), [sentence]);

    // The last version only looked up a word if the user manually filled Word.
    // When a known idiom or phrase occurs in the subtitle, select it automatically.
    // Never guess for an unknown sentence: offer explicit choices instead.
    useEffect(() => {
        if (word.trim()) return;
        const expression = detectExpression(sentence);
        if (expression) onWordChange(expression);
    }, [sentence, word, onWordChange]);

    const lookup = useCallback(async (term: string, signal: AbortSignal) => {
        const key = normalize(term);
        if (!key || key.length > 80) return;
        setLoading(true);
        setMessage('');
        try {
            const dictionaryPromise: Promise<Partial<FluencyFields>> = dictionaryLookup(key, signal, fluencyLookup, sentence);
            const translationPromise: Promise<string> = translationLookup(key, signal, fluencyLookup);

            const [dictResult, transResult] = await Promise.allSettled([dictionaryPromise, translationPromise]);
            if (signal.aborted) return;

            const definition = dictResult.status === 'fulfilled' ? dictResult.value : {};
            const portuguese = transResult.status === 'fulfilled' ? transResult.value : '';
            const fetched: FluencyFields = {
                PartOfSpeech: definition.PartOfSpeech || '',
                IPA: definition.IPA || '',
                EnglishDefinition: definition.EnglishDefinition || '',
                Portuguese: portuguese,
            };

            const previous = latest.current.values;
            const next = { ...previous };
            for (const field of Object.keys(fetched) as Array<keyof FluencyFields>) {
                if (!previous[field] || previous[field] === lastAuto.current[field]) {
                    next[field] = fetched[field];
                }
            }
            lastAuto.current = fetched;
            latest.current.onFieldsChange(next);

            if (!fetched.EnglishDefinition || !fetched.Portuguese) {
                setMessage('Alguns dados não foram encontrados. Confira ou complete os campos antes de exportar.');
            } else {
                setMessage('Definição e tradução consultadas online. Confira o sentido na cena.');
            }
            if (dictResult.status === 'rejected' || transResult.status === 'rejected') {
                setMessage('Um dos serviços está indisponível. Os campos encontrados foram preservados; você pode tentar novamente.');
            }
        } catch (error) {
            if (!signal.aborted) setMessage('Consulta não concluída. Verifique sua conexão e tente novamente.');
        } finally {
            if (!signal.aborted) setLoading(false);
        }
    }, [fluencyLookup]);

    useEffect(() => {
        if (!autoSearch || !word.trim()) return;
        const controller = new AbortController();
        const timer = setTimeout(() => { void lookup(word, controller.signal); }, 600);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [word, retry, autoSearch, lookup]);

    const setField = (field: keyof FluencyFields, value: string) => {
        onFieldsChange({ ...values, [field]: value });
    };

    const current = normalize(word);
    return (
        <Box sx={{ gridColumn: '1 / -1', px: 2, py: 1.75, border: '1px solid', borderColor: 'divider', borderRadius: 2.5, bgcolor: 'action.hover' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                <Typography variant="subtitle1" fontWeight={700}>Vocabulário automático</Typography>
                <Button size="small" variant="outlined" onClick={() => { setAutoSearch(true); setRetry(r => r + 1); }} disabled={!current || loading}>
                    {loading ? <CircularProgress size={15} /> : 'Buscar / atualizar'}
                </Button>
            </Box>
            <Typography variant="caption" color="text.secondary">
                Uma expressão conhecida é selecionada automaticamente. Para estudar outra palavra, clique abaixo ou preencha Word. Revise os significados antes de salvar.
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, my: 1.25 }}>
                {tokens.map(token => (
                    <Chip key={token} label={token} size="small" variant={normalize(token) === current ? 'filled' : 'outlined'}
                        color={normalize(token) === current ? 'primary' : 'default'} onClick={() => onWordChange(token)}/>
                ))}
            </Box>
            {!word.trim() && (
                <Alert severity="warning" sx={{ mb: 1.5 }}>
                    Escolha abaixo uma palavra ou expressão da cena. Não é possível saber com segurança qual termo você quer aprender sem uma seleção.
                </Alert>
            )}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                <TextField label="Classe gramatical" value={values.PartOfSpeech} onChange={e => setField('PartOfSpeech', e.target.value)} size="small" fullWidth placeholder="phrasal verb"/>
                <TextField label="IPA (quando disponível)" value={values.IPA} onChange={e => setField('IPA', e.target.value)} size="small" fullWidth placeholder="/ˈfɪɡjɚ/"/>
                <TextField label="Definition (English)" value={values.EnglishDefinition} onChange={e => setField('EnglishDefinition', e.target.value)} size="small" fullWidth multiline minRows={2}/>
                <TextField label="Significado (português)" value={values.Portuguese} onChange={e => setField('Portuguese', e.target.value)} size="small" fullWidth multiline minRows={2}/>
            </Box>
            {message && <Alert severity="info" sx={{ mt: 1.5, py: 0.25 }}>{message}</Alert>}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Palavras selecionadas podem ser consultadas em serviços externos (Dictionary API e MyMemory). Traduções e IPA exigem revisão.
            </Typography>
        </Box>
    );
}
