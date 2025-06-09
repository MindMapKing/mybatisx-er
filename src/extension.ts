import * as vscode from 'vscode';
import { Logger } from './utils/logger';
import { StateManager } from './utils/state-manager';
import { ConfigManager } from './utils/config-manager';
import { CommandHandler } from './commands/command-handler';
import { ERDiagramWebViewProvider } from './ui/webview-provider';

/**
 * VS Code MyBatis ER图生成插件主入口
 * 
 * 功能概述：
 * - 扫描MyBatis/MyBatis-Plus项目中的实体类和映射文件
 * - 智能推断表间关系
 * - 生成美观的ER图文档
 */

// 全局管理器实例
let stateManager: StateManager;
let configManager: ConfigManager;
let commandHandler: CommandHandler;
let webviewProvider: ERDiagramWebViewProvider;

// 扩展激活时调用
export async function activate(context: vscode.ExtensionContext) {
    // 初始化核心管理器
    Logger.initialize();
    stateManager = StateManager.initialize(context);
    configManager = ConfigManager.getInstance();
    
    // 初始化WebView Provider
    webviewProvider = new ERDiagramWebViewProvider(context.extensionUri, context);
    
    // 注册WebView Provider
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            ERDiagramWebViewProvider.viewType,
            webviewProvider
        )
    );
    
    commandHandler = new CommandHandler(stateManager, configManager, webviewProvider);
    
    // 初始化Worker管理器
    try {
        await commandHandler.initialize();
        Logger.info('Worker管理器初始化完成');
    } catch (error) {
        Logger.error('Worker管理器初始化失败', error as Error);
        vscode.window.showErrorMessage(`Worker管理器初始化失败: ${error}`);
        return;
    }
    
    Logger.info('MyBatis ER Generator 扩展已激活');
    
    // 验证配置
    const configValidation = configManager.validateConfig();
    if (!configValidation.valid) {
        Logger.warn('配置验证失败', configValidation.errors);
        vscode.window.showWarningMessage(
            `配置存在问题: ${configValidation.errors.join(', ')}`
        );
    }

    // 注册命令：生成ER图
    const generateCommand = vscode.commands.registerCommand('mybatis-er.generate', 
        () => commandHandler.handleGenerateERDiagram()
    );

    // 注册命令：刷新ER图
    const refreshCommand = vscode.commands.registerCommand('mybatis-er.refresh', 
        () => commandHandler.handleRefreshERDiagram()
    );

    // 注册命令：导出ER图
    const exportCommand = vscode.commands.registerCommand('mybatis-er.export', 
        () => commandHandler.handleExportERDiagram()
    );

    // 注册命令：设置
    const settingsCommand = vscode.commands.registerCommand('mybatis-er.settings', 
        () => commandHandler.handleOpenSettings()
    );

    // 注册命令：显示状态
    const statusCommand = vscode.commands.registerCommand('mybatis-er.status', 
        () => commandHandler.handleShowStatus()
    );

    // 注册命令：清除缓存
    const clearCacheCommand = vscode.commands.registerCommand('mybatis-er.clearCache', 
        () => commandHandler.handleClearCache()
    );

    // 注册命令：测试WebView界面
    const testWebViewCommand = vscode.commands.registerCommand('mybatis-er.testWebView', 
        () => commandHandler.handleTestWebView()
    );

    // 注册命令：性能基准测试
    const performanceBenchmarkCommand = vscode.commands.registerCommand('mybatis-er.performanceBenchmark', 
        () => commandHandler.handlePerformanceBenchmark()
    );

    // 监听配置变更
    const configChangeDisposable = configManager.onConfigChanged((newConfig) => {
        Logger.info('配置已变更，重新应用设置', newConfig);
        // TODO: 根据配置变更更新扩展行为
    });

    // 监听工作空间变更
    const workspaceChangeDisposable = vscode.workspace.onDidChangeWorkspaceFolders(async (event) => {
        Logger.info('工作空间已变更', {
            added: event.added.length,
            removed: event.removed.length
        });
        
        // 清除旧的工作空间状态
        if (event.removed.length > 0) {
            await stateManager.resetWorkspaceState();
        }
    });

    // 将命令和监听器添加到订阅列表
    context.subscriptions.push(
        generateCommand,
        refreshCommand,
        exportCommand,
        settingsCommand,
        statusCommand,
        clearCacheCommand,
        testWebViewCommand,
        performanceBenchmarkCommand,
        configChangeDisposable,
        workspaceChangeDisposable,
        // 添加清理函数
        { dispose: () => commandHandler.dispose() }
    );

    // 显示激活成功消息
    const configSummary = configManager.getConfigSummary();
    const stateStats = stateManager.getStateStats();
    
    vscode.window.showInformationMessage('MyBatis ER Generator 已就绪！');
    Logger.info('扩展激活完成，所有命令已注册', {
        config: configSummary,
        state: stateStats
    });
}

// 扩展停用时调用
export async function deactivate() {
    Logger.info('MyBatis ER Generator 扩展正在停用...');
    
    // 清理Worker管理器
    if (commandHandler) {
        await commandHandler.dispose();
    }
    
    Logger.info('MyBatis ER Generator 扩展已停用');
    Logger.dispose();
}

 