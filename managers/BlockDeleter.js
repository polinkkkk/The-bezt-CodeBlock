import { WorkspaceManager } from './WorkspaceManager.js';

export class BlockDeleter {
    constructor() {
        const workspaceArea = document.getElementById('WorkspaceArea');
        this.workspaceManager = new WorkspaceManager(workspaceArea, 100, 400);
        this.init();
    }

    init() {
        const removeButton = document.getElementById('removebutton');
        if (removeButton) {
            removeButton.onclick = this.clearWorkspace.bind(this);
        }
    }

    clearWorkspace() {
        this.workspaceManager.clearWorkspace();
        const output = document.getElementById('output');
        output.innerHTML = '🧹 Рабочая область очищена!';
    }
}