export class BlockConnector {
    connectBlocks(sourceBlock, targetBlock, connectionType) {
        if (connectionType === "horizontal") {
            targetBlock.dataset.left = sourceBlock.id;
            sourceBlock.dataset.right = targetBlock.id;
            targetBlock.dataset.parent = "";
            sourceBlock.dataset.child = "";
        } else if (connectionType === "vertical") {
            targetBlock.dataset.parent = sourceBlock.id;
            sourceBlock.dataset.child = targetBlock.id;
        }
    }

    detachBlock(block) {
        const connections = [
            { attr: 'parent', opposite: 'child' },
            { attr: 'child', opposite: 'parent' },
            { attr: 'left', opposite: 'right' },
            { attr: 'right', opposite: 'left' }
        ];

        connections.forEach(({ attr, opposite }) => {
            const connectedId = block.dataset[attr];
            if (connectedId) {
                const connected = document.getElementById(connectedId);
                if (connected) connected.dataset[opposite] = "";
                block.dataset[attr] = "";
            }
        });
    }

    clearConnections(block) {
        block.dataset.parent = "";
        block.dataset.child = "";
        block.dataset.left = "";
        block.dataset.right = "";
    }

    getNextBlock(block) {
        if (!block) return null;

        if (block.dataset.right) {
            const right = document.getElementById(block.dataset.right);
            if (right) return right;
        }

        if (block.dataset.child) {
            const child = document.getElementById(block.dataset.child);
            if (child) return child;
        }

        let current = block;
        while (current.dataset.parent) {
            const parent = document.getElementById(current.dataset.parent);
            if (parent && parent.dataset.right) {
                const right = document.getElementById(parent.dataset.right);
                if (right) return right;
            }
            current = parent;
        }

        return null;
    }

    findRootBlock(blocks) {
        return Array.from(blocks).find(block => !block.dataset.parent || block.dataset.parent === "");
    }
}