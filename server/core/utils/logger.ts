/**
 * 结构化日志系统
 * 支持不同级别的日志输出，便于调试和监控
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVEL_COLORS = {
  debug: "\x1b[36m", // cyan
  info: "\x1b[32m",  // green
  warn: "\x1b[33m",  // yellow
  error: "\x1b[31m", // red
  reset: "\x1b[0m",
};

export interface LogOptions {
  level?: LogLevel;
  service?: string;
}

export class Logger {
  private level: LogLevel;
  private service: string;

  constructor(options: LogOptions = {}) {
    this.level = options.level || (process.env.LOG_LEVEL as LogLevel) || "info";
    this.service = options.service || "panhub";
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["debug", "info", "warn", "error"];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const color = LOG_LEVEL_COLORS[level];
    const reset = LOG_LEVEL_COLORS.reset;

    let log = `${color}[${timestamp}] [${level.toUpperCase()}] [${this.service}]${reset} ${message}`;

    if (data !== undefined) {
      try {
        const dataStr =
          typeof data === "string" ? data : JSON.stringify(data, null, 2);
        log += `\n${color}${dataStr}${reset}`;
      } catch {
        log += ` ${data}`;
      }
    }

    return log;
  }

  debug(message: string, data?: any): void {
    if (!this.shouldLog("debug")) return;
    console.debug(this.formatMessage("debug", message, data));
  }

  info(message: string, data?: any): void {
    if (!this.shouldLog("info")) return;
    console.info(this.formatMessage("info", message, data));
  }

  warn(message: string, data?: any): void {
    if (!this.shouldLog("warn")) return;
    console.warn(this.formatMessage("warn", message, data));
  }

  error(message: string, error?: any): void {
    if (!this.shouldLog("error")) return;
    const errorMessage =
      error instanceof Error
        ? { message: error.message, stack: error.stack, name: error.name }
        : error;
    console.error(this.formatMessage("error", message, errorMessage));
  }

  // 创建子 logger
  child(service: string): Logger {
    return new Logger({ level: this.level, service: `${this.service}:${service}` });
  }
}

// 默认导出实例
export const logger = new Logger({ service: "main" });

// 工厂函数
export function createLogger(service: string): Logger {
  return new Logger({ service });
}
