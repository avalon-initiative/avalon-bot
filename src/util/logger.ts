export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(message: string, fields?: Readonly<Record<string, unknown>>): void;
  info(message: string, fields?: Readonly<Record<string, unknown>>): void;
  warn(message: string, fields?: Readonly<Record<string, unknown>>): void;
  error(message: string, fields?: Readonly<Record<string, unknown>>): void;
}

const ORDER: Readonly<Record<LogLevel, number>> = { debug: 0, info: 1, warn: 2, error: 3 };

export function createLogger(
  level: LogLevel,
  write: (line: string) => void = (line) => process.stdout.write(`${line}\n`),
): Logger {
  const emit =
    (at: LogLevel) =>
    (message: string, fields?: Readonly<Record<string, unknown>>): void => {
      if (ORDER[at] < ORDER[level]) return;
      write(JSON.stringify({ time: new Date().toISOString(), level: at, message, ...fields }));
    };
  return { debug: emit('debug'), info: emit('info'), warn: emit('warn'), error: emit('error') };
}
