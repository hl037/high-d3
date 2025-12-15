import * as d3 from "d3";

export type Point = { x: number; y: number };

export type MappedEvent = {
  original: MouseEvent;
  element: Point;
  page: Point;
};

export type TrackingHooks = {
  mouseDown?: (e: MappedEvent) => void;
  mouseMove?: (e: MappedEvent) => void;
  mouseUp?: (e: MappedEvent) => void;
};

export function startTracking(
  initialEvent: MouseEvent,
  target: HTMLElement | SVGElement,
  hooks: TrackingHooks
): () => void {
  let activeButton: number | null = null;

  const mapEvent = (e: MouseEvent): MappedEvent => {
    const page = { x: e.pageX, y: e.pageY };
    const [x, y] = d3.pointer(e, target)
    const element = {x, y};
    return { original: e, page, element };
  };


  const onMouseMove = (e: MouseEvent) => {
    if (activeButton === null) {return;}
    if (!(e.buttons & (1 << activeButton))) {
      endTracking(e);
      return;
    }
    hooks.mouseMove?.(mapEvent(e));
  };

  const onMouseUp = (e: MouseEvent) => {
    if (e.button !== activeButton) {return;}
    endTracking(e);
  };

  const onMouseEnter = (e: MouseEvent) => {
    if (activeButton === null) {return;}
    if (!(e.buttons & (1 << activeButton))) {
      endTracking(e);
    }
  };

  const endTracking = (e: MouseEvent) => {
    hooks.mouseUp?.(mapEvent(e));
    cleanup();
  };

  const cleanup = () => {
    activeButton = null;
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    document.removeEventListener("mouseenter", onMouseEnter);
  };
  
  activeButton = initialEvent.button;
  hooks.mouseDown?.(mapEvent(initialEvent));
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
  document.addEventListener("mouseenter", onMouseEnter);

  return cleanup;
}
