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
        const blocks = document.querySelectorAll('.block');

        blocks.forEach(block => 
        {
            block.dataset.parent = "";
            block.dataset.child = "";
            
            block.addEventListener('mousedown', this.OnMouseDown.bind(this));
        });
    }

    OnMouseDown(event) 
    {
        const block = event.target.closest('.block');
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
        const blocks = Array.from(this.WorkspaceArea.querySelectorAll('.block')).filter(b => b !== block);

        const rectangle1 = block.getBoundingClientRect();
        const workspace_rectangle = this.WorkspaceArea.getBoundingClientRect();

        let closest = null;
        let min_dist = this.SnapDistance;

        for (let other of blocks)
        {
            if (other.dataset.child) continue;

            const rectangle2 = other.getBoundingClientRect();

            const vertical = Math.abs(rectangle1.top - rectangle2.bottom);

            const horizontal = Math.abs(rectangle1.left - rectangle2.left);

            if (vertical < min_dist && horizontal < 60)
            {
                closest = other;
                min_dist = vertical;
            }
        }

        if (closest)
        {
            const rectangle2 = closest.getBoundingClientRect();

            block.style.left = (rectangle2.left - workspace_rectangle.left) + 'px';
            block.style.top = (rectangle2.bottom - workspace_rectangle.top) + 'px';

            block.dataset.parent = closest.id;
            closest.dataset.child = block.id;
        }
    }


    DetachBlock(block) 
    {
        const parent_id = block.dataset.parent;
        if (parent_id) {
            const parent = document.getElementById(parent_id);
            if (parent)
            {
                parent.dataset.child = "";
            }

            block.dataset.parent = "";
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

    CheckHint() {
                const hint = this.WorkspaceArea.querySelector('.unselectable');
                if (hint) {
                    hint.style.display = this.WorkspaceArea.querySelectorAll('.block').length === 0 ? 'block' : 'none';
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
        const blocks = workspace.querySelectorAll('.block');
        
        blocks.forEach(block => 
        {
            const child_id = block.dataset.child;
            if (child_id) 
            {
                const child = document.getElementById(child_id);
                if (child) child.dataset.parent = "";
            }
            
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

class BlockInterpreter 
{
    constructor() 
    {
        this.Variables = {};
        this.Output = [];
    }

    Run() 
    {
        const root = this.FindRoot();
        if (!root) 
        {
            document.getElementById('output').innerHTML = '❌ Добавь блоки в рабочую область!';
            return;
        }

        this.Variables = {};
        this.Output = [];
        
        let current = root;
        while (current) 
        {
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

    FindRoot() 
    {
        const blocks = document.querySelectorAll('#WorkspaceArea .block');
        return Array.from(blocks).find(block => !block.dataset.parent);
    }

    GetNext(block) 
    {
        const child_id = block.dataset.child;
        return child_id ? document.getElementById(child_id) : null;
    }

    Execute(block) 
    {
        const type = block.dataset.type;
        const name_input = block.querySelector('.var-name');
        const value_input = block.querySelector('.var-value');
        const name = name_input ? name_input.value.trim() : '';

        switch(type) 
        {
            case 'declare':
                if (name) 
                {
                    const value = value_input ? parseFloat(value_input.value) || 0 : 0;
                    this.Variables[name] = value;
                    console.log(`📥 Объявлена ${name} = ${value}`);
                }
                break;
                
            case 'set':
                if (name) 
                {
                    const value = value_input ? parseFloat(value_input.value) || 0 : 0;
                    this.Variables[name] = value;
                    console.log(`🔄 Установлено ${name} = ${value}`);
                }
                break;
                
            case 'print':
                if (name) 
                {
                    const value = this.Variables[name];
                    this.Output.push(value !== undefined ? value : 'undefined');
                    console.log(`📤 Вывод: ${name} = ${value}`);
                }
                break;
            
            case 'save':
                if (name)
                {
                    if (this.LastValue !== undefined)
                    {
                        this.Variables[name] = this.LastValue;
                    }
                }
                break;

            case 'plus':
                this.ExecuteArithmetic(block, type);
                break;

            case 'minus':
                this.ExecuteArithmetic(block, type);
                break;

            case 'prod':
                this.ExecuteArithmetic(block, type);
                break;

            case 'division':
                this.ExecuteArithmetic(block, type);
                break;

            case 'remains':
                this.ExecuteArithmetic(block, type);
                break;
        }
    }

    ResolveValue(input)
    {
        if (input === '') 
            return 0;

        if (!isNaN(input))
            return parseFloat(input);

        if (this.Variables.hasOwnProperty(input))
            return this.Variables[input];

        return 0;
    }

    ExecuteArithmetic(block, type)
    {
        const inputs = block.querySelectorAll('input');

        const left = this.ResolveValue(inputs[0].value.trim());
        const right = this.ResolveValue(inputs[1].value.trim());

        let result = 0;

        switch(type)
        {
            case 'plus':
                result = left + right;
                break;
            
            case 'minus':
                result = left - right;
                break;

            case 'prod':
                result = left * right;
                break;
            
            case 'division':
                result = right !== 0 ? left / right : 'Ошибка!!! Деление на ноль запрещено.';
                break;

            case 'remains':
                result = right !== 0 ? left % right : 'Ошибка!!! Деление на ноль запрещено.';
                break;
        }

        this.LastValue = result;
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