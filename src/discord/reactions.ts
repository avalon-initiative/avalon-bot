import { HANDLED_EMOJI } from './constants.js';

export interface ReactionLike {
  readonly emoji: { readonly name: string | null };
  readonly me: boolean;
}

/** True only when this bot itself added the marker; other users' identical reactions are ignored. */
export function hasHandledMarker(reactions: Iterable<ReactionLike>): boolean {
  for (const reaction of reactions) {
    if (reaction.me && reaction.emoji.name === HANDLED_EMOJI) return true;
  }
  return false;
}
