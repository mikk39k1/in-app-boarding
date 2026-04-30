type Level = "debug" | "info" | "warn" | "error";

class Logger {
  debugEnabled = false;

  private write(level: Level, args: unknown[]) {
    if (level === "debug" && !this.debugEnabled) return;
    const fn = console[level === "debug" ? "log" : level];
    fn.call(console, "[InAppBoarding]", ...args);
  }

  debug(...args: unknown[]) {
    this.write("debug", args);
  }
  info(...args: unknown[]) {
    this.write("info", args);
  }
  warn(...args: unknown[]) {
    this.write("warn", args);
  }
  error(...args: unknown[]) {
    this.write("error", args);
  }
}

export const log = new Logger();
