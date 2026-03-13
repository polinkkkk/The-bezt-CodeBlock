export class DragHelpers {
    static calculatePosition(element, clientX, clientY, offsetX, offsetY, workspaceArea, isFixed = false) {
        if (isFixed) {
            return {
                left: clientX - offsetX,
                top: clientY - offsetY
            };
        } else {
            const workspaceRect = workspaceArea.getBoundingClientRect();
            const scrollLeft = workspaceArea.scrollLeft;
            const scrollTop = workspaceArea.scrollTop;
            
            return {
                left: clientX - workspaceRect.left - offsetX + scrollLeft,
                top: clientY - workspaceRect.top - offsetY + scrollTop
            };
        }
    }

    static isInsideWorkspace(clientX, clientY, workspaceRect) {
        return clientX >= workspaceRect.left &&
               clientX <= workspaceRect.right &&
               clientY >= workspaceRect.top &&
               clientY <= workspaceRect.bottom;
    }

    static cloneBlock(block) {
        const clone = block.cloneNode(true);
        clone.id = `block-${Date.now()}`;
        clone.dataset.type = block.dataset.type;
        clone.style.position = 'fixed';
        clone.style.pointerEvents = 'none';
        
        const rect = block.getBoundingClientRect();
        clone.style.width = rect.width + 'px';
        clone.style.height = rect.height + 'px';
        clone.style.left = rect.left + 'px';
        clone.style.top = rect.top + 'px';
        
        return clone;
    }
}