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
        

        this.SnapDistance = 40;

        this.WorkspaceArea = document.getElementById('WorkspaceArea');
        this.BlocksContainer = document.getElementById('BlocksContainer');

        this.Init();
    }

    Init() 
    {
        this.MakeBlocksDraggable();
        this.AddDocumentListeners();
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

            this.DraggingNowElement = block;

            this.DraggingNowElement.style.left = (rectangle.left - workspace_rectangle.left) + 'px';
            this.DraggingNowElement.style.top = (rectangle.top - workspace_rectangle.top) + 'px';

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

            this.DraggingNowElement.style.left = (x - workspace_rectangle.left - this.OffsetX) + 'px';

            this.DraggingNowElement.style.top = (y - workspace_rectangle.top - this.OffsetY) + 'px';
        }
    }

    OnMouseUp(event) 
    {
        if (!this.IsDragging) 
            return;  

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
            (rect2.right - workspaceRect.left) + 'px';

        block.style.top =
            (rect2.top - workspaceRect.top) + 'px';

        block.dataset.left = closest.id;
        closest.dataset.right = block.id;
    }

    if (snapType === "vertical")
    {
        block.style.left =
            (rect2.left - workspaceRect.left) + 'px';

        block.style.top =
            (rect2.bottom - workspaceRect.top) + 'px';

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

        this.DraggingNowElement.style.left =
            (event.clientX - workspace_rectangle.left - this.OffsetX) + 'px';

        this.DraggingNowElement.style.top =
            (event.clientY - workspace_rectangle.top - this.OffsetY) + 'px';

        this.DraggingNowElement.classList.remove('dragging');
        this.CheckHint();
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
        
        document.getElementById('output').innerHTML = '🧹 Рабочая область очищена!';
    }
}

class BlockInterpreter {
    constructor() {
        this.Variables = {};
        this.Output = [];
        this.LastValue = undefined;
        this.SkipToEndIf = false;
        this.SkipToElse = false;
        this.SkipToEndElse = false;
    }

    Run() {
        this.LastValue = undefined; 
        this.Variables = {};
        this.Output = [];
        this.SkipToElse = false;
        this.SkipToEndElse = false;

        const root = this.FindRoot();
        if (!root) {
            document.getElementById('output').innerHTML = '❌ Добавь блоки в рабочую область!';
            return;
        }

        let current = root;
        while (current) {
            if (this.SkipToElse) {
                if (current.dataset.type === 'else') {
                    this.SkipToElse = false;
                    this.SkipToEndIf = false;
                }
                else if (current.dataset.type === 'endif') {
                    this.SkipToElse = false;
                    this.SkipToEndIf = false;
                }

                current = this.GetNext(current);
                continue;
            }

            if (this.SkipToEndElse) {
                if (current.dataset.type === 'endelse') {
                    this.SkipToEndElse = false;
                }
                current = this.GetNext(current);
                continue;
            }

            if (current.dataset.type === 'while') {
                current = this.ExecuteWhile(current);
                continue;
            }

            this.Execute(current);
            current = this.GetNext(current);
        }

        const output = document.getElementById('output');
        output.innerHTML = `
            <strong>Выполнено успешно!</strong><br><br>
            📤 <strong>Вывод:</strong><br>
            ${this.Output.length ? this.Output.map(v => `<code>${v}</code>`).join(' → ') : 'нет вывода'}
        `;
    }

    FindRoot() {
        const blocks = document.querySelectorAll('#WorkspaceArea .block, #WorkspaceArea .block-bracket');
        return Array.from(blocks).find(block => !block.dataset.parent || block.dataset.parent === "");
    }

    GetNext(block) {
        if (block.dataset.right)
            return document.getElementById(block.dataset.right);
        if (block.dataset.child)
            return document.getElementById(block.dataset.child);
        return null;
    }

    Execute(block) {
        const type = block.dataset.type;
        const name_input = block.querySelector('.var-name');
        const value_input = block.querySelector('.var-value');
        const name = name_input ? name_input.value.trim() : '';

        switch(type) {
            case 'declare':
            case 'set':
                if (name) {
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
                break;

            case 'print':
                if (name) {
                    const value = this.Variables[name];
                    this.Output.push(value !== undefined ? value : 'undefined');
                }
                break;

            case 'save':
                if (name && this.LastValue !== undefined) {
                    this.Variables[name] = this.LastValue;
                }
                break;

            case 'if':
                this.ExecuteIf(block);
                break;
            case 'endif':
                break;
            case 'else':
                this.SkipToEndElse = true;
                break;
            case 'endelse':
                break;

            case 'plus':
            case 'minus':
            case 'prod':
            case 'division':
            case 'remains':
                this.ExecuteArithmetic(block, type);
                break;
        }
    }

    EvaluateExpression(expression) {
        if (!expression) return 0;
        
        if (!isNaN(expression)) return parseFloat(expression);
        
        try {
            const tokens = expression.match(/(\d+\.?\d*|[a-zA-Z_][a-zA-Z0-9_]*|[+\-*/()]|%|\^)/g) || [];
            
            const evaluatedTokens = tokens.map(token => {
                if (this.Variables.hasOwnProperty(token)) {
                    return this.Variables[token];
                }
                return token;
            });
            
            const expr = evaluatedTokens.join('');
            
            return Function('"use strict"; return (' + expr + ')')();
        } catch (e) {
            console.error("Ошибка вычисления выражения:", expression, e);
            return 0;
        }
    }

    ExecuteIf(block) {
        const expressionInput = block.querySelector('.if-expression');
        const expression = expressionInput ? expressionInput.value.trim() : "";

        const result = this.EvaluateLogicalExpression(expression);

        if (!result) {
            this.SkipToElse = true;
            this.SkipToEndIf = true;
        }
    } 

    ResolveValue(input) {
        if (input === '') return 0;
        if (!isNaN(input)) return parseFloat(input);
        if (this.Variables.hasOwnProperty(input)) return this.Variables[input];
        
        try {
            return this.EvaluateExpression(input);
        } 
        catch {
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

            expr = expr.replace(/[a-zA-Z_][a-zA-Z0-9_]*/g, (name) => 
            {
                if (this.Variables.hasOwnProperty(name)) 
                {
                    return JSON.stringify(this.Variables[name]);
                }
                return name;
            });

            return Function('"use strict"; return (' + expr + ')')();
        } 
        catch 
        {
            console.error("Ошибка в выражении:", expression);
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

    ExecuteWhile(block) {
        const startBlock = block;
        const endBlock = this.FindEndWhile(startBlock);
        if (!endBlock) return this.GetNext(block); 

        while (this.EvaluateWhileCondition(startBlock)) {
            let current = startBlock.dataset.child ? document.getElementById(startBlock.dataset.child) : this.GetNext(startBlock);
            while (current && current !== endBlock) {
                this.Execute(current);
                current = this.GetNext(current);
            }
        }

        return this.GetNext(endBlock); 
    }

    FindEndWhile(startBlock) {
        let current = this.GetNext(startBlock);
        while (current) {
            if (current.dataset.type === 'endwhile') return current;
            current = this.GetNext(current);
        }
        return null;
    }

    EvaluateWhileCondition(block) {
        const expressionInput = block.querySelector('.while-expression');
        const expression = expressionInput ? expressionInput.value.trim() : "";

        return this.EvaluateLogicalExpression(expression);
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