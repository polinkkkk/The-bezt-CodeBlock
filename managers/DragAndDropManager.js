import { DragHelpers } from '../utils/DragHelpers.js';
import { SnapHelpers } from '../utils/SnapHelpers.js';
import { BlockConnector } from './BlockConnector.js';
import { WorkspaceManager } from './WorkspaceManager.js';

export class DragAndDropManager {
    constructor() {
        this.draggingNowElement = null;
        this.originalElement = null;
        this.isDragging = false;
        this.offsetX = 0;
        this.offsetY = 0;
        this.currentX = 0;
        this.currentY = 0;
        
        this.paddingBuffer = 100;
        this.defaultWorkspaceSize = 400;

        this.workspaceArea = document.getElementById('WorkspaceArea');
        this.blocksContainer = document.getElementById('BlocksContainer');
        
        this.snapHelpers = new SnapHelpers(40);
        this.blockConnector = new BlockConnector();
        this.workspaceManager = new WorkspaceManager(this.workspaceArea, this.paddingBuffer, this.defaultWorkspaceSize);
        
        this.init();
    }

    init() {
        this.makeBlocksDraggable();
        this.addDocumentListeners();
        this.workspaceArea.addEventListener('scroll', this.onScroll.bind(this));
    }

    makeBlocksDraggable() {
        const blocks = document.querySelectorAll('.block, .block-bracket');
        blocks.forEach(block => {
            this.blockConnector.clearConnections(block);
            block.addEventListener('mousedown', this.onMouseDown.bind(this));
        });
    }

    onMouseDown(event) {
        if (this.isDragging) return;

        const block = event.target.closest('.block, .block-bracket');
        if (!block) return;

        const isInput = event.target.matches('input, select, button');
        if (isInput) return;

        event.preventDefault();
        event.stopPropagation();

        this.isDragging = true;
        this.originalElement = block;

        const rect = block.getBoundingClientRect();
        this.offsetX = event.clientX - rect.left;
        this.offsetY = event.clientY - rect.top;

        if (!this.workspaceArea.contains(block)) {
            this.draggingNowElement = DragHelpers.cloneBlock(block);
            document.body.appendChild(this.draggingNowElement);
            this.draggingNowElement.addEventListener('mousedown', this.onMouseDown.bind(this));
        } else {
            this.blockConnector.detachBlock(block);
            
            const workspaceRect = this.workspaceArea.getBoundingClientRect();
            this.draggingNowElement = block;
            this.draggingNowElement.style.left = (rect.left - workspaceRect.left + this.workspaceArea.scrollLeft) + 'px';
            this.draggingNowElement.style.top = (rect.top - workspaceRect.top + this.workspaceArea.scrollTop) + 'px';
            this.draggingNowElement.style.position = 'absolute';
        }

        this.draggingNowElement.classList.add('dragging');
        this.moveAt(event.clientX, event.clientY);
    }

    onMouseMove(event) {
        if (!this.isDragging) return;

        this.currentX = event.clientX;
        this.currentY = event.clientY;

        requestAnimationFrame(() => {
            this.moveAt(this.currentX, this.currentY);
        });
    }

    moveAt(x, y) {
        if (!this.draggingNowElement) return;

        const isFixed = this.draggingNowElement.style.position === 'fixed';
        const pos = DragHelpers.calculatePosition(
            this.draggingNowElement, x, y, this.offsetX, this.offsetY, 
            this.workspaceArea, isFixed
        );

        this.draggingNowElement.style.left = pos.left + 'px';
        this.draggingNowElement.style.top = pos.top + 'px';
    }

    onMouseUp(event) {
        if (!this.isDragging) return;

        if (this.draggingNowElement) {
            this.draggingNowElement.classList.remove('dragging');
        }

        const workspaceRect = this.workspaceArea.getBoundingClientRect();
        const insideWorkspace = DragHelpers.isInsideWorkspace(event.clientX, event.clientY, workspaceRect);

        if (insideWorkspace) {
            this.dropInsideWorkspace(event);
            this.trySnap(this.draggingNowElement);
        } else if (this.draggingNowElement) {
            this.draggingNowElement.remove();
        }

        this.workspaceManager.checkHint();
        this.cleanUp();
    }

    trySnap(block) {
        const blocks = Array.from(this.workspaceArea.querySelectorAll('.block, .block-bracket'))
            .filter(b => b !== block);

        const snapResult = this.snapHelpers.findClosestBlock(block, blocks, this.workspaceArea);
        
        if (snapResult) {
            const pos = this.snapHelpers.calculateSnapPosition(
                block, snapResult.block, snapResult.type, this.workspaceArea
            );

            block.style.left = pos.left + 'px';
            block.style.top = pos.top + 'px';

            this.blockConnector.connectBlocks(snapResult.block, block, snapResult.type);
        }
    }

    dropInsideWorkspace(event) {
        const workspaceRect = this.workspaceArea.getBoundingClientRect();
        const scrollLeft = this.workspaceArea.scrollLeft;
        const scrollTop = this.workspaceArea.scrollTop;

        const newTop = event.clientY - workspaceRect.top - this.offsetY + scrollTop;
        const newLeft = event.clientX - workspaceRect.left - this.offsetX + scrollLeft;

        if (!this.workspaceArea.contains(this.originalElement)) {
            this.draggingNowElement.style.position = 'absolute';
            this.draggingNowElement.style.pointerEvents = 'auto';
            this.workspaceArea.appendChild(this.draggingNowElement);

            if (!this.draggingNowElement.id) {
                this.draggingNowElement.id = "block-" + Date.now();
            }

            this.draggingNowElement.addEventListener('mousedown', this.onMouseDown.bind(this));
        }

        this.draggingNowElement.style.left = newLeft + 'px';
        this.draggingNowElement.style.top = newTop + 'px';

        this.workspaceManager.expandIfNeeded(newLeft, newTop, this.draggingNowElement);
        this.draggingNowElement.classList.remove('dragging');
    }

    onScroll() {
        if (this.isDragging && this.draggingNowElement) {
            this.moveAt(this.currentX, this.currentY);
        }
    }

    cleanUp() {
        this.isDragging = false;
        this.draggingNowElement = null;
        this.originalElement = null;
    }

    addDocumentListeners() {
        document.addEventListener('mousemove', this.onMouseMove.bind(this));
        document.addEventListener('mouseup', this.onMouseUp.bind(this));
    }
}