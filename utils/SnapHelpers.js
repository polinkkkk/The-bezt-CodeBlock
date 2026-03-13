import { BLOCK_TYPES, ARITHMETIC_BLOCKS } from '../models/BlockTypes.js';

export class SnapHelpers {
    constructor(snapDistance = 40) {
        this.snapDistance = snapDistance;
    }

    findClosestBlock(block, allBlocks, workspaceArea) {
        const rect1 = block.getBoundingClientRect();
        const workspaceRect = workspaceArea.getBoundingClientRect();
        const scrollLeft = workspaceArea.scrollLeft;
        const scrollTop = workspaceArea.scrollTop;

        let closest = null;
        let minDist = this.snapDistance;
        let snapType = null;

        const isHorizontal = this.isHorizontalBlock(block);

        for (let other of allBlocks) {
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
        return block.classList.contains('ariphm') || 
               block.classList.contains('block-bracket') ||
               ARITHMETIC_BLOCKS.includes(block.dataset.type);
    }

    calculateSnapPosition(block, targetBlock, snapType, workspaceArea) {
        const targetRect = targetBlock.getBoundingClientRect();
        const workspaceRect = workspaceArea.getBoundingClientRect();
        const scrollLeft = workspaceArea.scrollLeft;
        const scrollTop = workspaceArea.scrollTop;

        if (snapType === "horizontal") {
            return {
                left: targetRect.right - workspaceRect.left + scrollLeft,
                top: targetRect.top - workspaceRect.top + scrollTop
            };
        } else {
            return {
                left: targetRect.left - workspaceRect.left + scrollLeft,
                top: targetRect.bottom - workspaceRect.top + scrollTop
            };
        }
    }
}