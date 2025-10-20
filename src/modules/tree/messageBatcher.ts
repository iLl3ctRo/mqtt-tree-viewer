// Message batching utility for throttling high-frequency MQTT updates

import type { MessageRecord } from './types';

export class MessageBatcher {
  private batch: MessageRecord[] = [];
  private timeoutId: number | null = null;
  private readonly intervalMs: number;
  private readonly onFlush: (messages: MessageRecord[]) => void;

  constructor(intervalMs: number, onFlush: (messages: MessageRecord[]) => void) {
    this.intervalMs = intervalMs;
    this.onFlush = onFlush;
  }

  add(message: MessageRecord): void {
    this.batch.push(message);

    // Schedule flush if not already scheduled
    if (this.timeoutId === null) {
      this.timeoutId = window.setTimeout(() => {
        this.flush();
      }, this.intervalMs);
    }
  }

  flush(): void {
    if (this.batch.length === 0) return;

    // Call the flush callback with all batched messages
    this.onFlush([...this.batch]);

    // Clear batch and timeout
    this.batch = [];
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  clear(): void {
    this.batch = [];
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  getBatchSize(): number {
    return this.batch.length;
  }
}
