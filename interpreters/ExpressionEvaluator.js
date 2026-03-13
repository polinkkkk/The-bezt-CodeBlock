export class ExpressionEvaluator {
    constructor(interpreter) {
        this.interpreter = interpreter;
    }

    evaluateExpression(expression) {
        if (!expression) return '';

        const stringLiterals = [
            { start: '"', end: '"' },
            { start: "'", end: "'" }
        ];

        for (const { start, end } of stringLiterals) {
            if (expression.startsWith(start) && expression.endsWith(end)) {
                return expression.slice(1, -1);
            }
        }

        const literals = {
            'true': true,
            'false': false,
            'null': null,
            'undefined': undefined
        };

        if (expression in literals) {
            return literals[expression];
        }

        if (!isNaN(expression) && expression.trim() !== '') {
            return parseFloat(expression);
        }

        try {
            let processedExpr = expression.replace(
                /([a-zA-Z_][a-zA-Z0-9_]*)\[([^\]]+)\]/g, 
                (match, arrayName, indexExpr) => {
                    if (arrayName in this.interpreter.arrays) {
                        const index = this.evaluateExpression(indexExpr);
                        const array = this.interpreter.arrays[arrayName];
                        if (index >= 0 && index < array.length) {
                            const value = array[index];
                            return typeof value === 'string' ? `"${value}"` : String(value);
                        }
                        this.interpreter.error = `Индекс ${index} вне границ массива ${arrayName}`;
                        return '0';
                    }
                    this.interpreter.error = `Массив ${arrayName} не объявлен`;
                    return '0';
                }
            );

            processedExpr = processedExpr.replace(
                /[a-zA-Z_][a-zA-Z0-9_]*/g, 
                (name) => {
                    if (name in this.interpreter.variables) {
                        const value = this.interpreter.variables[name];
                        return typeof value === 'string' ? `"${value}"` : String(value);
                    }
                    return name;
                }
            );

            if (processedExpr.trim() === '') return '';

            const dangerousPatterns = ['function', 'constructor', '__proto__'];
            if (dangerousPatterns.some(pattern => processedExpr.includes(pattern))) {
                return 0;
            }

            try {
                return Function('"use strict"; return (' + processedExpr + ')')();
            } catch {
                return processedExpr;
            }
        } catch {
            return 0;
        }
    }

    evaluateLogicalExpression(expression) {
        if (!expression) return false;

        try {
            let expr = expression
                .replace(/\bAND\b/gi, "&&")
                .replace(/\bOR\b/gi, "||")
                .replace(/\bNOT\b/gi, "!")
                .replace(/(?<![=!<>])=(?![=])/g, "==");

            expr = expr.replace(
                /([a-zA-Z_][a-zA-Z0-9_]*)\[([^\]]+)\]/g,
                (match, arrayName, indexExpr) => {
                    if (arrayName in this.interpreter.arrays) {
                        const index = this.evaluateExpression(indexExpr);
                        const array = this.interpreter.arrays[arrayName];
                        if (index >= 0 && index < array.length) {
                            return JSON.stringify(array[index]);
                        }
                        this.interpreter.error = `Индекс ${index} вне границ массива ${arrayName}`;
                        return 'false';
                    }
                    this.interpreter.error = `Массив ${arrayName} не объявлен`;
                    return 'false';
                }
            );

            const evaluateArithmetic = (str) => {
                return str.replace(
                    /([a-zA-Z_][a-zA-Z0-9_]*)\s*([\+\-\*\/])\s*([a-zA-Z0-9_]+)/g,
                    (match, left, op, right) => {
                        const leftVal = this.resolveValue(left);
                        const rightVal = this.resolveValue(right);

                        const operations = {
                            '+': () => leftVal + rightVal,
                            '-': () => leftVal - rightVal,
                            '*': () => leftVal * rightVal,
                            '/': () => rightVal !== 0 ? leftVal / rightVal : 0
                        };

                        const operation = operations[op];
                        return operation ? String(operation()) : match;
                    }
                );
            };

            expr = expr.replace(/\(([^\(\)]+)\)/g, (match, inner) => {
                return evaluateArithmetic(inner);
            });

            expr = evaluateArithmetic(expr);

            expr = expr.replace(
                /[a-zA-Z_][a-zA-Z0-9_]*/g,
                (name) => {
                    if (name in this.interpreter.variables) {
                        return JSON.stringify(this.interpreter.variables[name]);
                    }
                    return name;
                }
            );

            try {
                return Function('"use strict"; return (' + expr + ')')();
            } catch {
                this.interpreter.error = "Ошибка вычисления выражения: " + expression;
                return false;
            }
        } catch {
            this.interpreter.error = "Ошибка в выражении: " + expression;
            return false;
        }
    }

    evaluatePrintValue(input) {
        if (!input) return '';

        const numberValue = parseFloat(input);
        if (!isNaN(numberValue) && input.trim() !== '') {
            return numberValue;
        }

        const quotes = [
            { start: '"', end: '"' },
            { start: "'", end: "'" }
        ];

        for (const { start, end } of quotes) {
            if (input.startsWith(start) && input.endsWith(end)) {
                return input.slice(1, -1);
            }
        }

        const literals = {
            'true': true,
            'false': false,
            'null': null,
            'undefined': undefined
        };

        if (input in literals) {
            return literals[input];
        }

        if (input in this.interpreter.variables) {
            return this.interpreter.variables[input];
        }

        const arrayMatch = input.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\[([^\]]+)\]$/);
        if (arrayMatch) {
            const [, arrayName, indexExpr] = arrayMatch;
            const index = this.evaluateExpression(indexExpr);

            if (arrayName in this.interpreter.arrays) {
                const array = this.interpreter.arrays[arrayName];
                if (index >= 0 && index < array.length) {
                    return array[index];
                }
                this.interpreter.error = `Индекс ${index} вне границ массива ${arrayName}`;
                return undefined;
            }
        }

        try {
            return this.evaluateExpression(input);
        } catch {
            return input;
        }
    }

    resolveValue(input) {
        if (!input) return '';

        const numberValue = parseFloat(input);
        if (!isNaN(numberValue) && input.trim() !== '') {
            return numberValue;
        }

        if (input in this.interpreter.variables) {
            return this.interpreter.variables[input];
        }

        const arrayMatch = input.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\[([^\]]+)\]$/);
        if (arrayMatch) {
            const [, arrayName, indexExpr] = arrayMatch;
            const index = this.evaluateExpression(indexExpr);

            if (arrayName in this.interpreter.arrays) {
                const array = this.interpreter.arrays[arrayName];
                if (index >= 0 && index < array.length) {
                    return array[index];
                }
                return 0;
            }
        }

        try {
            return this.evaluateExpression(input);
        } catch {
            return 0;
        }
    }
}