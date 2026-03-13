export class WorkspaceManager {
    constructor(workspaceArea, paddingBuffer = 100, defaultSize = 400) {
        ({
            workspaceArea: this.workspaceArea,
            paddingBuffer: this.paddingBuffer,
            defaultSize: this.defaultSize
        } = { workspaceArea, paddingBuffer, defaultSize });
    }

    expandIfNeeded(x, y, block) {
        if (!block) return;

        const blockHeight = block.offsetHeight;
        const blockBottom = y + blockHeight + this.paddingBuffer;
        const currentHeight = parseInt(this.workspaceArea.style.minHeight) || this.workspaceArea.clientHeight;

        if (blockBottom > currentHeight) {
            this.workspaceArea.style.minHeight = `${blockBottom}px`;
        }
    }

    shrinkIfNeeded() {
        const blocks = [...this.workspaceArea.querySelectorAll('.block, .block-bracket')];

        if (blocks.length === 0) {
            this.workspaceArea.style.minHeight = `${this.defaultSize}px`;
            return;
        }

        const blocksData = blocks.map(block => {
            const { top } = block.style;
            return {
                top: parseInt(top) || 0,
                height: block.offsetHeight
            };
        });

        const maxY = blocksData.reduce((max, { top, height }) => 
            Math.max(max, top + height), 0);

        const targetHeight = Math.max(maxY + this.paddingBuffer, this.defaultSize);
        const currentHeight = parseInt(this.workspaceArea.style.minHeight) || this.workspaceArea.clientHeight;

        if (targetHeight < currentHeight) {
            this.workspaceArea.style.minHeight = `${targetHeight}px`;
        }
    }

    checkHint() {
        const [hint] = this.workspaceArea.querySelectorAll('.unselectable');
        if (hint) {
            const blocks = this.workspaceArea.querySelectorAll('.block, .block-bracket');
            hint.style.display = blocks.length === 0 ? 'block' : 'none';
        }
    }

    clearWorkspace() {
        const blocks = [...this.workspaceArea.querySelectorAll('.block, .block-bracket')];
        
        blocks.forEach(block => {
            const { child: childId } = block.dataset;
            if (childId) {
                const child = document.getElementById(childId);
                if (child) {
                    child.dataset.parent = "";
                }
            }
            block.dataset.child = "";
            block.remove();
        });

        this.shrinkIfNeeded();
        this.checkHint();
    }
}