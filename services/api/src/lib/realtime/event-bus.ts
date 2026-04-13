import { EventEmitter } from "node:events";

export interface RealtimeEvent<TPayload = unknown> {
  channel: string;
  type: string;
  payload: TPayload;
  emittedAt: string;
}

export class RealtimeEventBus {
  private readonly emitter = new EventEmitter();
  private readonly channels = new Set<string>();

  publish<TPayload>(event: RealtimeEvent<TPayload>): void {
    this.channels.add(event.channel);
    this.emitter.emit(event.channel, event);
  }

  subscribe<TPayload>(
    channel: string,
    listener: (event: RealtimeEvent<TPayload>) => void,
  ): () => void {
    this.channels.add(channel);
    this.emitter.on(channel, listener);
    return () => this.emitter.off(channel, listener);
  }

  channelCount(): number {
    return this.channels.size;
  }
}
