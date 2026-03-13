export class WorkspaceManager {
    constructor(workspaceArea, paddingBuffer = 100, defaultSize = 400) {
        this.workspaceArea = workspaceArea;
        this.paddingBuffer = paddingBuffer;
        this.defaultSize = defaultSize;
    }

    expandIfNeeded(x, y, block) {
        if (!block) return;

        const blockHeight = block.offsetHeight;
        const blockBottom = y + blockHeight + this.paddingBuffer;
        const currentHeight = parseInt(this.workspaceArea.style.minHeight) || this.workspaceArea.clientHeight;

        if (blockBottom > currentHeight) {
            this.workspaceArea.style.minHeight = blockBottom + 'px';
        }
    }

    shrinkIfNeeded() {
        const blocks = this.workspaceArea.querySelectorAll('.block, .block-bracket');

        if (blocks.length === 0) {
            this.workspaceArea.style.minHeight = this.defaultSize + 'px';
            return;
        }

        let maxY = 0;
        blocks.forEach(block => {
            const top = parseInt(block.style.top) || 0;
            const height = block.offsetHeight;
            maxY = Math.max(maxY, top + height);
        });

        const targetHeight = Math.max(maxY + this.paddingBuffer, this.defaultSize);
        const currentHeight = parseInt(this.workspaceArea.style.minHeight) || this.workspaceArea.clientHeight;

        if (targetHeight < currentHeight) {
            this.workspaceArea.style.minHeight = targetHeight + 'px';
        }
    }

    checkHint() {
        const hint = this.workspaceArea.querySelector('.unselectable');
        if (hint) {
            hint.style.display = this.workspaceArea.querySelectorAll('.block, .block-bracket').length === 0 
                ? 'block' 
                : 'none';
        }
    }

    clearWorkspace() {
        const blocks = this.workspaceArea.querySelectorAll('.block, .block-bracket');
        
        blocks.forEach(block => {
            const childId = block.dataset.child;
            if (childId) {
                const child = document.getElementById(childId);
                if (child) child.dataset.parent = "";
            }
            block.dataset.child = "";
            block.remove();
        });

        this.shrinkIfNeeded();
        this.checkHint();
    }
}