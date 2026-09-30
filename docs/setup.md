# Setup

Standing up the bot takes a Discord application, an organization-owned GitHub App, and two local files. Requires Node 22 or newer.

## 1. Discord application

1. In the [Developer Portal](https://discord.com/developers/applications), create an application. Copy the **Application ID** into `DISCORD_APP_ID`.
2. Open **Bot**, reset and copy the token into `DISCORD_TOKEN`. Turn **Public Bot** off so only the owner can invite it.
3. Leave every **Privileged Gateway Intent** off. The bot only uses the `Guilds` intent and reads the selected message from the interaction, so it never needs Message Content.
4. Open **OAuth2 → URL Generator**, select the scopes `bot` and `applications.commands`, and the permissions View Channels, Send Messages, Send Messages in Threads, Read Message History and Add Reactions. Open the generated URL to invite the bot to the server. Administrator is not needed.
5. In Discord, enable **Settings → Advanced → Developer Mode**. Right-click the server icon and choose **Copy Server ID** for `guildId`, and copy each allowed role from **Server Settings → Roles → Copy Role ID** for `allowedRoleIds`.

## 2. GitHub App

1. In the organization, go to **Settings → Developer settings → GitHub Apps → New GitHub App**.
2. Set the permission **Issues: Read and write**. Metadata read is implicit. Grant nothing else.
3. Uncheck **Webhook → Active**. The bot makes outbound calls only and never receives requests from GitHub.
4. Restrict installation to the organization, then create the app and copy the **App ID** into `GITHUB_APP_ID`.
5. Generate a private key and save the `.pem` file outside version control. Set `GITHUB_APP_PRIVATE_KEY_PATH` to its path. `*.pem` is gitignored, and the file should be readable by the bot user only (`chmod 600`).
6. Install the app on **Only select repositories** and pick every repository listed under `repositories` in `config.yml`. A repository the app is not installed on produces "The bot is not installed on that repository" when someone files into it.

## 3. Configuration

```bash
cp .env.example .env
cp config.example.yml config.yml
```

`.env`:

| Variable                      | Required | Description                                  |
| ----------------------------- | -------- | -------------------------------------------- |
| `DISCORD_TOKEN`               | yes      | Bot token                                    |
| `DISCORD_APP_ID`              | yes      | Discord application ID                       |
| `GITHUB_APP_ID`               | yes      | GitHub App ID                                |
| `GITHUB_APP_PRIVATE_KEY_PATH` | yes      | Path to the App private key                  |
| `CONFIG_PATH`                 | no       | Defaults to `config.yml`                     |
| `LOG_LEVEL`                   | no       | `debug`, `info` (default), `warn` or `error` |

`config.yml` (see [`config.example.yml`](../config.example.yml)):

| Field             | Description                                                                 |
| ----------------- | --------------------------------------------------------------------------- |
| `guildId`         | The one server the bot serves. Interactions from other servers are ignored. |
| `allowedRoleIds`  | Members need at least one of these roles to use the command.                |
| `repositories`    | Up to 25 `{ key, name, repo }` entries shown in the repository dropdown.    |
| `channelDefaults` | Optional channel ID to repository key, preselecting a repository.           |
| `labels`          | Optional label names per issue type. Missing labels never block filing.     |
| `rateLimit`       | Per-user limit on opening the form (default 5 per 600 seconds).             |

## 4. Register the command and run

```bash
npm ci
make register-commands   # once, and whenever the command definition changes
make start               # background; or `make run` in the foreground
```

The command appears under **Apps → File GitHub Issue** on a message's context menu. Registration is guild-scoped and takes effect immediately.

## Troubleshooting

| Symptom                                                            | Cause and fix                                                                                                                                        |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Invalid environment: DISCORD_TOKEN: ...`                          | A required variable is missing or empty in `.env`. The message names each field.                                                                     |
| `Invalid config: ...` at startup                                   | `config.yml` failed validation. The message lists the offending paths, for example a non-numeric role ID or a `channelDefaults` key that is unknown. |
| `ENOENT` reading `config.yml` or the `.pem`                        | `CONFIG_PATH` or `GITHUB_APP_PRIVATE_KEY_PATH` is wrong, or the command is run from a different directory.                                           |
| `register-commands` fails with `Unknown Guild` or `Missing Access` | `guildId` is wrong, or the bot was not invited with the `applications.commands` scope. Re-invite it with the URL from step 1.                        |
| The command is missing from the Apps menu                          | Registration was not run for this guild, or Discord has not refreshed the client. Run `make register-commands` and reload Discord.                   |
| "You need a contributor role to file issues from Discord."         | The member has none of `allowedRoleIds`.                                                                                                             |
| "The bot is not installed on that repository."                     | The GitHub App is not installed on that repository, or it is not selected under **Only select repositories**.                                        |
| Bad credentials or a 401 from GitHub                               | `GITHUB_APP_ID` does not match the private key, or the key was revoked. Generate a new key and update the path.                                      |
| Issue filed without a label                                        | The label does not exist in that repository. Create it, or change the name under `labels`.                                                           |
