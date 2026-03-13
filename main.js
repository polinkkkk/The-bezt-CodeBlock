import { DragAndDropManager } from './managers/DragAndDropManager.js';
import { BlockDeleter } from './managers/BlockDeleter.js';
import { BlockInterpreter } from './interpreters/BlockInterpreter.js';

document.addEventListener('DOMContentLoaded', () => {
    window.dragAndDropManager = new DragAndDropManager();
    window.blockDeleter = new BlockDeleter();
    
    const runButton = document.getElementById('runButton');
    runButton.onclick = () => {
        const interpreter = new BlockInterpreter();
        interpreter.run();
    };

    initTabs();
});

function initTabs() {
    const tabs = [...document.querySelectorAll(".tab")];
    const panels = [...document.querySelectorAll(".panel")];

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            panels.forEach(p => p.classList.remove("active"));

            tab.classList.add("active");
            const panel = document.getElementById(tab.dataset.panel);
            panel.classList.add("active");
        });
    });
}