export const BLOCK_TYPES = {
    DECLARE: 'declare',
    SET: 'set',
    PRINT: 'print',
    ARRAY: 'array',
    INDEX_DECLARE: 'index-declare',
    INDEX_TAKE: 'index-take',
    IF: 'if',
    ELSE: 'else',
    ENDIF: 'endif',
    ENDELSE: 'endelse',
    WHILE: 'while',
    ENDWHILE: 'endwhile',
    FOR: 'for',
    ENDFOR: 'endfor',
    PLUS: 'plus',
    MINUS: 'minus',
    PROD: 'prod',
    DIVISION: 'division',
    REMAINS: 'remains',
    FUNCTION: 'function',
    ENDFUNCTION: 'endfunction',
    CALL: 'call'
};

export const ARITHMETIC_BLOCKS = [
    BLOCK_TYPES.PLUS,
    BLOCK_TYPES.MINUS,
    BLOCK_TYPES.PROD,
    BLOCK_TYPES.DIVISION,
    BLOCK_TYPES.REMAINS
];

export const CONDITIONAL_BLOCKS = [
    BLOCK_TYPES.IF,
    BLOCK_TYPES.ELSE,
    BLOCK_TYPES.ENDIF,
    BLOCK_TYPES.ENDELSE
];

export const LOOP_BLOCKS = [
    BLOCK_TYPES.WHILE,
    BLOCK_TYPES.ENDWHILE
];

export const ALL_BLOCK_TYPES = [
    ...Object.values(BLOCK_TYPES)
];