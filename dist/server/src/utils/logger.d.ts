export declare enum LogLevel {
    DEBUG = "debug",
    INFO = "info",
    WARN = "warn",
    ERROR = "error"
}
interface LogContext {
    operation?: string;
    contentType?: string;
    documentId?: string;
    path?: string[];
    [key: string]: any;
}
export declare class Logger {
    private static instance;
    private currentLogLevel;
    private constructor();
    static getInstance(): Logger;
    setLogLevel(level: LogLevel): void;
    private shouldLog;
    private formatMessage;
    private log;
    debug(message: string, context?: LogContext, error?: any): void;
    info(message: string, context?: LogContext, error?: any): void;
    warn(message: string, context?: LogContext, error?: any): void;
    error(message: string, context?: LogContext, error?: any): void;
}
export declare const logger: Logger;
export {};
