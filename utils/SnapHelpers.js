import { BLOCK_TYPES, ARITHMETIC_BLOCKS } from '../models/BlockTypes.js';

export class SnapHelpers {
    constructor(snapDistance = 40) {
        this.snapDistance = snapDistance;
    }

    findClosestBlock(block, allBlocks, workspaceArea) {
        const rect1 = block.getBoundingClientRect();
        const { left: workspaceLeft, top: workspaceTop } = workspaceArea.getBoundingClientRect();
        const { scrollLeft, scrollTop } = workspaceArea;

        let closest = null;
        let minDist = this.snapDistance;
        let snapType = null;

        const isHorizontal = this.isHorizontalBlock(block);
        const blocksArray = [...allBlocks];

        for (const other of blocksArray) {
            const rect2 = other.getBoundingClientRect();
            const otherHorizontal = this.isHorizontalBlock(other);

            if (isHorizontal && otherHorizontal && !other.dataset.right) {
                const horizontal = Math.abs(rect1.left - rect2.right);
                const vertical = Math.abs(rect1.top - rect2.top);

                if (horizontal < minDist && vertical < 40) {
                    closest = other;
                    minDist = horizontal;
                    snapType = "horizontal";
                }
            }

            if (!block.dataset.left && !block.dataset.right && !other.dataset.child) {
                const vertical = Math.abs(rect1.top - rect2.bottom);
                const horizontal = Math.abs(rect1.left - rect2.left);

                if (vertical < minDist && horizontal < 60) {
                    closest = other;
                    minDist = vertical;
                    snapType = "vertical";
                }
            }
        }

        return closest ? { block: closest, type: snapType } : null;
    }

    isHorizontalBlock(block) {
        const { classList, dataset: { type } } = block;
        return classList.contains('ariphm') || 
               classList.contains('block-bracket') ||
               ARITHMETIC_BLOCKS.includes(type);
    }

    calculateSnapPosition(block, targetBlock, snapType, workspaceArea) {
        const { right, top, left, bottom } = targetBlock.getBoundingClientRect();
        const { left: workspaceLeft, top: workspaceTop } = workspaceArea.getBoundingClientRect();
        const { scrollLeft, scrollTop } = workspaceArea;

        if (snapType === "horizontal") {
            return {
                left: right - workspaceLeft + scrollLeft,
                top: top - workspaceTop + scrollTop
            };
        }

        return {
            left: left - workspaceLeft + scrollLeft,
            top: bottom - workspaceTop + scrollTop
        };
    }
}