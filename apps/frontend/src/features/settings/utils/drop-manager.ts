// utils/drop-manager.ts
/**
 * Utilities to robustly compute the drop target and position (top/nest/bottom)
 * based on real pointer coords and DOM elements.
 *
 * Exports:
 *  - getDropTargetFromPoint({ x, y, draggedId, allowedCheck })
 *
 * allowedCheck optional: function(overId) => boolean (use to check accept rules)
 */

type DropPosition = "top" | "bottom" | "nest" | null;

export function getDropTargetFromPoint(opts: {
    x: number;
    y: number;
    draggedId?: string | null;
    // optionally a predicate that returns whether a candidate is acceptable
    allowedCheck?: (candidateId: string | null) => boolean;
}): { overId: string | null; position: DropPosition; rect: DOMRect | null } {
    const { x, y, draggedId, allowedCheck } = opts;
    const els = document.elementsFromPoint(x, y);

    // find the first element or its ancestor that has data-dnd-id and is not the dragged element
    let foundEl: HTMLElement | null = null;
    for (const el of els) {
        let node: HTMLElement | null = el as HTMLElement;
        while (node) {
            const id = node.dataset?.dndId ?? node.getAttribute?.("data-dnd-id") ?? null;
            if (id) {
                // skip if it's the dragged element or a descendant of it
                if (draggedId && (id === draggedId || id.startsWith(`${draggedId}.`))) {
                    // climb up and continue search
                } else {
                    // decide whether allowed by predicate
                    if (allowedCheck && !allowedCheck(id)) {
                        // treat as not allowed and continue searching for another candidate
                    } else {
                        foundEl = node;
                        break;
                    }
                }
            }
            node = node.parentElement;
        }
        if (foundEl) break;
    }

    if (!foundEl) {
        return { overId: null, position: null, rect: null };
    }

    const overId = foundEl.dataset?.dndId ?? foundEl.getAttribute("data-dnd-id") ?? null;
    const rect = foundEl.getBoundingClientRect();

    // compute zones
    const topZone = rect.top + rect.height * 0.25;
    const bottomZone = rect.bottom - rect.height * 0.25;

    let position: DropPosition = null;
    if (y <= topZone) position = "top";
    else if (y >= bottomZone) position = "bottom";
    else position = "nest";

    return { overId, position, rect };
}
