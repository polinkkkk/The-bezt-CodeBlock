import { DragHelpers } from '../utils/DragHelpers.js';
import { SnapHelpers } from '../utils/SnapHelpers.js';
import { BlockConnector } from './BlockConnector.js';
import { WorkspaceManager } from './WorkspaceManager.js';

export class DragAndDropManager {
    constructor() {
        ({
            draggingNowElement: this.draggingNowElement = null,
            originalElement: this.originalElement = null,
            isDragging: this.isDragging = false,
            offsetX: this.offsetX = 0,
            offsetY: this.offsetY = 0,
            currentX: this.currentX = 0,
            currentY: this.currentY = 0
        } = {});

        this.paddingBuffer = 100;
        this.defaultWorkspaceSize = 400;

        this.workspaceArea = document.getElementById('WorkspaceArea');
        this.blocksContainer = document.getElementById('BlocksContainer');
        
        this.snapHelpers = new SnapHelpers(40);
        this.blockConnector = new BlockConnector();
        this.workspaceManager = new WorkspaceManager(
            this.workspaceArea, 
            this.paddingBuffer, 
            this.defaultWorkspaceSize
        );
        
        this.init();
    }

    init() {
        this.makeBlocksDraggable();
        this.addDocumentListeners();
        this.workspaceArea.addEventListener('scroll', this.onScroll.bind(this));
    }

    makeBlocksDraggable() {
        const blocks = [...document.querySelectorAll('.block, .block-bracket')];
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

        ({
            isDragging: this.isDragging = true,
            originalElement: this.originalElement = block
        } = {});

        const rect = block.getBoundingClientRect();
        ({
            offsetX: this.offsetX = event.clientX - rect.left,
            offsetY: this.offsetY = event.clientY - rect.top
        } = {});

        if (!this.workspaceArea.contains(block)) {
            this.draggingNowElement = DragHelpers.cloneBlock(block);
            document.body.appendChild(this.draggingNowElement);
            this.draggingNowElement.addEventListener('mousedown', this.onMouseDown.bind(this));
        } else {
            this.blockConnector.detachBlock(block);
            
            const workspaceRect = this.workspaceArea.getBoundingClientRect();
            this.draggingNowElement = block;
            
            const newLeft = rect.left - workspaceRect.left + this.workspaceArea.scrollLeft;
            const newTop = rect.top - workspaceRect.top + this.workspaceArea.scrollTop;
            
            this.draggingNowElement.style.left = `${newLeft}px`;
            this.draggingNowElement.style.top = `${newTop}px`;
            this.draggingNowElement.style.position = 'absolute';
        }

        this.draggingNowElement.classList.add('dragging');
        this.moveAt(event.clientX, event.clientY);
    }

    onMouseMove(event) {
        if (!this.isDragging) return;

        ({
            currentX: this.currentX = event.clientX,
            currentY: this.currentY = event.clientY
        } = {});

        requestAnimationFrame(() => {
            this.moveAt(this.currentX, this.currentY);
        });
    }

    moveAt(x, y) {
        if (!this.draggingNowElement) return;

        const isFixed = this.draggingNowElement.style.position === 'fixed';
        const { left, top } = DragHelpers.calculatePosition(
            this.draggingNowElement, x, y, this.offsetX, this.offsetY, 
            this.workspaceArea, isFixed
        );

        this.draggingNowElement.style.left = `${left}px`;
        this.draggingNowElement.style.top = `${top}px`;
    }

    onMouseUp(event) {
        if (!this.isDragging) return;

        if (this.draggingNowElement) {
            this.draggingNowElement.classList.remove('dragging');
        }

        const workspaceRect = this.workspaceArea.getBoundingClientRect();
        const insideWorkspace = DragHelpers.isInsideWorkspace(
            event.clientX, event.clientY, workspaceRect
        );

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
        const blocks = [...this.workspaceArea.querySelectorAll('.block, .block-bracket')]
            .filter(b => b !== block);

        const snapResult = this.snapHelpers.findClosestBlock(block, blocks, this.workspaceArea);
        
        if (snapResult) {
            const { block: targetBlock, type } = snapResult;
            const { left, top } = this.snapHelpers.calculateSnapPosition(
                block, targetBlock, type, this.workspaceArea
            );

            block.style.left = `${left}px`;
            block.style.top = `${top}px`;

            this.blockConnector.connectBlocks(targetBlock, block, type);
        }
    }

    dropInsideWorkspace(event) {
        const workspaceRect = this.workspaceArea.getBoundingClientRect();
        const { scrollLeft, scrollTop } = this.workspaceArea;

        const newTop = event.clientY - workspaceRect.top - this.offsetY + scrollTop;
        const newLeft = event.clientX - workspaceRect.left - this.offsetX + scrollLeft;

        if (!this.workspaceArea.contains(this.originalElement)) {
            this.draggingNowElement.style.position = 'absolute';
            this.draggingNowElement.style.pointerEvents = 'auto';
            this.workspaceArea.appendChild(this.draggingNowElement);

            if (!this.draggingNowElement.id) {
                this.draggingNowElement.id = `block-${Date.now()}`;
            }

            this.draggingNowElement.addEventListener('mousedown', this.onMouseDown.bind(this));
        }

        this.draggingNowElement.style.left = `${newLeft}px`;
        this.draggingNowElement.style.top = `${newTop}px`;

        this.workspaceManager.expandIfNeeded(newLeft, newTop, this.draggingNowElement);
        this.draggingNowElement.classList.remove('dragging');
    }

    onScroll() {
        if (this.isDragging && this.draggingNowElement) {
            this.moveAt(this.currentX, this.currentY);
        }
    }

    cleanUp() {
        ({
            isDragging: this.isDragging = false,
            draggingNowElement: this.draggingNowElement = null,
            originalElement: this.originalElement = null
        } = {});
    }

    addDocumentListeners() {
        document.addEventListener('mousemove', this.onMouseMove.bind(this));
        document.addEventListener('mouseup', this.onMouseUp.bind(this));
    }
}