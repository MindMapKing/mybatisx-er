import * as vscode from 'vscode';

/**
 * 日志管理器
 */
export class Logger {
    private static outputChannel: vscode.OutputChannel;

    /**
     * 初始化日志管理器
     */
    static initialize() {
        this.outputChannel = vscode.window.createOutputChannel('MyBatis ER Generator');
    }

    /**
     * 信息日志
     */
    static info(message: string, ...args: any[]) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] INFO: ${message}`;
        
        console.log(logMessage, ...args);
        this.outputChannel?.appendLine(logMessage);
    }

    /**
     * 警告日志
     */
    static warn(message: string, ...args: any[]) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] WARN: ${message}`;
        
        console.warn(logMessage, ...args);
        this.outputChannel?.appendLine(logMessage);
    }

    /**
     * 错误日志
     */
    static error(message: string, error?: Error, ...args: any[]) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ERROR: ${message}`;
        const errorDetails = error ? `\n${error.stack}` : '';
        
        console.error(logMessage, error, ...args);
        this.outputChannel?.appendLine(logMessage + errorDetails);
    }

    /**
     * 调试日志
     */
    static debug(message: string, ...args: any[]) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] DEBUG: ${message}`;
        
        console.debug(logMessage, ...args);
        this.outputChannel?.appendLine(logMessage);
    }

    /**
     * 显示输出面板
     */
    static show() {
        this.outputChannel?.show();
    }

    /**
     * 清空日志
     */
    static clear() {
        this.outputChannel?.clear();
    }

    /**
     * 销毁日志管理器
     */
    static dispose() {
        this.outputChannel?.dispose();
    }
} 