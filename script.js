class DragAndDropManager
{
    constructor() 
    {
        this.DraggingNowElement = null;
        this.OriginalElement = null;
        this.IsDragging = false;
        this.OffsetX = 0;
        this.OffsetY = 0;
        this.CurrentX = 0;
        this.CurrentY = 0;
        
        this.PaddingBuffer = 100;
        this.DefaultWorkspaceSize = 400;
        this.SnapDistance = 40;

        this.WorkspaceArea = document.getElementById('WorkspaceArea');
        this.BlocksContainer = document.getElementById('BlocksContainer');
        this.WorkspaceArea.addEventListener('scroll', this.OnScroll.bind(this));

        this.Init();
    }

    Init() 
    {
        this.MakeBlocksDraggable();
        this.AddDocumentListeners();
    }

    OnScroll() {
        if (this.IsDragging && this.DraggingNowElement) {
            this.MoveAt(this.CurrentX, this.CurrentY);
        }
    }

    MakeBlocksDraggable() 
    {
        const blocks = document.querySelectorAll('.block, .block-bracket');

        blocks.forEach(block => 
        {
            block.dataset.parent = "";
            block.dataset.child = "";
            block.dataset.left = "";
            block.dataset.right = "";
            
            block.addEventListener('mousedown', this.OnMouseDown.bind(this));
        });
    }

    OnMouseDown(event) 
    {
        if (this.IsDragging) return; 

        const block = event.target.closest('.block, .block-bracket');
        if (!block) 
            return;

        const isInput = event.target.matches('input, select, button');
        if (isInput) return;

        event.preventDefault();
        event.stopPropagation();

        this.IsDragging = true;
        this.OriginalElement = block;

        const rectangle = block.getBoundingClientRect();

        this.OffsetX = event.clientX - rectangle.left;
        this.OffsetY = event.clientY - rectangle.top;

        if (!this.WorkspaceArea.contains(block))
        {
            this.DraggingNowElement = block.cloneNode(true);
            this.DraggingNowElement.id = "block-" + Date.now();
            this.DraggingNowElement.dataset.type = block.dataset.type; 
            this.DraggingNowElement.style.position = 'fixed';

            this.DraggingNowElement.style.width = rectangle.width + 'px';
            this.DraggingNowElement.style.height = rectangle.height + 'px';
            this.DraggingNowElement.style.left = rectangle.left + 'px';
            this.DraggingNowElement.style.top = rectangle.top + 'px';

            this.DraggingNowElement.dataset.parent = "";
            this.DraggingNowElement.dataset.child = "";

            this.DraggingNowElement.style.pointerEvents = 'none';
            this.DraggingNowElement.dataset.listenerAdded = "false";
            document.body.appendChild(this.DraggingNowElement);
            this.DraggingNowElement.addEventListener
            (
                'mousedown',
                this.OnMouseDown.bind(this)
            );
        } 
        else 
        {
            this.DetachBlock(block);    
            
            const workspace_rectangle = this.WorkspaceArea.getBoundingClientRect();

            const scrollLeft = this.WorkspaceArea.scrollLeft;
            const scrollTop = this.WorkspaceArea.scrollTop;

            this.DraggingNowElement = block;

            this.DraggingNowElement.style.left = (rectangle.left - workspace_rectangle.left + scrollLeft) + 'px';
            this.DraggingNowElement.style.top = (rectangle.top - workspace_rectangle.top + scrollTop) + 'px';

            this.DraggingNowElement.style.position = 'absolute';
        }

        this.DraggingNowElement.classList.add('dragging');

        this.MoveAt(event.clientX, event.clientY);
    }

    OnMouseMove(event) 
    {
        if (!this.IsDragging) 
            return;

        this.CurrentX = event.clientX;
        this.CurrentY = event.clientY;

        requestAnimationFrame(() => 
        {
            this.MoveAt(this.CurrentX, this.CurrentY);
        });
    }

    MoveAt(x, y) 
    {
        if (!this.DraggingNowElement)
            return;

        if (this.DraggingNowElement.style.position === 'fixed')
        {
            this.DraggingNowElement.style.left = (x - this.OffsetX) + 'px';
            this.DraggingNowElement.style.top  = (y - this.OffsetY) + 'px';
        }
        else
        {
            const workspace_rectangle = this.WorkspaceArea.getBoundingClientRect();

            const scrollLeft = this.WorkspaceArea.scrollLeft;
            const scrollTop = this.WorkspaceArea.scrollTop;

            this.DraggingNowElement.style.left = 
                (x - workspace_rectangle.left - this.OffsetX + scrollLeft) + 'px';

            this.DraggingNowElement.style.top = 
                (y - workspace_rectangle.top - this.OffsetY + scrollTop) + 'px';
        }
    }

    OnMouseUp(event) 
    {
        if (!this.IsDragging) 
            return;  

        if (this.DraggingNowElement) {
            this.DraggingNowElement.classList.remove('dragging');
        }

        const workspace_rectangle = this.WorkspaceArea.getBoundingClientRect();

        const inside_workspace =
            event.clientX >= workspace_rectangle.left &&
            event.clientX <= workspace_rectangle.right &&
            event.clientY >= workspace_rectangle.top &&
            event.clientY <= workspace_rectangle.bottom;

        if (inside_workspace) 
        {
            this.DropInsideWorkspace(event);
            this.TrySnap(this.DraggingNowElement);
        } 
        else 
        {
            if (this.DraggingNowElement)
            {
                this.DraggingNowElement.remove();
            }
        }

        this.CheckHint();
        this.CleanUp();
    }

    TrySnap(block)
    {
        const blocks = Array.from(
            this.WorkspaceArea.querySelectorAll('.block, .block-bracket')
            ).filter(b => b !== block);

        const rect1 = block.getBoundingClientRect();
        const workspaceRect = this.WorkspaceArea.getBoundingClientRect();

        const scrollLeft = this.WorkspaceArea.scrollLeft;
        const scrollTop = this.WorkspaceArea.scrollTop;

        let closest = null;
        let minDist = this.SnapDistance;
        let snapType = null;

        for (let other of blocks)
        {
            const rect2 = other.getBoundingClientRect();

            const isHorizontal =
                block.classList.contains('ariphm') ||
                block.classList.contains('block-bracket');

            const otherHorizontal =
                other.classList.contains('ariphm') ||
                other.classList.contains('block-bracket');


            if (isHorizontal && otherHorizontal)
            {
                if (other.dataset.right) continue;

                const horizontal = Math.abs(rect1.left - rect2.right);
                const vertical = Math.abs(rect1.top - rect2.top);

                if (horizontal < minDist && vertical < 40)
                {
                    closest = other;
                    minDist = horizontal;
                    snapType = "horizontal";
                }
            }

            if (!block.dataset.left && !block.dataset.right)
            {
                if (other.dataset.child) continue;

                const vertical = Math.abs(rect1.top - rect2.bottom);
                const horizontal = Math.abs(rect1.left - rect2.left);

                if (vertical < minDist && horizontal < 60)
                {
                    closest = other;
                    minDist = vertical;
                    snapType = "vertical";
                }
            }
        }

        if (!closest) return;

        const rect2 = closest.getBoundingClientRect();

        if (snapType === "horizontal")
        {
            block.style.left =
                (rect2.right - workspaceRect.left + scrollLeft) + 'px';

            block.style.top =
                (rect2.top - workspaceRect.top + scrollTop) + 'px';

            block.dataset.left = closest.id;
            closest.dataset.right = block.id;

            block.dataset.parent = "";
            closest.dataset.child = "";
        }

        if (snapType === "vertical")
        {
            block.style.left =
                (rect2.left - workspaceRect.left + scrollLeft) + 'px';

            block.style.top =
                (rect2.bottom - workspaceRect.top + scrollTop) + 'px';

            block.dataset.parent = closest.id;
            closest.dataset.child = block.id;
        }
    }

    DetachBlock(block)
    {
        const parent_id = block.dataset.parent;
        if (parent_id)
        {
            const parent = document.getElementById(parent_id);
            if (parent) parent.dataset.child = "";
            block.dataset.parent = "";
        }

        const left_id = block.dataset.left;
        if (left_id)
        {
            const left = document.getElementById(left_id);
            if (left) left.dataset.right = "";
            block.dataset.left = "";
        }

        const right_id = block.dataset.right;
        if (right_id)
        {
            const right = document.getElementById(right_id);
            if (right) right.dataset.left = "";
            block.dataset.right = "";
        }
    }

    DropInsideWorkspace(event) 
    {
        const workspace_rectangle = this.WorkspaceArea.getBoundingClientRect();
        const scrollLeft = this.WorkspaceArea.scrollLeft;
        const scrollTop = this.WorkspaceArea.scrollTop;

        const newTop = event.clientY - workspace_rectangle.top - this.OffsetY + scrollTop;
        const newLeft = event.clientX - workspace_rectangle.left - this.OffsetX + scrollLeft;

        if (!this.WorkspaceArea.contains(this.OriginalElement)) 
        {
            this.DraggingNowElement.style.position = 'absolute';    
            this.DraggingNowElement.style.pointerEvents = 'auto';

            this.WorkspaceArea.appendChild(this.DraggingNowElement);

            if (!this.DraggingNowElement.id)
            {
                this.DraggingNowElement.id = "block-" + Date.now();
            }

            this.DraggingNowElement.addEventListener
            (
                'mousedown',
                this.OnMouseDown.bind(this)
            );
        }

        this.DraggingNowElement.style.left = (newLeft) + 'px';

        this.DraggingNowElement.style.top = (newTop) + 'px';

        this.ExpandWorkspaceIfNeeded(newLeft, newTop);

        this.DraggingNowElement.classList.remove('dragging');
        this.CheckHint();
    }

    ExpandWorkspaceIfNeeded(x, y) 
    {
        const block = this.DraggingNowElement;
        if (!block) return;
        
        const blockHeight = block.offsetHeight;
        
        const blockBottom = y + blockHeight + this.PaddingBuffer;
        
        const currentHeight = parseInt(this.WorkspaceArea.style.minHeight) || this.WorkspaceArea.clientHeight;
        
        const needsHeightExpand = blockBottom > currentHeight;
        if (needsHeightExpand) {
            const newHeight = needsHeightExpand ? Math.max(blockBottom, currentHeight) : currentHeight;
            
            this.WorkspaceArea.style.minHeight = newHeight + 'px';
        }
    }

    ShrinkWorkspaceIfNeeded() 
    {
        const blocks = this.WorkspaceArea.querySelectorAll('.block, .block-bracket');
        
        if (blocks.length === 0) {
            this.WorkspaceArea.style.minHeight = this.DefaultWorkspaceSize + 'px';
            return;
        }

        let maxY = 0;
        
        blocks.forEach(block => {
            const left = parseInt(block.style.left) || 0;
            const top = parseInt(block.style.top) || 0;
            const width = block.offsetWidth;
            const height = block.offsetHeight;
            
            maxY = Math.max(maxY, top + height);
        });
        
        const targetHeight = Math.max(maxY + this.PaddingBuffer, this.DefaultWorkspaceSize);
        
        const currentHeight = parseInt(this.WorkspaceArea.style.minHeight) || this.WorkspaceArea.clientHeight;
        
        if (targetHeight < currentHeight) {
            this.WorkspaceArea.style.minHeight = targetHeight + 'px';
        }
    }

    CheckHint() 
    {
        const hint = this.WorkspaceArea.querySelector('.unselectable');
        if (hint) 
        {
            hint.style.display = this.WorkspaceArea.querySelectorAll('.block, .block-bracket').length === 0 ? 'block' : 'none';
        }
    }

    CleanUp() 
    {
        this.IsDragging = false;
        this.DraggingNowElement = null;
        this.OriginalElement = null;
    }

    AddDocumentListeners() 
    {
        document.addEventListener('mousemove', this.OnMouseMove.bind(this));
        document.addEventListener('mouseup', this.OnMouseUp.bind(this));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.DragAndDropManager = new DragAndDropManager();
    new BlockDeleter();
    new BlockInterpreter();
    document.getElementById('runButton').onclick = () => {
        new BlockInterpreter().Run();
    };
});

class BlockDeleter 
{
    constructor() 
    {
        this.Init();
    }
    
    Init() 
    {
        const remove_button = document.getElementById('removebutton');
        if (remove_button) 
        {
            remove_button.onclick = this.ClearWorkspace.bind(this);
        }
    }
    
    ClearWorkspace() 
    {
        const workspace = document.getElementById('WorkspaceArea');
        const blocks = workspace.querySelectorAll('.block, .block-bracket');
        
        blocks.forEach(block => 
        {
            const child_id = block.dataset.child;
            if (child_id) 
            {
                const child = document.getElementById(child_id);
                if (child) child.dataset.parent = "";
            }
            
            block.dataset.child = "";
            block.remove();
        });
        
        const drag_manager = window.DragAndDropManager || {}; 
        if (drag_manager.CheckHint)
        {
            drag_manager.CheckHint();
        }

        if (drag_manager.ShrinkWorkspaceIfNeeded) {
            drag_manager.ShrinkWorkspaceIfNeeded();
        }
        
        document.getElementById('output').innerHTML = '🧹 Рабочая область очищена!';
    }
}

class BlockInterpreter {
    constructor() {
        this.Variables = {};
        this.Arrays = {};
        this.LoopStack = [];
        this.Output = [];
        this.LastValue = undefined;
        this.SkipToEndIf = false;
        this.SkipToElse = false;
        this.SkipToEndElse = false;
        this.Error = null;
        this.MaxIterations = 10000;
        this.Functions = {};
        this.ReturnStack = [];
    }

    Run() {
        this.LastValue = undefined; 
        this.ScanFunctions();
        this.Variables = {};
        this.Arrays = {};
        this.LoopStack = [];
        this.Output = [];
        this.SkipToElse = false;
        this.SkipToEndElse = false;
        this.Error = null;

        const blocks = document.querySelectorAll('#WorkspaceArea .block, #WorkspaceArea .block-bracket');

        if (blocks.length === 0) {
            document.getElementById('output').innerHTML = '❌ Добавь блоки в рабочую область!';
            return;
        }

        if (blocks.length === 1) {
            const singleBlock = blocks[0];
            this.Execute(singleBlock);
            
            if (this.Error) {
                this.ShowError(this.Error);
                return;
            }
            
            this.ShowSuccessOutput();
            return;
        }

        const root = this.FindRoot(blocks);
        if (!root) {
            document.getElementById('output').innerHTML = '❌ Не удалось найти начало программы!';
            return;
        }

        this.ExecuteBlock(root);
        
        if (this.Error) {
            this.ShowError(this.Error);
            return;
        }

        this.ShowSuccessOutput();
    }

    ExecuteBlock(block) {
    if (!block || this.Error) return;

    const type = block.dataset.type;

    if (this.ShouldSkipBlock(block)) {
        this.ExecuteBlock(this.GetNext(block));
        return;
    }

    this.Execute(block);

    if (this.Error) return;

    if (this.NextAfterLoop) {
        const next = this.NextAfterLoop;
        this.NextAfterLoop = null;
        this.ExecuteBlock(next);
        return;
    }

    this.ExecuteBlock(this.GetNext(block));
}

    ShouldSkipBlock(block) {
        if (!block) return false;
        
        const type = block.dataset.type;
        
        if (this.SkipToElse) {
            if (type === 'else') {
                this.SkipToElse = false;
                return false; 
            }
            if (type === 'endif') {
                this.SkipToElse = false;
                this.SkipToEndIf = false;
                return true; 
            }
            return true; 
        }
        
        if (this.SkipToEndIf) {
            if (type === 'endif') {
                this.SkipToEndIf = false;
                return true; 
            }
            return true;
        }
        
        if (this.SkipToEndElse) {
            if (type === 'endelse') {
                this.SkipToEndElse = false;
                return true;
            }
            return true;
        }
        if (type === "function") {
            this.SkipToEndFunction = true;
            return true;
        }

        if (this.SkipToEndFunction) {
             if (type === "endfunction") {
                this.SkipToEndFunction = false;
            }
    return true;
}
        
        return false;
    }

    ShowSuccessOutput() {
        const output = document.getElementById('output');
        
        if (this.Output.length === 0) {
            output.innerHTML = `
                <strong>✅ Выполнено успешно!</strong><br><br>
                <span>Вывод отсутствует</span>`;
            return;
        }

        const formattedOutput = this.Output.map(value => {
            if (value === undefined) return '<span>undefined</span>';
            if (value === null) return '<span>null</span>';
            if (typeof value === 'string') return `<span>"${this.FormatString(value)}"</span>`;
            if (typeof value === 'number') return `<span>${value}</span>`;
            if (typeof value === 'boolean') return `<span>${value}</span>`;
            if (Array.isArray(value)) return `<span>${this.FormatArray(value)}</span>`;
            return this.FormatString(String(value));
        }).join('<br>');

        output.innerHTML = `
            <strong>✅ Выполнено успешно!</strong><br><br>
            <div>
                <strong>📤 Вывод:</strong><br>
                <div>
                    ${formattedOutput}
                </div>
            </div>
        `;
    }

    ShowError(message) {
        const output = document.getElementById('output');
        output.innerHTML = `
            <strong>❌ Ошибка выполнения!</strong><br><br>
            <div>
                ${this.FormatString(message)}
            </div>
            <div>Последние значения переменных:<br>
                ${this.FormatVariablesForError()}
            </div>
        `;
    }

    FormatVariablesForError() {
        try {
            let result = [];
            const vars = Object.entries(this.Variables)
                .map(([name, value]) => {
                    let valueStr;
                    if (typeof value === 'string') valueStr = `"${value}"`;
                    else valueStr = String(value);
                    return `<code>${name} = ${valueStr}</code>`;
                });
            
            result = result.concat(vars);    

            const arrays = Object.entries(this.Arrays)
                .map(([name, array]) => {
                    return `<code>${name} = [${array.join(', ')}]</code>`;
                });
            

            result = result.concat(arrays);

            return result.join(', ') || '<code>Нет переменных</code>';
        } catch {
            return '<code>Не удалось отобразить переменные</code>';
        }
    }

    FormatString(text) {
        const div = document.createElement('div');
        div.innerHTML = text;
        return div.innerHTML;
    }

    FormatArray(arr) {
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

    FindRoot(blocks) {
        return Array.from(blocks).find(block => !block.dataset.parent || block.dataset.parent === "");
    }

    GetNext(block) {
        if (!block) return null;
        
        if (block.dataset.right) {
            const right = document.getElementById(block.dataset.right);
            if (right) return right;
        }
        
        if (block.dataset.child) {
            const child = document.getElementById(block.dataset.child);
            if (child) return child;
        }
        
        let current = block;
        while (current.dataset.parent) {
            const parent = document.getElementById(current.dataset.parent);
            if (parent && parent.dataset.right) {
                const right = document.getElementById(parent.dataset.right);
                if (right) return right;
            }
            current = parent;
        }
        
        return null;
    }

    EvaluatePrintValue(input) {
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

        if (this.Variables.hasOwnProperty(input)) {
            return this.Variables[input];
        }

        const arrayMatch = input.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\[([^\]]+)\]$/);
        if (arrayMatch) {
            const arrayName = arrayMatch[1];
            const indexExpr = arrayMatch[2];
            const index = this.EvaluateExpression(indexExpr);
            
            if (this.Arrays.hasOwnProperty(arrayName)) {
                if (index >= 0 && index < this.Arrays[arrayName].length) {
                    return this.Arrays[arrayName][index];
                } else {
                    this.Error = `Индекс ${index} вне границ массива ${arrayName}`;
                    return;
                }
            }
        }
        
        try {
            return this.EvaluateExpression(input);
        } catch {
            return input;
        }
    }

    Execute(block) {
        try{
            const type = block.dataset.type;
            const name_input = block.querySelector('.var-name');
            const value_input = block.querySelector('.var-value');
            const name = name_input ? name_input.value.trim() : '';

            if (type === 'print') {
                if (name) {
                    const value = this.EvaluatePrintValue(name);
                    this.Output.push(value);
                } else {
                    this.Output.push('');
                }
                return;
            }

            switch(type) {
                case 'declare':
                    this.ExecuteDeclare(name, value_input);
                    break;
                case 'set':
                    this.ExecuteSet(name, value_input)
                    break;

                case 'array':
                    this.ExecuteArrayDeclaration(block);
                    break;
                case 'index-declare':
                    this.ExecuteArraySet(block);
                    break;
                case 'index-take':
                    this.ExecuteArrayGet(block);
                    break;

                case 'if':
                    this.ExecuteIf(block);
                    break;

                case 'endif':
                case 'else':
                case 'endelse':
                    break;

                case 'while':
                    this.ExecuteWhile(block);
                    break;

                case 'endwhile':
                    this.LoopStack.pop();
                    break;

                case 'plus':
                case 'minus':
                case 'prod':
                case 'division':
                case 'remains':
                    this.ExecuteArithmetic(block, type);
                    break;
                case 'call':
                    this.ExecuteCall(block);
                    break;
            }
        }
        catch(error){
            this.Error = `Ошибка в блоке ${block.dataset.type}: ${error.message}`;
        }
    }

    ExecuteSet(name, value_input)
    {
        if (!name) {
            this.Error = 'Имя переменной не указано';
            return;
        }

        if (!this.Variables.hasOwnProperty(name)){
            this.Error = `Переменная ${name} не объявлена`;
            return;
        }

        const expression = value_input ? value_input.value.trim() : '';
            
        if (expression) 
        {
            const value = this.EvaluateExpression(expression);
            this.Variables[name] = value;
        } 
        else 
        {
            this.Error = `Недопустимое значение для переменной ${name}`;
        }
    }

    ExecuteDeclare(name, value_input)
    {
        if (!name) {
            this.Error = 'Имя переменной не указано';
            return;
        } 
        
        if (this.Variables.hasOwnProperty(name)){
            this.Error = `Переменная "${name}" уже объявлена. Используйте блок "Установить" для изменения значения`;
            return;
        }

        const expression = value_input ? value_input.value.trim() : '';
        
        if (expression) 
        {
            const value = this.EvaluateExpression(expression);
            this.Variables[name] = value;
        } 
        else 
        {
            this.Variables[name] = 0;
        }
    }

    ExecuteArrayDeclaration(block) {
        const nameInput = block.querySelector('.name');
        const sizeInput = block.querySelector('.size');
        
        if (nameInput && sizeInput) {
            const name = nameInput.value.trim();
            const sizeFiltered = sizeInput.value.trim();
            
            if (name && sizeFiltered) {
                const size = this.EvaluateExpression(sizeFiltered);
                if (typeof size === 'number' && size > 0 && Number.isInteger(size)) {
                    this.Arrays[name] = new Array(size).fill(0);
                } else {
                    this.Error = `Некорректный размер массива: ${sizeFiltered}`;
                    return;
                }
            }
        }
    }

    ExecuteArraySet(block) {
        const nameInput = block.querySelector('.name');
        const indexInput = block.querySelector('.index');
        const valueInput = block.querySelector('.value');
        
        if (nameInput && indexInput && valueInput) {
            const name = nameInput.value.trim();
            const indexFiltered = indexInput.value.trim();
            const valueFiltered = valueInput.value.trim();
            
            if (name && indexFiltered && valueFiltered) {
                if (!this.Arrays.hasOwnProperty(name)) {
                    this.Error = `Массив ${name} не объявлен`;
                }
                
                const index = this.EvaluateExpression(indexFiltered);
                const value = this.EvaluateExpression(valueFiltered);
                
                if (typeof index !== 'number' || !Number.isInteger(index) || index < 0) {
                    this.Error = `Индекс должен быть неотрицательным целым числом: ${indexFiltered}`;
                }
                
                if (index >= this.Arrays[name].length) {
                    this.Error = `Индекс ${index} вне границ массива ${name} [0 - ${this.Arrays[name].length - 1}]`;
                }
                
                this.Arrays[name][index] = value;
            }
        }
    }

    ExecuteArrayGet(block)
    {
        const varName = block.querySelector(".name");
        const arrName = block.querySelector(".value");
        const arrIndex = block.querySelector(".index");

        if (varName && arrName && arrIndex)
        {
            const varNameFiltered = varName.value.trim();
            const arrNameFiltered = arrName.value.trim();
            const arrIndexFiltered = arrIndex.value.trim();

            if (varNameFiltered && arrNameFiltered && arrIndexFiltered)
            {
                if (!this.Variables.hasOwnProperty(varNameFiltered)){
                    this.Error = `Переменная ${varNameFiltered} не объявлена`;
                    return;
                }

                if (!this.Arrays.hasOwnProperty(arrNameFiltered)){
                    this.Error = `Массив ${arrNameFiltered} не объявлен`;
                    return;
                }

                const index = this.EvaluateExpression(arrIndexFiltered);

                if (typeof index !== "number" || !Number.isInteger(index) || index < 0){
                    this.Error = `Индекс должен быть неотрицательным целым числом: ${index}`;
                    return;
                }

                if (index >= this.Arrays[arrNameFiltered].length) {
                    this.Error = `Индекс ${index} вне границ массива ${arrNameFiltered} 
                                [0 - ${this.Arrays[arrNameFiltered].length - 1}]`;
                    return;
                }

                this.Variables[varNameFiltered] = this.Arrays[arrNameFiltered][index];
            }
        }
    }

    ExecuteIf(block) {
        try {
            const expressionInput = block.querySelector('.if-expression');
            const expression = expressionInput ? expressionInput.value.trim() : "";

            const result = this.EvaluateLogicalExpression(expression);

            if (!result) {
                let next = this.GetNext(block);
                while (next) {
                    if (next.dataset.type === 'else') {
                        this.SkipToElse = true;
                        this.SkipToEndIf = false;
                        this.SkipToEndElse = false;
                        break;
                    }
                    if (next.dataset.type === 'endif') {
                        this.SkipToEndIf = true;
                        this.SkipToElse = false;
                        this.SkipToEndElse = false;
                        break;
                    }
                    next = this.GetNext(next);
                }
            }
        } 
        catch(error) {
            this.Error = `Ошибка в условии if: ${error.message}`;
        }
    }

    ExecuteWhile(block) {
    try {
        const expressionInput = block.querySelector('.while-expression');
        const expression = expressionInput ? expressionInput.value.trim() : "";

        const endWhile = this.FindMatchingEndWhile(block);
        if (!endWhile) {
            this.Error = "Не найден endwhile для цикла";
            return;
        }

        const firstChild = block.dataset.child
            ? document.getElementById(block.dataset.child)
            : null;

        if (!firstChild) {
            this.Error = "Тело цикла пусто";
            return;
        }

        let iterations = 0;

        while (!this.Error && this.EvaluateLogicalExpression(expression)) {

            iterations++;

            if (iterations > this.MaxIterations) {
                this.Error = "Превышено максимальное количество итераций";
                break;
            }

            this.ExecuteBlockRange(firstChild, endWhile);
        }

        this.NextAfterLoop = this.GetNext(endWhile);

    } catch (error) {
        this.Error = `Ошибка в цикле while: ${error.message}`;
    }
}

    FindMatchingEndWhile(startBlock) {
        let current = this.GetNext(startBlock);
        let depth = 1;
        let safetyCounter = 0;
        const maxBlocks = 10000;
        
        while (current && safetyCounter < maxBlocks) {
            safetyCounter++;
            
            if (current.dataset.type === 'while') {
                depth++;
            } else if (current.dataset.type === 'endwhile') {
                depth--;
                if (depth === 0) {
                    return current;
                }
            }
            current = this.GetNext(current);
        }
        
        return null;
    }

    ExecuteBlockRange(startBlock, endBlock) {
        let current = startBlock;
        let safetyCounter = 0;
        const maxBlocks = 10000;
        
        while (current && current !== endBlock && 
            !this.Error && safetyCounter < maxBlocks) 
        {
            safetyCounter++;
            
            const nextBlock = this.GetNext(current);
            
            if (!this.ShouldSkipBlock(current)) {
                this.Execute(current);
            }
            
            if (this.Error) break;
            
            current = nextBlock;
        }
        
        if (safetyCounter >= maxBlocks) {
            this.Error = "Превышена максимальная длина последовательности блоков";
        }
    }

    ResolveValue(input) {
        if (!input) return '';
        if (!isNaN(input)) return parseFloat(input);
        if (this.Variables.hasOwnProperty(input)) return this.Variables[input];
        
        try {
            return this.EvaluateExpression(input);
        } 
        catch {
            return 0;
        }   
    }

    EvaluateExpression(expression) {
        if (!expression) return '';

        if (expression.startsWith('"') && expression.endsWith('"')) {
            return expression.slice(1, -1);
        }
        
        if (expression.startsWith("'") && expression.endsWith("'")) {
            return expression.slice(1, -1);
        }

        if (!isNaN(expression)) return parseFloat(expression);

        if (expression === "true") return true;
        if (expression === "false") return false;
        if (expression === "null") return null;
        if (expression === "undefined") return undefined;

        try {
            expression = expression.replace(/([a-zA-Z_][a-zA-Z0-9_]*)\[([^\]]+)\]/g, 
                (match, arrayName, indexExpr) => {
                if (this.Arrays.hasOwnProperty(arrayName)) {
                    const index = this.EvaluateExpression(indexExpr);

                    if (index >= 0 && index < this.Arrays[arrayName].length) {
                        const value = this.Arrays[arrayName][index];

                        if (typeof value === 'string') {
                            return `"${value}"`;
                        }
                        return value;
                    }
                    else {
                        this.Error = `Индекс ${index} вне границ массива ${arrayName}`;
                        return;
                    }
                } 
                else {
                    this.Error = `Массив ${arrayName} не объявлен`;
                }
            });
            
            expression = expression.replace(/[a-zA-Z_][a-zA-Z0-9_]*/g, (name) => {
                if (this.Variables.hasOwnProperty(name)) {
                    if (typeof this.Variables[name] === 'string') {
                        return `"${this.Variables[name]}"`;
                    }

                    return this.Variables[name];
                }

                return name;
            });
            
            if (expression.trim() === '') return '';
            
            try {
                return Function('"use strict"; return (' + expression + ')')();
            } 
            catch (evalError) {
                console.error("Ошибка вычисления выражения:", expression, evalError);
                return expression;
            }
        } 
        catch (error) {
            console.error("Ошибка в вычислении выражения", expression, error);
            return 0;
        }
    }

    EvaluateLogicalExpression(expression) 
    {
        if (!expression) return false;

        try 
        {
            let expr = expression
                .replace(/\bAND\b/gi, "&&")
                .replace(/\bOR\b/gi, "||")
                .replace(/\bNOT\b/gi, "!")
                .replace(/(?<![=!<>])=(?![=])/g, "==");


            const evaluateArithmetic = (str) => {
                return str.replace(/([a-zA-Z_][a-zA-Z0-9_]*)\s*([\+\-\*\/])\s*([a-zA-Z0-9_]+)/g, 
                    (match, left, op, right) => {
                        const leftVal = this.ResolveValue(left);
                        const rightVal = this.ResolveValue(right);
                        
                        switch(op) {
                            case '+': return leftVal + rightVal;
                            case '-': return leftVal - rightVal;
                            case '*': return leftVal * rightVal;
                            case '/': return rightVal !== 0 ? leftVal / rightVal : 0;
                            default: return match;
                        }
                    });
            };

            expr = expr.replace(/([a-zA-Z_][a-zA-Z0-9_]*)\[([^\]]+)\]/g, 
                (match, arrayName, indexExpr) => {
                if (this.Arrays.hasOwnProperty(arrayName)) {
                    const index = this.EvaluateExpression(indexExpr);
                    if (index >= 0 && index < this.Arrays[arrayName].length) {
                        return JSON.stringify(this.Arrays[arrayName][index]);
                    }
                    else {
                        this.Error = `Индекс ${index} вне границ массива ${arrayName}`;
                        return '0';
                    }
                } 
                else {
                    this.Error = `Массив ${arrayName} не объявлен`;
                    return '0'; 
                }
            });

            expr = expr.replace(/\(([^\(\)]+)\)/g, (match, inner) => {
                return evaluateArithmetic(inner);
            });

            expr = evaluateArithmetic(expr);    

            expr = expr.replace(/[a-zA-Z_][a-zA-Z0-9_]*/g, (name) => 
            {
                if (this.Variables.hasOwnProperty(name)) 
                {
                    return JSON.stringify(this.Variables[name]);
                }
                return name;
            });

            try {
                return Function('"use strict"; return (' + expr + ')')();
            } 
            catch (evalError) {
                this.Error = "Ошибка вычисления выражения:", expr, evalError;
                return false;
            }
        } 
        catch 
        {
            this.Error = "Ошибка в выражении:", expression;
            return false;
        }
    }

    ExecuteArithmetic(block, type) {
        const inputs = block.querySelectorAll('input');
        const leftInput = inputs[0].value.trim();
        const rightInput = inputs[1].value.trim();

        const left = this.ResolveValue(leftInput);
        const right = this.ResolveValue(rightInput);

        let result = 0;
        switch(type) {
            case 'plus': result = left + right; break;
            case 'minus': result = left - right; break;
            case 'prod': result = left * right; break;
            case 'division': 
                if (right === 0) return;
                result = left / right;
                break;
            case 'remains':
                if (right === 0) return;
                result = left % right;
                break;
        }

        this.LastValue = result;

        if (leftInput && this.Variables.hasOwnProperty(leftInput)) {
            this.Variables[leftInput] = result;
        }
    }
    ScanFunctions() {

    const blocks = document.querySelectorAll('#WorkspaceArea .block');

    blocks.forEach(block => {

        if (block.dataset.type === "function") {

            const nameInput = block.querySelector(".func-name");

            if (!nameInput) return;

            const name = nameInput.value.trim();

            if (!name) return;

            const end = this.FindMatchingEndFunction(block);

            if (!end) {
                this.Error = `Функция ${name} не имеет endfunction`;
                return;
            }

            this.Functions[name] = {
                start: block,
                end: end
            };
        }

    });
}
FindMatchingEndFunction(startBlock) {

    let current = this.GetNext(startBlock);

    while (current) {

        if (current.dataset.type === "endfunction") {
            return current;
        }

        current = this.GetNext(current);
    }

    return null;
}
ExecuteCall(block) {

    const input = block.querySelector(".func-name");

    if (!input) return;

    const name = input.value.trim();

    if (!this.Functions[name]) {
        this.Error = `Функция ${name} не объявлена`;
        return;
    }

    const func = this.Functions[name];

    const first = func.start.dataset.child
        ? document.getElementById(func.start.dataset.child)
        : null;

    if (!first) return;

    this.ExecuteBlockRange(first, func.end);
}
}

const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".panel");

tabs.forEach(tab => 
{
    tab.addEventListener("click", () =>
    {
        tabs.forEach(t => t.classList.remove("active"));
        panels.forEach(p => p.classList.remove("active"));

        tab.classList.add("active");
        document.getElementById(tab.dataset.panel).classList.add("active");
    });
});