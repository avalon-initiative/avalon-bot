import type { SourceMessage } from '../domain/source-message.js';
import type { TtlStore } from '../util/ttl-store.js';

/** A right-clicked message waiting for its modal to be submitted. */
export interface PendingFiling {
  readonly userId: string;
  readonly source: SourceMessage;
}

export type PendingStore = TtlStore<PendingFiling>;
