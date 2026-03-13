export class OutputFormatter {
    formatSuccess(output) {
        const outputArray = [...output];
        
        if (outputArray.length === 0) {
            return `
                <strong>✅ Выполнено успешно!</strong><br><br>
                <span>Вывод отсутствует</span>`;
        }

        const formattedOutput = outputArray
            .map(value => this.formatValue(value))
            .join('<br>');

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

    formatValue(value) {
        const typeHandlers = {
            'undefined': () => '<span>undefined</span>',
            'object': () => {
                if (value === null) return '<span>null</span>';
                if (Array.isArray(value)) return `<span>${this.formatArray(value)}</span>`;
                return this.escapeHtml(String(value));
            },
            'string': () => `<span>"${this.escapeHtml(value)}"</span>`,
            'number': () => `<span>${value}</span>`,
            'boolean': () => `<span>${value}</span>`
        };

        const handler = typeHandlers[typeof value];
        return handler ? handler() : this.escapeHtml(String(value));
    }

    formatError(message, variables, arrays) {
        const varsHtml = this.formatVariablesForError(
            { ...variables }, 
            { ...arrays }
        );

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
            const vars = Object.entries(variables)
                .map(([name, value]) => {
                    const valueStr = typeof value === 'string' ? `"${value}"` : String(value);
                    return `<code>${name} = ${valueStr}</code>`;
                });

            const arraysFormatted = Object.entries(arrays)
                .map(([name, array]) => {
                    const arrayStr = `[${array.join(', ')}]`;
                    return `<code>${name} = ${arrayStr}</code>`;
                });

            const allEntries = [...vars, ...arraysFormatted];

            return allEntries.length > 0 
                ? allEntries.join(', ')
                : '<code>Нет переменных</code>';
        } catch {
            return '<code>Не удалось отобразить переменные</code>';
        }
    }

    formatArray(arr) {
        try {
            const items = [...arr].map(item => {
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