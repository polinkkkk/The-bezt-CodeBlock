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
                if (connected) {
                    connected.dataset[opposite] = "";
                }
                block.dataset[attr] = "";
            }
        });
    }

    clearConnections(block) {
        const connectionAttrs = ['parent', 'child', 'left', 'right'];
        connectionAttrs.forEach(attr => {
            block.dataset[attr] = "";
        });
    }

    getNextBlock(block) {
        if (!block) return null;

        const { right, child, parent } = block.dataset;

        if (right) {
            const rightBlock = document.getElementById(right);
            if (rightBlock) return rightBlock;
        }

        if (child) {
            const childBlock = document.getElementById(child);
            if (childBlock) return childBlock;
        }

        let current = block;
        while (current?.dataset.parent) {
            const parentBlock = document.getElementById(current.dataset.parent);
            if (parentBlock?.dataset.right) {
                const rightBlock = document.getElementById(parentBlock.dataset.right);
                if (rightBlock) return rightBlock;
            }
            current = parentBlock;
        }

        return null;
    }

    findRootBlock(blocks) {
        return blocks.find(({ dataset: { parent } }) => !parent);
    }
}