import { Node } from "../../runtime/nodes/Node";
import { Stage } from "tree2d/lib";
import { getCommonAncestor, getCurrentContext } from "../utils";
import { VugelEvent } from "../types";

class FocusManager {
    private focusedNode?: Node = undefined;
    private updatingFocusPath: boolean = false;

    constructor(private canvasElement: HTMLCanvasElement, private stage: Stage) {
        this.ensureCanvasFocusable();
        this.canvasElement.addEventListener("click", (e) => this.onCanvasClick(e));
        this.canvasElement.addEventListener("blur", (e) => this.onCanvasBlur(e));
    }

    private ensureCanvasFocusable() {
        if (!this.canvasElement.hasAttribute("tabindex")) {
            this.canvasElement.setAttribute("tabindex", "-1");
        }
    }

    private onCanvasClick(e: MouseEvent) {
        // Automatically focus on clicked elements.
        const { currentElement } = getCurrentContext(e, this.stage);
        const node = currentElement?.element.data;
        this.setFocus(node);
    }

    private onCanvasBlur(e: FocusEvent) {
        this.setFocus(undefined);
    }

    public setFocus(focused: Node | undefined) {
        if (this.updatingFocusPath) {
            console.warn(
                "It's not allowed to focus from within a focus-related event. Use setInterval to schedule a focus change.",
            );
        } else if (this.focusedNode !== focused) {
            this.updateFocusPath(focused);
        }
    }

    public updateFocusPath(newFocusedNode: Node | undefined) {
        this.updatingFocusPath = true;

        const prevFocusedNode = this.focusedNode;
        const commonAncestor = getCommonAncestor(this.focusedNode, newFocusedNode);

        // Use event order as specified in https://www.w3.org/TR/DOM-Level-3-Events/#events-focusevent-event-order

        if (prevFocusedNode) {
            prevFocusedNode.dispatchBubbledEvent(
                this.createFocusEvent("focusout", prevFocusedNode, newFocusedNode),
                commonAncestor,
            );
        }

        if (newFocusedNode) {
            newFocusedNode.dispatchBubbledEvent(
                this.createFocusEvent("focusin", newFocusedNode, prevFocusedNode),
                commonAncestor,
            );
        }

        if (prevFocusedNode) {
            prevFocusedNode.dispatchEvent(this.createFocusEvent("blur", prevFocusedNode, newFocusedNode));
        }

        if (newFocusedNode) {
            newFocusedNode.dispatchEvent(this.createFocusEvent("focus", newFocusedNode, prevFocusedNode));
        }

        this.updatingFocusPath = false;
    }

    private createFocusEvent(
        type: SupportedFocusEvents,
        target: Node | undefined,
        relatedTarget: Node | undefined,
    ): VugelFocusEvent {
        return {
            cancelBubble: false,

            // Event
            type,

            relatedTarget: relatedTarget ?? null,
            target: target ?? null,
            currentTarget: null,

            originalEvent: undefined,
        };
    }
}

export { FocusManager };

export interface VugelFocusEvent extends VugelEvent {
    relatedTarget: Node | null;
}

export type SupportedFocusEvents = "focusin" | "focusout" | "focus" | "blur";

type TranslatedFocusEvents = "onFocusin" | "onFocusout" | "onFocus" | "onBlur";

export const focusEventTranslator: {
    [x in SupportedFocusEvents]: TranslatedFocusEvents;
} = {
    focusin: "onFocusin",
    focusout: "onFocusout",
    focus: "onFocus",
    blur: "onBlur",
} as const;
