import { BLOCK_TYPES, ARITHMETIC_BLOCKS } from '../models/BlockTypes.js';
import { ExpressionEvaluator } from './ExpressionEvaluator.js';
import { BlockConnector } from '../managers/BlockConnector.js';
import { OutputFormatter } from '../utils/OutputFormatter.js';

export class BlockInterpreter {
    constructor() {
        this.evaluator = new ExpressionEvaluator(this);
        this.blockConnector = new BlockConnector();
        this.outputFormatter = new OutputFormatter();
        this.maxIterations = 10000;
        this.reset();
    }

    reset() {
        ({
            variables: this.variables = {},
            arrays: this.arrays = {},
            loopStack: this.loopStack = [],
            output: this.output = [],
            lastValue: this.lastValue = undefined,
            skipToEndIf: this.skipToEndIf = false,
            skipToElse: this.skipToElse = false,
            skipToEndElse: this.skipToEndElse = false,
            error: this.error = null,
            functions: this.functions = {},
            returnStack: this.returnStack = [],
            nextAfterLoop: this.nextAfterLoop = null,
            skipToEndFunction: this.skipToEndFunction = false
        } = {});
    }

    run() {
        this.reset();
        this.scanFunctions();

        const blocks = document.querySelectorAll('#WorkspaceArea .block, #WorkspaceArea .block-bracket');
        const blocksArray = [...blocks];

        if (blocksArray.length === 0) {
            document.getElementById('output').innerHTML = '❌ Добавь блоки в рабочую область!';
            return;
        }

        const root = blocksArray.length === 1 
            ? blocksArray[0] 
            : this.blockConnector.findRootBlock(blocksArray);

        if (!root) {
            document.getElementById('output').innerHTML = '❌ Не удалось найти начало программы!';
            return;
        }

        this.executeBlock(root);
        this.showOutput();
    }

    executeBlock(block) {
        if (!block || this.error) return;

        if (this.shouldSkipBlock(block)) {
            this.executeBlock(this.blockConnector.getNextBlock(block));
            return;
        }

        this.execute(block);

        if (this.error) return;

        if (this.nextAfterLoop) {
            const next = this.nextAfterLoop;
            this.nextAfterLoop = null;
            this.executeBlock(next);
            return;
        }

        this.executeBlock(this.blockConnector.getNextBlock(block));
    }

    shouldSkipBlock(block) {
        if (!block) return false;
        
        const { type } = block.dataset;
        
        const skipStates = [
            { flag: 'skipToElse', target: BLOCK_TYPES.ELSE, onMatch: () => {
                this.skipToElse = false;
                return false;
            }, onContinue: true },
            { flag: 'skipToElse', target: BLOCK_TYPES.ENDIF, onMatch: () => {
                this.skipToElse = false;
                this.skipToEndIf = false;
                return true;
            }, onContinue: true },
            { flag: 'skipToEndIf', target: BLOCK_TYPES.ENDIF, onMatch: () => {
                this.skipToEndIf = false;
                return true;
            }, onContinue: true },
            { flag: 'skipToEndElse', target: BLOCK_TYPES.ENDELSE, onMatch: () => {
                this.skipToEndElse = false;
                return true;
            }, onContinue: true }
        ];

        for (const { flag, target, onMatch, onContinue } of skipStates) {
            if (this[flag]) {
                if (type === target) {
                    return onMatch();
                }
                return onContinue;
            }
        }

        if (type === BLOCK_TYPES.FUNCTION) {
            this.skipToEndFunction = true;
            return true;
        }

        if (this.skipToEndFunction) {
            if (type === BLOCK_TYPES.ENDFUNCTION) {
                this.skipToEndFunction = false;
            }
            return true;
        }
        
        return false;
    }

    execute(block) {
        try {
            const { type } = block.dataset;
            const [nameInput, valueInput] = [
                block.querySelector('.var-name, .name, .func-name'),
                block.querySelector('.var-value, .value, .if-expression, .while-expression, .index, .size')
            ];
            
            const name = nameInput?.value.trim() ?? '';

            if (type === BLOCK_TYPES.PRINT) {
                this.output.push(name ? this.evaluator.evaluatePrintValue(name) : '');
                return;
            }

            const executors = {
                [BLOCK_TYPES.DECLARE]: () => this.executeDeclare(name, valueInput),
                [BLOCK_TYPES.SET]: () => this.executeSet(name, valueInput),
                [BLOCK_TYPES.ARRAY]: () => this.executeArrayDeclaration(block),
                [BLOCK_TYPES.INDEX_DECLARE]: () => this.executeArraySet(block),
                [BLOCK_TYPES.INDEX_TAKE]: () => this.executeArrayGet(block),
                [BLOCK_TYPES.IF]: () => this.executeIf(block),
                [BLOCK_TYPES.WHILE]: () => this.executeWhile(block),
                [BLOCK_TYPES.ENDWHILE]: () => this.loopStack.pop(),
                [BLOCK_TYPES.CALL]: () => this.executeCall(block)
            };

            const executor = executors[type];
            if (executor) {
                executor();
            } else if (ARITHMETIC_BLOCKS.includes(type)) {
                this.executeArithmetic(block, type);
            }
        } catch(error) {
            this.error = `Ошибка в блоке ${block.dataset.type}: ${error.message}`;
        }
    }

    executeDeclare(name, valueInput) {
        if (!name) {
            this.error = 'Имя переменной не указано';
            return;
        }

        if (name in this.variables) {
            this.error = `Переменная "${name}" уже объявлена. Используйте блок "Установить" для изменения значения`;
            return;
        }

        const expression = valueInput?.value.trim() ?? '';
        const value = expression ? this.evaluator.evaluateExpression(expression) : 0;

        this.variables = {
            ...this.variables,
            [name]: value
        };
    }

    executeSet(name, valueInput) {
        if (!name) {
            this.error = 'Имя переменной не указано';
            return;
        }

        if (!(name in this.variables)) {
            this.error = `Переменная ${name} не объявлена`;
            return;
        }

        const expression = valueInput?.value.trim() ?? '';

        if (expression) {
            const value = this.evaluator.evaluateExpression(expression);
            this.variables = {
                ...this.variables,
                [name]: value
            };
        } else {
            this.error = `Недопустимое значение для переменной ${name}`;
        }
    }

    executeArrayDeclaration(block) {
        const [nameInput, sizeInput] = [
            block.querySelector('.name'),
            block.querySelector('.size')
        ];

        if (nameInput && sizeInput) {
            const name = nameInput.value.trim();
            const sizeFiltered = sizeInput.value.trim();

            if (name && sizeFiltered) {
                const size = this.evaluator.evaluateExpression(sizeFiltered);
                if (typeof size === 'number' && size > 0 && Number.isInteger(size)) {
                    this.arrays = {
                        ...this.arrays,
                        [name]: new Array(size).fill(0)
                    };
                } else {
                    this.error = `Некорректный размер массива: ${sizeFiltered}`;
                }
            }
        }
    }

    executeArraySet(block) {
        const [nameInput, indexInput, valueInput] = [
            block.querySelector('.name'),
            block.querySelector('.index'),
            block.querySelector('.value')
        ];

        if (nameInput && indexInput && valueInput) {
            const name = nameInput.value.trim();
            const indexFiltered = indexInput.value.trim();
            const valueFiltered = valueInput.value.trim();

            if (name && indexFiltered && valueFiltered) {
                if (!(name in this.arrays)) {
                    this.error = `Массив ${name} не объявлен`;
                    return;
                }

                const index = this.evaluator.evaluateExpression(indexFiltered);
                const value = this.evaluator.evaluateExpression(valueFiltered);

                if (typeof index !== 'number' || !Number.isInteger(index) || index < 0) {
                    this.error = `Индекс должен быть неотрицательным целым числом: ${indexFiltered}`;
                    return;
                }

                const array = this.arrays[name];
                if (index >= array.length) {
                    this.error = `Индекс ${index} вне границ массива ${name} [0 - ${array.length - 1}]`;
                    return;
                }

                this.arrays = {
                    ...this.arrays,
                    [name]: [
                        ...array.slice(0, index),
                        value,
                        ...array.slice(index + 1)
                    ]
                };
            }
        }
    }

    executeArrayGet(block) {
        const [varNameInput, arrNameInput, arrIndexInput] = [
            block.querySelector('.name'),
            block.querySelector('.value'),
            block.querySelector('.index')
        ];

        if (varNameInput && arrNameInput && arrIndexInput) {
            const varName = varNameInput.value.trim();
            const arrName = arrNameInput.value.trim();
            const arrIndex = arrIndexInput.value.trim();

            if (varName && arrName && arrIndex) {
                if (!(varName in this.variables)) {
                    this.error = `Переменная ${varName} не объявлена`;
                    return;
                }

                if (!(arrName in this.arrays)) {
                    this.error = `Массив ${arrName} не объявлен`;
                    return;
                }

                const index = this.evaluator.evaluateExpression(arrIndex);

                if (typeof index !== "number" || !Number.isInteger(index) || index < 0) {
                    this.error = `Индекс должен быть неотрицательным целым числом: ${index}`;
                    return;
                }

                const array = this.arrays[arrName];
                if (index >= array.length) {
                    this.error = `Индекс ${index} вне границ массива ${arrName} [0 - ${array.length - 1}]`;
                    return;
                }

                this.variables = {
                    ...this.variables,
                    [varName]: array[index]
                };
            }
        }
    }

    executeIf(block) {
        try {
            const expressionInput = block.querySelector('.if-expression');
            const expression = expressionInput?.value.trim() ?? "";

            const result = this.evaluator.evaluateLogicalExpression(expression);

            if (!result) {
                let next = this.blockConnector.getNextBlock(block);
                while (next) {
                    const { type } = next.dataset;
                    if (type === BLOCK_TYPES.ELSE) {
                        ({ skipToElse: this.skipToElse = true, 
                           skipToEndIf: this.skipToEndIf = false, 
                           skipToEndElse: this.skipToEndElse = false } = {});
                        break;
                    }
                    if (type === BLOCK_TYPES.ENDIF) {
                        ({ skipToEndIf: this.skipToEndIf = true, 
                           skipToElse: this.skipToElse = false, 
                           skipToEndElse: this.skipToEndElse = false } = {});
                        break;
                    }
                    next = this.blockConnector.getNextBlock(next);
                }
            }
        } catch(error) {
            this.error = `Ошибка в условии if: ${error.message}`;
        }
    }

    executeWhile(block) {
        try {
            const expressionInput = block.querySelector('.while-expression');
            const expression = expressionInput?.value.trim() ?? "";

            const endWhile = this.findMatchingEndWhile(block);
            if (!endWhile) {
                this.error = "Не найден endwhile для цикла";
                return;
            }

            const firstChild = block.dataset.child
                ? document.getElementById(block.dataset.child)
                : null;

            if (!firstChild) {
                this.error = "Тело цикла пусто";
                return;
            }

            let iterations = 0;

            while (!this.error && this.evaluator.evaluateLogicalExpression(expression)) {
                if (++iterations > this.maxIterations) {
                    this.error = "Превышено максимальное количество итераций";
                    break;
                }

                this.executeBlockRange(firstChild, endWhile);
            }

            this.nextAfterLoop = this.blockConnector.getNextBlock(endWhile);

        } catch(error) {
            this.error = `Ошибка в цикле while: ${error.message}`;
        }
    }

    findMatchingEndWhile(startBlock) {
        let current = this.blockConnector.getNextBlock(startBlock);
        let depth = 1;
        let safetyCounter = 0;
        const maxBlocks = 10000;

        while (current && safetyCounter < maxBlocks) {
            safetyCounter++;

            const { type } = current.dataset;
            if (type === BLOCK_TYPES.WHILE) {
                depth++;
            } else if (type === BLOCK_TYPES.ENDWHILE) {
                depth--;
                if (depth === 0) {
                    return current;
                }
            }
            current = this.blockConnector.getNextBlock(current);
        }

        return null;
    }

    executeBlockRange(startBlock, endBlock) {
        let current = startBlock;
        let safetyCounter = 0;
        const maxBlocks = 10000;

        while (current && current !== endBlock && !this.error && safetyCounter < maxBlocks) {
            safetyCounter++;

            const nextBlock = this.blockConnector.getNextBlock(current);

            if (!this.shouldSkipBlock(current)) {
                this.execute(current);
            }

            if (this.error) break;

            current = nextBlock;
        }

        if (safetyCounter >= maxBlocks) {
            this.error = "Превышена максимальная длина последовательности блоков";
        }
    }

    executeArithmetic(block, type) {
        const inputs = [...block.querySelectorAll('input')];
        if (inputs.length < 2) return;

        const [leftInput, rightInput] = inputs.map(input => input.value.trim());

        const left = this.evaluator.resolveValue(leftInput);
        const right = this.evaluator.resolveValue(rightInput);

        const operations = {
            [BLOCK_TYPES.PLUS]: () => left + right,
            [BLOCK_TYPES.MINUS]: () => left - right,
            [BLOCK_TYPES.PROD]: () => left * right,
            [BLOCK_TYPES.DIVISION]: () => {
                if (right === 0) {
                    this.error = "Деление на ноль";
                    return null;
                }
                return left / right;
            },
            [BLOCK_TYPES.REMAINS]: () => {
                if (right === 0) {
                    this.error = "Деление на ноль";
                    return null;
                }
                return left % right;
            }
        };

        const operation = operations[type];
        if (operation) {
            const result = operation();
            if (result !== null) {
                this.lastValue = result;
                if (leftInput in this.variables) {
                    this.variables = {
                        ...this.variables,
                        [leftInput]: result
                    };
                }
            }
        }
    }

    scanFunctions() {
        const blocks = [...document.querySelectorAll('#WorkspaceArea .block')];

        blocks.forEach(block => {
            if (block.dataset.type === BLOCK_TYPES.FUNCTION) {
                const nameInput = block.querySelector(".func-name");
                if (!nameInput) return;

                const name = nameInput.value.trim();
                if (!name) return;

                const end = this.findMatchingEndFunction(block);
                if (!end) {
                    this.error = `Функция ${name} не имеет endfunction`;
                    return;
                }

                this.functions = {
                    ...this.functions,
                    [name]: { start: block, end }
                };
            }
        });
    }

    findMatchingEndFunction(startBlock) {
        let current = this.blockConnector.getNextBlock(startBlock);
        let depth = 1;
        let safetyCounter = 0;
        const maxBlocks = 10000;

        while (current && safetyCounter < maxBlocks) {
            safetyCounter++;

            const { type } = current.dataset;
            if (type === BLOCK_TYPES.FUNCTION) {
                depth++;
            } else if (type === BLOCK_TYPES.ENDFUNCTION) {
                depth--;
                if (depth === 0) {
                    return current;
                }
            }
            current = this.blockConnector.getNextBlock(current);
        }

        return null;
    }

    executeCall(block) {
        const input = block.querySelector(".func-name");
        if (!input) return;

        const name = input.value.trim();

        if (!(name in this.functions)) {
            this.error = `Функция ${name} не объявлена`;
            return;
        }

        const { start, end } = this.functions[name];
        const firstChild = start.dataset.child
            ? document.getElementById(start.dataset.child)
            : null;

        if (!firstChild) return;

        this.returnStack = [
            ...this.returnStack,
            { nextAfterCall: this.blockConnector.getNextBlock(block) }
        ];

        this.executeBlockRange(firstChild, end);

        const [lastReturn, ...restReturns] = this.returnStack;
        this.returnStack = restReturns;
        
        if (lastReturn?.nextAfterCall && !this.error) {
            this.nextAfterLoop = lastReturn.nextAfterCall;
        }
    }

    showOutput() {
        const outputElement = document.getElementById('output');
        if (this.error) {
            outputElement.innerHTML = this.outputFormatter.formatError(
                this.error, { ...this.variables }, { ...this.arrays }
            );
        } else {
            outputElement.innerHTML = this.outputFormatter.formatSuccess([...this.output]);
        }
    }
}