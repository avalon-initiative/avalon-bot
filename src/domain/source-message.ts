export interface SourceAttachment {
  readonly name: string;
  readonly url: string;
}

/** A Discord message reduced to what an issue needs, free of any Discord library types. */
export interface SourceMessage {
  readonly id: string;
  readonly authorName: string;
  readonly content: string;
  readonly timestamp: Date;
  readonly channelName: string;
  readonly threadName: string | null;
  readonly messageUrl: string;
  readonly discussionUrl: string;
  readonly attachments: readonly SourceAttachment[];
}
