export class DragHelpers {
    static calculatePosition(element, clientX, clientY, offsetX, offsetY, workspaceArea, isFixed = false) {
        if (isFixed) {
            return {
                left: clientX - offsetX,
                top: clientY - offsetY
            };
        }

        const { left, top } = workspaceArea.getBoundingClientRect();
        const { scrollLeft, scrollTop } = workspaceArea;
        
        return {
            left: clientX - left - offsetX + scrollLeft,
            top: clientY - top - offsetY + scrollTop
        };
    }

    static isInsideWorkspace(clientX, clientY, { left, right, top, bottom }) {
        return clientX >= left && 
               clientX <= right && 
               clientY >= top && 
               clientY <= bottom;
    }

    static cloneBlock(block) {
        const clone = block.cloneNode(true);
        const { width, height, left, top } = block.getBoundingClientRect();
        
        clone.id = `block-${Date.now()}`;
        clone.dataset.type = block.dataset.type;
        
        const styles = {
            position: 'fixed',
            pointerEvents: 'none',
            width: `${width}px`,
            height: `${height}px`,
            left: `${left}px`,
            top: `${top}px`
        };

        Object.assign(clone.style, styles);
        
        return clone;
    }
}