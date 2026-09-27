# avalon-bot

The Avalon community's Discord bot. It currently does one thing: turn a Discord message into a GitHub issue without leaving Discord.

Right-click a message, choose **Apps → File GitHub Issue**, pick a type and repository, add a title and notes, and submit. The bot creates the issue with the quoted message and links back to the discussion, then replies in the same channel or thread with a link to the new ticket. There is no AI involved, no database, and nothing is filed without an explicit submit.

## How it works

1. A member with an allowed role runs the message command. The bot checks the role allowlist, a per-user rate limit, and whether it already marked the message with its own ✅.
2. A modal collects type (bug, feature, task, decision), repository, title and details. The selected message is held in memory for the lifetime of the modal only.
3. On submit the bot creates the issue through a GitHub App, adds a ✅ to the source message, and replies with `Ticket <title> (#N) filed`.

If the issue already exists, choose **Apps → Link GitHub Issue** instead and enter an issue URL or `repo#number` (a configured repository key or `owner/name`). The bot verifies the issue, replies to the message with the link, adds the ✅, and comments on the issue with the Discord source unless `commentOnLinkedIssue` is `false`. Both commands share the role allowlist and the rate limit.

Quoted Discord text is neutralized before it reaches GitHub: `@mentions` and `#123` references are broken and HTML is escaped, so filing an issue cannot ping users or cross-link other issues.

## Notifications

Optional and off by default. With a `notifications` block in `config.yml`, the bot checks each configured repository on a fixed interval (`pollIntervalMinutes`, default 15, minimum 1) and, when an issue it filed has been closed, replies to the original Discord message with a short note. Nothing is stored: the issue body already links to the source message, and the poll cursor and already-notified set live in memory, so closures that happen while the bot is down are not reported. The bot makes outbound requests to GitHub only; no inbound endpoint is needed. Channels or threads listed in `mutedChannelIds` never receive notes.

Set `pullRequests: true` to also post a note when a pull request opened after startup references a bot-filed issue through `Closes #N`, `Fixes #N`, `Resolves owner/repo#N` or an issue URL. Each issue gets one note, and issues the bot did not file are ignored. This lists pull requests, so the GitHub App also needs the **Pull requests: Read** permission.

## Layout

```text
src/
  domain/       Issue kinds, request/response types and the IssueTracker port. No I/O.
  config/       YAML config and environment parsing, validated with zod.
  render/       Issue title/body rendering and text sanitizing.
  services/     The file-an-issue use case.
  github/       GitHub App authentication and the IssueTracker implementation.
  discord/      Gateway client, command, modal, handlers and adapters.
  util/         Logger, rate limiter and TTL store.
  composition.ts  Wires the layers together.
  index.ts        Entry point.
tests/
  unit/         Mirrors src/.
  support/      Shared fixtures.
```

Layering is enforced by lint: `domain`, `config`, `render`, `services` and `util` never import Discord or GitHub code, and `discord` and `github` never import each other.

## Setup

Requires Node 22 or newer.

1. **Discord application.** Create an application in the Discord Developer Portal, add a bot, and invite it to the server with the `bot` and `applications.commands` scopes and these permissions: View Channels, Send Messages, Send Messages in Threads, Read Message History, Add Reactions. Administrator is not needed, and the privileged Message Content intent is not used.
2. **GitHub App.** Create a GitHub App owned by the organization with **Issues: Read and write** (metadata read is implicit) and no webhook. Install it on the repositories the bot may file into, generate a private key, and save the `.pem` file.
3. **Configuration.**

   ```bash
   cp .env.example .env
   cp config.example.yml config.yml
   ```

   Fill in `.env` (tokens and the App ID, key path) and `config.yml` (guild ID, allowed role IDs, repositories, optional per-channel defaults). Both files are gitignored, as are `*.pem` keys.

4. **Register the commands and run.**

   ```bash
   npm ci
   make register-commands   # once, and whenever a command definition changes
   make start               # background; or `make run` in the foreground
   ```

## Development

```bash
make check    # format check, type-check, lint, tests: what CI runs
make test
make fmt
```

`make help` lists every target.

## Configuration reference

See [`config.example.yml`](config.example.yml). Labels default to the organization's `type: bug`, `type: feature`, `type: chore` and `decision`; if a label does not exist in the target repository the issue is still created without it.

## Security

Never commit `.env`, `config.yml` or a private key. To report a vulnerability, use the organization's security policy.

## License

Apache-2.0. See [LICENSE](LICENSE).
