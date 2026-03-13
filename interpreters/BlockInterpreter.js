import { BLOCK_TYPES, ARITHMETIC_BLOCKS } from '../models/BlockTypes.js';
import { ExpressionEvaluator } from './ExpressionEvaluator.js';
import { BlockConnector } from '../managers/BlockConnector.js';
import { OutputFormatter } from '../utils/OutputFormatter.js';

export class BlockInterpreter {
    constructor() {
        this.variables = {};
        this.arrays = {};
        this.loopStack = [];
        this.output = [];
        this.lastValue = undefined;
        this.skipToEndIf = false;
        this.skipToElse = false;
        this.skipToEndElse = false;
        this.error = null;
        this.maxIterations = 10000;
        this.functions = {};
        this.returnStack = [];
        this.nextAfterLoop = null;
        this.skipToEndFunction = false;
        
        this.evaluator = new ExpressionEvaluator(this);
        this.blockConnector = new BlockConnector();
        this.outputFormatter = new OutputFormatter();
    }

    run() {
        this.reset();
        this.scanFunctions();

        const blocks = document.querySelectorAll('#WorkspaceArea .block, #WorkspaceArea .block-bracket');

        if (blocks.length === 0) {
            document.getElementById('output').innerHTML = '❌ Добавь блоки в рабочую область!';
            return;
        }

        if (blocks.length === 1) {
            this.executeBlock(blocks[0]);
        } else {
            const root = this.blockConnector.findRootBlock(blocks);
            if (!root) {
                document.getElementById('output').innerHTML = '❌ Не удалось найти начало программы!';
                return;
            }
            this.executeBlock(root);
        }

        this.showOutput();
    }

    reset() {
        this.lastValue = undefined;
        this.variables = {};
        this.arrays = {};
        this.loopStack = [];
        this.output = [];
        this.skipToElse = false;
        this.skipToEndElse = false;
        this.skipToEndIf = false;
        this.error = null;
        this.nextAfterLoop = null;
        this.skipToEndFunction = false;
    }

    executeBlock(block) {
        if (!block || this.error) return;

        const type = block.dataset.type;

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
        
        const type = block.dataset.type;
        
        if (this.skipToElse) {
            if (type === BLOCK_TYPES.ELSE) {
                this.skipToElse = false;
                return false;
            }
            if (type === BLOCK_TYPES.ENDIF) {
                this.skipToElse = false;
                this.skipToEndIf = false;
                return true;
            }
            return true;
        }
        
        if (this.skipToEndIf) {
            if (type === BLOCK_TYPES.ENDIF) {
                this.skipToEndIf = false;
                return true;
            }
            return true;
        }
        
        if (this.skipToEndElse) {
            if (type === BLOCK_TYPES.ENDELSE) {
                this.skipToEndElse = false;
                return true;
            }
            return true;
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
            const type = block.dataset.type;
            const nameInput = block.querySelector('.var-name, .name, .func-name');
            const valueInput = block.querySelector('.var-value, .value, .if-expression, .while-expression, .index, .size');
            
            const name = nameInput ? nameInput.value.trim() : '';

            if (type === BLOCK_TYPES.PRINT) {
                if (name) {
                    const value = this.evaluator.evaluatePrintValue(name);
                    this.output.push(value);
                } else {
                    this.output.push('');
                }
                return;
            }

            switch(type) {
                case BLOCK_TYPES.DECLARE:
                    this.executeDeclare(name, valueInput);
                    break;
                case BLOCK_TYPES.SET:
                    this.executeSet(name, valueInput);
                    break;
                case BLOCK_TYPES.ARRAY:
                    this.executeArrayDeclaration(block);
                    break;
                case BLOCK_TYPES.INDEX_DECLARE:
                    this.executeArraySet(block);
                    break;
                case BLOCK_TYPES.INDEX_TAKE:
                    this.executeArrayGet(block);
                    break;
                case BLOCK_TYPES.IF:
                    this.executeIf(block);
                    break;
                case BLOCK_TYPES.ELSE:
                case BLOCK_TYPES.ENDIF:
                case BLOCK_TYPES.ENDELSE:
                    break;
                case BLOCK_TYPES.WHILE:
                    this.executeWhile(block);
                    break;
                case BLOCK_TYPES.ENDWHILE:
                    this.loopStack.pop();
                    break;
                case BLOCK_TYPES.CALL:
                    this.executeCall(block);
                    break;
                case BLOCK_TYPES.FUNCTION:
                case BLOCK_TYPES.ENDFUNCTION:
                    break;
                default:
                    if (ARITHMETIC_BLOCKS.includes(type)) {
                        this.executeArithmetic(block, type);
                    }
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

        if (this.variables.hasOwnProperty(name)) {
            this.error = `Переменная "${name}" уже объявлена. Используйте блок "Установить" для изменения значения`;
            return;
        }

        const expression = valueInput ? valueInput.value.trim() : '';

        if (expression) {
            const value = this.evaluator.evaluateExpression(expression);
            this.variables[name] = value;
        } else {
            this.variables[name] = 0;
        }
    }

    executeSet(name, valueInput) {
        if (!name) {
            this.error = 'Имя переменной не указано';
            return;
        }

        if (!this.variables.hasOwnProperty(name)) {
            this.error = `Переменная ${name} не объявлена`;
            return;
        }

        const expression = valueInput ? valueInput.value.trim() : '';

        if (expression) {
            const value = this.evaluator.evaluateExpression(expression);
            this.variables[name] = value;
        } else {
            this.error = `Недопустимое значение для переменной ${name}`;
        }
    }

    executeArrayDeclaration(block) {
        const nameInput = block.querySelector('.name');
        const sizeInput = block.querySelector('.size');

        if (nameInput && sizeInput) {
            const name = nameInput.value.trim();
            const sizeFiltered = sizeInput.value.trim();

            if (name && sizeFiltered) {
                const size = this.evaluator.evaluateExpression(sizeFiltered);
                if (typeof size === 'number' && size > 0 && Number.isInteger(size)) {
                    this.arrays[name] = new Array(size).fill(0);
                } else {
                    this.error = `Некорректный размер массива: ${sizeFiltered}`;
                    return;
                }
            }
        }
    }

    executeArraySet(block) {
        const nameInput = block.querySelector('.name');
        const indexInput = block.querySelector('.index');
        const valueInput = block.querySelector('.value');

        if (nameInput && indexInput && valueInput) {
            const name = nameInput.value.trim();
            const indexFiltered = indexInput.value.trim();
            const valueFiltered = valueInput.value.trim();

            if (name && indexFiltered && valueFiltered) {
                if (!this.arrays.hasOwnProperty(name)) {
                    this.error = `Массив ${name} не объявлен`;
                    return;
                }

                const index = this.evaluator.evaluateExpression(indexFiltered);
                const value = this.evaluator.evaluateExpression(valueFiltered);

                if (typeof index !== 'number' || !Number.isInteger(index) || index < 0) {
                    this.error = `Индекс должен быть неотрицательным целым числом: ${indexFiltered}`;
                    return;
                }

                if (index >= this.arrays[name].length) {
                    this.error = `Индекс ${index} вне границ массива ${name} [0 - ${this.arrays[name].length - 1}]`;
                    return;
                }

                this.arrays[name][index] = value;
            }
        }
    }

    executeArrayGet(block) {
        const varNameInput = block.querySelector('.name');
        const arrNameInput = block.querySelector('.value');
        const arrIndexInput = block.querySelector('.index');

        if (varNameInput && arrNameInput && arrIndexInput) {
            const varName = varNameInput.value.trim();
            const arrName = arrNameInput.value.trim();
            const arrIndex = arrIndexInput.value.trim();

            if (varName && arrName && arrIndex) {
                if (!this.variables.hasOwnProperty(varName)) {
                    this.error = `Переменная ${varName} не объявлена`;
                    return;
                }

                if (!this.arrays.hasOwnProperty(arrName)) {
                    this.error = `Массив ${arrName} не объявлен`;
                    return;
                }

                const index = this.evaluator.evaluateExpression(arrIndex);

                if (typeof index !== "number" || !Number.isInteger(index) || index < 0) {
                    this.error = `Индекс должен быть неотрицательным целым числом: ${index}`;
                    return;
                }

                if (index >= this.arrays[arrName].length) {
                    this.error = `Индекс ${index} вне границ массива ${arrName} [0 - ${this.arrays[arrName].length - 1}]`;
                    return;
                }

                this.variables[varName] = this.arrays[arrName][index];
            }
        }
    }

    executeIf(block) {
        try {
            const expressionInput = block.querySelector('.if-expression');
            const expression = expressionInput ? expressionInput.value.trim() : "";

            const result = this.evaluator.evaluateLogicalExpression(expression);

            if (!result) {
                let next = this.blockConnector.getNextBlock(block);
                while (next) {
                    if (next.dataset.type === BLOCK_TYPES.ELSE) {
                        this.skipToElse = true;
                        this.skipToEndIf = false;
                        this.skipToEndElse = false;
                        break;
                    }
                    if (next.dataset.type === BLOCK_TYPES.ENDIF) {
                        this.skipToEndIf = true;
                        this.skipToElse = false;
                        this.skipToEndElse = false;
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
            const expression = expressionInput ? expressionInput.value.trim() : "";

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
                iterations++;

                if (iterations > this.maxIterations) {
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

            if (current.dataset.type === BLOCK_TYPES.WHILE) {
                depth++;
            } else if (current.dataset.type === BLOCK_TYPES.ENDWHILE) {
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
        const inputs = block.querySelectorAll('input');
        if (inputs.length < 2) return;

        const leftInput = inputs[0].value.trim();
        const rightInput = inputs[1].value.trim();

        const left = this.evaluator.resolveValue(leftInput);
        const right = this.evaluator.resolveValue(rightInput);

        let result = 0;
        switch(type) {
            case BLOCK_TYPES.PLUS:
                result = left + right;
                break;
            case BLOCK_TYPES.MINUS:
                result = left - right;
                break;
            case BLOCK_TYPES.PROD:
                result = left * right;
                break;
            case BLOCK_TYPES.DIVISION:
                if (right === 0) {
                    this.error = "Деление на ноль";
                    return;
                }
                result = left / right;
                break;
            case BLOCK_TYPES.REMAINS:
                if (right === 0) {
                    this.error = "Деление на ноль";
                    return;
                }
                result = left % right;
                break;
        }

        this.lastValue = result;

        if (leftInput && this.variables.hasOwnProperty(leftInput)) {
            this.variables[leftInput] = result;
        }
    }

    scanFunctions() {
        const blocks = document.querySelectorAll('#WorkspaceArea .block');

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

                this.functions[name] = {
                    start: block,
                    end: end
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

            if (current.dataset.type === BLOCK_TYPES.FUNCTION) {
                depth++;
            } else if (current.dataset.type === BLOCK_TYPES.ENDFUNCTION) {
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

        if (!this.functions[name]) {
            this.error = `Функция ${name} не объявлена`;
            return;
        }

        const func = this.functions[name];
        const firstChild = func.start.dataset.child
            ? document.getElementById(func.start.dataset.child)
            : null;

        if (!firstChild) return;

        this.returnStack.push({
            nextAfterCall: this.blockConnector.getNextBlock(block)
        });

        this.executeBlockRange(firstChild, func.end);

        const returnState = this.returnStack.pop();
        if (returnState && returnState.nextAfterCall && !this.error) {
            this.nextAfterLoop = returnState.nextAfterCall;
        }
    }

    showOutput() {
        if (this.error) {
            document.getElementById('output').innerHTML = this.outputFormatter.formatError(
                this.error, this.variables, this.arrays
            );
        } else {
            document.getElementById('output').innerHTML = this.outputFormatter.formatSuccess(this.output);
        }
    }
}