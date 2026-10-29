import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

const dependent = ['PartOfSpeech', 'IPA', 'EnglishDefinition', 'DictionarySource'];

type Props = {
    first: string;
    second: string;
    onFirstChange: (value: string) => void;
    onFieldsChange: (fields: Record<string, string>) => void;
};

/**
 * Single source of truth: Word and Word2 on the Anki note. Do not repeat
 * editable word inputs in the dictionary detail cards.
 */
export default function CleanWordFields({ first, second, onFirstChange, onFieldsChange }: Props) {
    const [secondVisible, setSecondVisible] = useState(Boolean(second.trim()));
    useEffect(() => {
        if (second.trim()) setSecondVisible(true);
    }, [second]);

    const clearFirst = (value: string) => {
        onFirstChange(value);
        onFieldsChange(Object.fromEntries(dependent.map(field => [field, ''])));
    };

    const changeSecond = (value: string) => {
        onFieldsChange({
            Word2: value,
            ...Object.fromEntries(dependent.map(field => [field + '2', ''])),
        });
    };

    const removeSecond = () => {
        changeSecond('');
        setSecondVisible(false);
    };

    return (
        <Box sx={{
            gridColumn: '1 / -1',
            minWidth: 0,
            p: 1.5,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
        }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', minWidth: 0 }}>
                <TextField
                    label="Word / Expression 1"
                    placeholder="Type any word, phrasal verb or idiom"
                    variant="outlined"
                    size="small"
                    fullWidth
                    value={first}
                    onChange={event => clearFirst(event.target.value)}
                    sx={{ minWidth: 0 }}
                />
                {!secondVisible && (
                    <Tooltip title="Add second word or expression">
                        <span>
                            <IconButton
                                type="button"
                                color="primary"
                                aria-label="Add second word or expression"
                                onClick={() => setSecondVisible(true)}
                            >
                                <AddIcon />
                            </IconButton>
                        </span>
                    </Tooltip>
                )}
            </Box>
            {secondVisible && (
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', minWidth: 0 }}>
                    <TextField
                        label="Word / Expression 2"
                        placeholder="Second word or expression"
                        variant="outlined"
                        size="small"
                        fullWidth
                        value={second}
                        onChange={event => changeSecond(event.target.value)}
                        sx={{ minWidth: 0 }}
                    />
                    <Tooltip title="Remove second expression">
                        <IconButton
                            type="button"
                            aria-label="Remove second expression"
                            onClick={removeSecond}
                        >
                            <DeleteOutlineIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
            )}
        </Box>
    );
}
