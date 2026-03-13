export class ExpressionEvaluator {
    constructor(interpreter) {
        this.interpreter = interpreter;
    }

    evaluateExpression(expression) {
        if (!expression) return '';

        if (expression.startsWith('"') && expression.endsWith('"')) {
            return expression.slice(1, -1);
        }

        if (expression.startsWith("'") && expression.endsWith("'")) {
            return expression.slice(1, -1);
        }

        if (!isNaN(expression) && expression.trim() !== '') {
            return parseFloat(expression);
        }

        if (expression === "true") return true;
        if (expression === "false") return false;
        if (expression === "null") return null;
        if (expression === "undefined") return undefined;

        try {
            expression = expression.replace(/([a-zA-Z_][a-zA-Z0-9_]*)\[([^\]]+)\]/g, 
                (match, arrayName, indexExpr) => {
                    if (this.interpreter.arrays.hasOwnProperty(arrayName)) {
                        const index = this.evaluateExpression(indexExpr);
                        if (index >= 0 && index < this.interpreter.arrays[arrayName].length) {
                            const value = this.interpreter.arrays[arrayName][index];
                            return typeof value === 'string' ? `"${value}"` : value;
                        } else {
                            this.interpreter.error = `Индекс ${index} вне границ массива ${arrayName}`;
                            return '0';
                        }
                    } else {
                        this.interpreter.error = `Массив ${arrayName} не объявлен`;
                        return '0';
                    }
                });

            expression = expression.replace(/[a-zA-Z_][a-zA-Z0-9_]*/g, (name) => {
                if (this.interpreter.variables.hasOwnProperty(name)) {
                    const value = this.interpreter.variables[name];
                    return typeof value === 'string' ? `"${value}"` : value;
                }
                return name;
            });

            if (expression.trim() === '') return '';

            try {
                if (expression.includes('function') || 
                    expression.includes('constructor') || 
                    expression.includes('__proto__')) {
                    return 0;
                }

                return Function('"use strict"; return (' + expression + ')')();
            } catch {
                return expression;
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

            expr = expr.replace(/([a-zA-Z_][a-zA-Z0-9_]*)\[([^\]]+)\]/g, 
                (match, arrayName, indexExpr) => {
                    if (this.interpreter.arrays.hasOwnProperty(arrayName)) {
                        const index = this.evaluateExpression(indexExpr);
                        if (index >= 0 && index < this.interpreter.arrays[arrayName].length) {
                            return JSON.stringify(this.interpreter.arrays[arrayName][index]);
                        } else {
                            this.interpreter.error = `Индекс ${index} вне границ массива ${arrayName}`;
                            return 'false';
                        }
                    } else {
                        this.interpreter.error = `Массив ${arrayName} не объявлен`;
                        return 'false';
                    }
                });

            const evaluateArithmetic = (str) => {
                return str.replace(/([a-zA-Z_][a-zA-Z0-9_]*)\s*([\+\-\*\/])\s*([a-zA-Z0-9_]+)/g, 
                    (match, left, op, right) => {
                        const leftVal = this.resolveValue(left);
                        const rightVal = this.resolveValue(right);

                        switch(op) {
                            case '+': return leftVal + rightVal;
                            case '-': return leftVal - rightVal;
                            case '*': return leftVal * rightVal;
                            case '/': return rightVal !== 0 ? leftVal / rightVal : 0;
                            default: return match;
                        }
                    });
            };

            expr = expr.replace(/\(([^\(\)]+)\)/g, (match, inner) => {
                return evaluateArithmetic(inner);
            });

            expr = evaluateArithmetic(expr);

            expr = expr.replace(/[a-zA-Z_][a-zA-Z0-9_]*/g, (name) => {
                if (this.interpreter.variables.hasOwnProperty(name)) {
                    return JSON.stringify(this.interpreter.variables[name]);
                }
                return name;
            });

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

        if (!isNaN(input) && input.trim() !== '') {
            return parseFloat(input);
        }

        if ((input.startsWith('"') && input.endsWith('"')) || 
            (input.startsWith("'") && input.endsWith("'"))) {
            return input.slice(1, -1);
        }

        if (input === "true") return true;
        if (input === "false") return false;
        if (input === "null") return null;
        if (input === "undefined") return undefined;

        if (this.interpreter.variables.hasOwnProperty(input)) {
            return this.interpreter.variables[input];
        }

        const arrayMatch = input.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\[([^\]]+)\]$/);
        if (arrayMatch) {
            const arrayName = arrayMatch[1];
            const indexExpr = arrayMatch[2];
            const index = this.evaluateExpression(indexExpr);

            if (this.interpreter.arrays.hasOwnProperty(arrayName)) {
                if (index >= 0 && index < this.interpreter.arrays[arrayName].length) {
                    return this.interpreter.arrays[arrayName][index];
                } else {
                    this.interpreter.error = `Индекс ${index} вне границ массива ${arrayName}`;
                    return undefined;
                }
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

        if (!isNaN(input) && input.trim() !== '') {
            return parseFloat(input);
        }

        if (this.interpreter.variables.hasOwnProperty(input)) {
            return this.interpreter.variables[input];
        }

        const arrayMatch = input.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\[([^\]]+)\]$/);
        if (arrayMatch) {
            const arrayName = arrayMatch[1];
            const indexExpr = arrayMatch[2];
            const index = this.evaluateExpression(indexExpr);

            if (this.interpreter.arrays.hasOwnProperty(arrayName)) {
                if (index >= 0 && index < this.interpreter.arrays[arrayName].length) {
                    return this.interpreter.arrays[arrayName][index];
                } else {
                    return 0;
                }
            }
        }

        try {
            return this.evaluateExpression(input);
        } catch {
            return 0;
        }
    }
}