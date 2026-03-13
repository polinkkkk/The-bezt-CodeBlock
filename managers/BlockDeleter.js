import { WorkspaceManager } from './WorkspaceManager.js';

export class BlockDeleter {
    constructor() {
        this.workspaceManager = new WorkspaceManager(
            document.getElementById('WorkspaceArea'),
            100,
            400
        );
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
        document.getElementById('output').innerHTML = '🧹 Рабочая область очищена!';
    }
}