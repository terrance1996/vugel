import {
    dispatchVugelMouseEvent,
    EventTranslator,
    MouseEventState,
    RegisterEventDispatcher,
    SupportedMouseEvents,
    TranslatedEvent,
    VueEventsOfType,
    VugelMouseEvent,
} from "./index";
import { Stage } from "tree2d/lib";
import { getCurrentContext } from "./utils";

const translateEvent: EventTranslator<TouchEvent, VugelMouseEvent> = (stage, e) => {
    let currentTouch: Touch;

    const eventType = e.type as SupportedTouchEvents;
    if (eventType === "touchend" || eventType === "touchcancel") {
        currentTouch = e.changedTouches[0];
    } else {
        currentTouch = e.touches[0];
    }

    const { currentElement, canvasOffsetX, canvasOffsetY } = getCurrentContext(currentTouch, stage);
    const currentNode = currentElement?.element.data;

    return {
        event: {
            cancelBubble: false,

            // Event
            type: e.type as SupportedMouseEvents,
            currentTarget: currentNode ?? null,
            target: currentNode ?? null,

            // MouseEvent
            canvasOffsetX: canvasOffsetX,
            canvasOffsetY: canvasOffsetY,
            elementOffsetX: currentElement?.offsetX ?? 0,
            elementOffsetY: currentElement?.offsetY ?? 0,

            originalEvent: e,
        },
        currentElement: currentElement,
    };
};

// https://www.w3.org/TR/touch-events/#list-of-touchevent-types
const dispatchTouchEvent = (stage: Stage, eventState: MouseEventState) => {
    return (e: TouchEvent) => {
        const translatedEvent = translateEvent(stage, e);
        let correspondingMouseEvent: SupportedMouseEvents;

        switch (e.type as SupportedTouchEvents) {
            case "touchstart":
                correspondingMouseEvent = "mousedown";
                break;
            case "touchend":
            case "touchcancel":
                correspondingMouseEvent = "mouseup";
                break;
            case "touchmove":
                correspondingMouseEvent = "mousemove";
                break;
        }

        const translatedMouseEvent: TranslatedEvent<VugelMouseEvent> = {
            event: {
                ...translatedEvent.event,
                type: correspondingMouseEvent,
            },
            currentElement: translatedEvent.currentElement,
        };

        dispatchVugelMouseEvent(translatedMouseEvent, eventState);
    };
};

export type SupportedTouchEvents = keyof Pick<
    GlobalEventHandlersEventMap,
    "touchcancel" | "touchend" | "touchstart" | "touchmove"
>;

export const touchEventTranslator: {
    [x in SupportedTouchEvents]: VueEventsOfType<TouchEvent>;
} = {
    touchcancel: "onTouchcancel",
    touchend: "onTouchend",
    touchmove: "onTouchmove",
    touchstart: "onTouchstart",
} as const;

export const setupTouchEvents: RegisterEventDispatcher = (canvasElement, stage) => {
    const eventState: MouseEventState = {};

    for (const key in touchEventTranslator) {
        canvasElement.addEventListener(key, dispatchTouchEvent(stage, eventState) as EventListener);
    }
};
