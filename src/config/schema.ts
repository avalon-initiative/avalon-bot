import { z } from 'zod';

const snowflake = z.string().regex(/^\d{15,25}$/, 'expected a Discord ID (digits only)');

const repositorySchema = z.object({
  key: z.string().regex(/^[a-z0-9-]{1,32}$/, 'lowercase letters, digits and dashes, max 32'),
  name: z.string().min(1).max(100),
  repo: z.string().regex(/^[\w.-]+\/[\w.-]+$/, 'expected owner/name'),
});

const labelsSchema = z
  .object({
    bug: z.string().min(1).default('type: bug'),
    feature: z.string().min(1).default('type: feature'),
    task: z.string().min(1).default('type: chore'),
    decision: z.string().min(1).default('decision'),
  })
  .default({ bug: 'type: bug', feature: 'type: feature', task: 'type: chore', decision: 'decision' });

export const configSchema = z
  .object({
    guildId: snowflake,
    allowedRoleIds: z.array(snowflake).min(1),
    repositories: z.array(repositorySchema).min(1).max(25),
    channelDefaults: z.record(snowflake, z.string()).default({}),
    labels: labelsSchema,
    commentOnLinkedIssue: z.boolean().default(true),
    notifications: z
      .object({
        pollIntervalMinutes: z.number().int().min(1).default(15),
        /** Needs the GitHub App's Pull requests: Read permission. */
        pullRequests: z.boolean().default(false),
        mutedChannelIds: z.array(snowflake).default([]),
      })
      .optional(),
    rateLimit: z
      .object({
        maxRequests: z.number().int().positive().default(5),
        windowSeconds: z.number().int().positive().default(600),
      })
      .default({ maxRequests: 5, windowSeconds: 600 }),
  })
  .superRefine((config, ctx) => {
    const keys = config.repositories.map((r) => r.key);
    if (new Set(keys).size !== keys.length) {
      ctx.addIssue({ code: 'custom', path: ['repositories'], message: 'repository keys must be unique' });
    }
    for (const [channelId, key] of Object.entries(config.channelDefaults)) {
      if (!keys.includes(key)) {
        ctx.addIssue({
          code: 'custom',
          path: ['channelDefaults', channelId],
          message: `unknown repository key "${key}"`,
        });
      }
    }
  });

export type AppConfig = z.infer<typeof configSchema>;
export type RepositoryConfig = AppConfig['repositories'][number];
