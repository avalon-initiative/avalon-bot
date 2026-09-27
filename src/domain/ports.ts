import type { ClosedIssue, CreatedIssue, NewIssue } from './issue.js';

export interface IssueTracker {
  createIssue(issue: NewIssue): Promise<CreatedIssue>;
  /** Throws IssueNotFoundError when the issue is missing or not visible to the app. */
  getIssue(repo: string, number: number): Promise<CreatedIssue>;
  addComment(repo: string, number: number, body: string): Promise<void>;
  /** Issues (not pull requests) in the repository closed at or after `since`. */
  listClosedSince(repo: string, since: Date): Promise<readonly ClosedIssue[]>;
}

/** Where a note is posted: replies to `messageId` in `channelId` (a channel or thread). */
export interface NoteTarget {
  readonly channelId: string;
  readonly messageId: string;
}

export interface DiscordNotifier {
  postNote(target: NoteTarget, content: string): Promise<void>;
}
