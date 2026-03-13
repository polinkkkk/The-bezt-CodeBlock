export class OutputFormatter {
    formatSuccess(output) {
        if (output.length === 0) {
            return `
                <strong>✅ Выполнено успешно!</strong><br><br>
                <span>Вывод отсутствует</span>`;
        }

        const formattedOutput = output.map(value => {
            if (value === undefined) return '<span>undefined</span>';
            if (value === null) return '<span>null</span>';
            if (typeof value === 'string') return `<span>"${this.escapeHtml(value)}"</span>`;
            if (typeof value === 'number') return `<span>${value}</span>`;
            if (typeof value === 'boolean') return `<span>${value}</span>`;
            if (Array.isArray(value)) return `<span>${this.formatArray(value)}</span>`;
            return this.escapeHtml(String(value));
        }).join('<br>');

        return `
            <strong>✅ Выполнено успешно!</strong><br><br>
            <div>
                <strong>📤 Вывод:</strong><br>
                <div>
                    ${formattedOutput}
                </div>
            </div>
        `;
    }

    formatError(message, variables, arrays) {
        const varsHtml = this.formatVariablesForError(variables, arrays);

        return `
            <strong>❌ Ошибка выполнения!</strong><br><br>
            <div>
                ${this.escapeHtml(message)}
            </div>
            <div>Последние значения переменных:<br>
                ${varsHtml}
            </div>
        `;
    }

    formatVariablesForError(variables, arrays) {
        try {
            let result = [];

            const vars = Object.entries(variables)
                .map(([name, value]) => {
                    const valueStr = typeof value === 'string' ? `"${value}"` : String(value);
                    return `<code>${name} = ${valueStr}</code>`;
                });

            const arraysFormatted = Object.entries(arrays)
                .map(([name, array]) => {
                    return `<code>${name} = [${array.join(', ')}]</code>`;
                });

            result = [...vars, ...arraysFormatted];

            return result.join(', ') || '<code>Нет переменных</code>';
        } catch {
            return '<code>Не удалось отобразить переменные</code>';
        }
    }

    formatArray(arr) {
        try {
            const items = arr.map(item => {
                if (typeof item === 'string') return `"${item}"`;
                return String(item);
            }).join(', ');
            return `[${items}]`;
        } catch {
            return 'Ошибка в массиве!';
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}