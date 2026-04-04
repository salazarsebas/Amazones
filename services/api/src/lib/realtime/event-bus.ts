import { EventEmitter } from "node:events";

export interface RealtimeEvent<TPayload = unknown> {
  channel: string;
  type: string;
  payload: TPayload;
  emittedAt: string;
}

export class RealtimeEventBus {
  private readonly emitter = new EventEmitter();

  publish<TPayload>(event: RealtimeEvent<TPayload>): void {
    this.emitter.emit(event.channel, event);
  }

  subscribe<TPayload>(
    channel: string,
    listener: (event: RealtimeEvent<TPayload>) => void,
  ): () => void {
    this.emitter.on(channel, listener);
    return () => this.emitter.off(channel, listener);
  }
}
