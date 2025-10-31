import mitt, { Emitter, EventType } from 'mitt';

/**
 * Bus interface for event-driven communication between components.
 * Wrapper around mitt emitter.
 */
export type Hd3Bus<Events extends Record<EventType, unknown> = Record<EventType, unknown>> = Emitter<Events>;

/**
 * Create a new Hd3Bus instance
 */
export function createHd3Bus<Events extends Record<EventType, unknown> = Record<EventType, unknown>>(): Hd3Bus<Events> {
  return mitt<Events>();
}
