const ZERO_WIDTH_SPACE = '​';

/** Stops GitHub from pinging users (`@name`), linking issues (`#12`) or parsing HTML from untrusted text. */
export function neutralize(text: string): string {
  return text
    .replaceAll('<', '&lt;')
    .replaceAll(/@(?=[\w-])/g, `@${ZERO_WIDTH_SPACE}`)
    .replaceAll(/#(?=\d)/g, `#${ZERO_WIDTH_SPACE}`)
    .replaceAll(/\b(GH-)(?=\d)/gi, `$1${ZERO_WIDTH_SPACE}`);
}

export function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

export function singleLine(text: string): string {
  return text.replaceAll(/\s+/g, ' ').trim();
}

export function quote(text: string): string {
  return text
    .split('\n')
    .map((line) => (line.length > 0 ? `> ${line}` : '>'))
    .join('\n');
}
