const PREFIX = 'promote-adr:';

export const PROMOTE_BUTTON_LABEL = 'Promote to ADR';

export interface PromoteTarget {
  readonly repoKey: string;
  readonly number: number;
}

/** State travels in the custom id, so nothing is stored between filing and the click. */
export function promoteCustomId(target: PromoteTarget): string {
  return `${PREFIX}${target.repoKey}:${String(target.number)}`;
}

export function isPromoteCustomId(customId: string): boolean {
  return customId.startsWith(PREFIX);
}

export function parsePromoteCustomId(customId: string): PromoteTarget | undefined {
  const match = /^promote-adr:([a-z0-9-]{1,32}):(\d{1,9})$/.exec(customId);
  const [, repoKey, digits] = match ?? [];
  if (repoKey === undefined || digits === undefined) return undefined;
  return { repoKey, number: Number(digits) };
}
