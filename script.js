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

        event.preventDefault();

        this.IsDragging = true;
        this.OriginalElement = block;

        const rectangle = block.getBoundingClientRect();

        this.OffsetX = event.clientX - rectangle.left;
        this.OffsetY = event.clientY - rectangle.top;

        if (block.parentNode === this.BlocksContainer)
        {
            this.DraggingNowElement = block.cloneNode(true);
            this.DraggingNowElement.style.position = 'fixed';

            this.DraggingNowElement.style.width = rectangle.width + 'px';
            this.DraggingNowElement.style.height = rectangle.height + 'px';
            this.DraggingNowElement.style.left = rectangle.left + 'px';
            this.DraggingNowElement.style.top = rectangle.top + 'px';

            this.DraggingNowElement.dataset.parent = "";
            this.DraggingNowElement.dataset.child = "";

            this.DraggingNowElement.style.pointerEvents = 'none';
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
        } 
        else 
        {
            if (this.OriginalElement.parentNode === this.BlocksContainer) 
            {
                this.DraggingNowElement.remove();
            }
        }

        if (this.DraggingNowElement && inside_workspace)
            this.TrySnap(this.DraggingNowElement);

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

            block.dataset.parent = closest;
            closest.dataset.child = block;
        }
    }


    DetachBlock(block) 
    {
        const parent = block.dataset.parent;
        if (parent) {
            parent.dataset.child = "";
            block.dataset.parent = "";
        }
    }

    DropInsideWorkspace(event) 
    {
        const workspace_rectangle = this.WorkspaceArea.getBoundingClientRect();

        if (this.OriginalElement.parentNode === this.BlocksContainer) 
        {
            this.DraggingNowElement.style.position = 'absolute';
            this.DraggingNowElement.style.pointerEvents = 'auto';

            this.WorkspaceArea.appendChild(this.DraggingNowElement);

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
        const hint = this.WorkspaceArea.querySelector('p');
        const blocks = this.WorkspaceArea.querySelectorAll('.block');

        if (!hint) return;

        hint.style.display = blocks.length === 0 ? 'block' : 'none';
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

document.addEventListener('DOMContentLoaded', () => 
{
    new DragAndDropManager();
});
