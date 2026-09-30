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

## Promoting a decision to an ADR

Set `maintainerRoleIds` in `config.yml` to enable it. When someone files a **Decision**, the bot's confirmation carries a **Promote to ADR** button. A member with a maintainer role can press it to rewrite the issue into the organization's ADR shape (Status, Context, Decision, Consequences, Related), add the `architecture-decision-record` label, and close it as completed. The button then disappears. Only open, bot-filed decisions can be promoted, and nothing is stored: the repository and issue number travel in the button itself. The Consequences section is left for a maintainer to fill in on GitHub. The existing Issues read/write permission is enough.

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

See [`docs/setup.md`](docs/setup.md) for the full walkthrough: the Discord application, the GitHub App and its permissions, the `.env` and `config.yml` fields, registering the command, and troubleshooting.

## Deployment

`deploy/avalon-bot.service` runs the bot under systemd as a dedicated non-root user, restarts it on failure and starts it on boot. The unit assumes the install path `/opt/avalon-bot`; edit `WorkingDirectory`, `EnvironmentFile` and `ExecStart` if the path or Node location differs.

Install:

```bash
sudo useradd --system --home /opt/avalon-bot --shell /usr/sbin/nologin avalon-bot
sudo git clone https://github.com/avalon-initiative/avalon-bot /opt/avalon-bot
cd /opt/avalon-bot
# create .env, config.yml and the GitHub App .pem (see docs/setup.md), then:
sudo chown -R avalon-bot:avalon-bot /opt/avalon-bot
sudo chmod 600 .env *.pem
sudo -u avalon-bot npm ci && sudo -u avalon-bot make build
sudo -u avalon-bot make register-commands
sudo cp deploy/avalon-bot.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now avalon-bot
```

Update:

```bash
cd /opt/avalon-bot
sudo -u avalon-bot git pull
sudo -u avalon-bot npm ci && sudo -u avalon-bot make build
sudo systemctl restart avalon-bot
```

Logs are JSON lines in the journal:

```bash
journalctl -u avalon-bot -f
systemctl status avalon-bot
```

The unit mounts the filesystem read-only for the service, so the bot writes nothing to disk; it needs only to read `.env`, `config.yml` and the key.

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
