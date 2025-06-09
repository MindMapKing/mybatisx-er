import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { StateManager } from '../utils/state-manager';
import { ConfigManager } from '../utils/config-manager';
import { WorkerManager } from '../workers/worker-manager';
import { FileScanner } from '../utils/file-scanner';
import { WorkerMessageType } from '../types/worker-types';
import { ERDiagramWebViewProvider } from '../ui/webview-provider';
import { MermaidERGenerator } from '../ui/mermaid-generator';
import { testERData, generateTestMermaidCode } from '../ui/test-data';
import { PerformanceTester } from '../utils/performance-tester';

/**
 * 命令处理器
 * 负责处理所有扩展命令的业务逻辑
 */
export class CommandHandler {
    private stateManager: StateManager;
    private configManager: ConfigManager;
    private workerManager: WorkerManager;
    private fileScanner: FileScanner;
    private webviewProvider: ERDiagramWebViewProvider;
    private mermaidGenerator: MermaidERGenerator;

    constructor(stateManager: StateManager, configManager: ConfigManager, webviewProvider: ERDiagramWebViewProvider) {
        this.stateManager = stateManager;
        this.configManager = configManager;
        this.webviewProvider = webviewProvider;
        this.workerManager = new WorkerManager();
        this.fileScanner = new FileScanner();
        this.mermaidGenerator = new MermaidERGenerator();
    }

    /**
     * 初始化Worker管理器
     */
    async initialize(): Promise<void> {
        try {
            await this.workerManager.start();
            Logger.info('Worker管理器初始化完成');
        } catch (error) {
            Logger.error('Worker管理器初始化失败', error as Error);
            throw error;
        }
    }

    /**
     * 清理资源
     */
    async dispose(): Promise<void> {
        try {
            await this.workerManager.shutdown();
            Logger.info('Worker管理器已关闭');
        } catch (error) {
            Logger.error('Worker管理器关闭失败', error as Error);
        }
    }

    /**
     * 生成ER图命令处理
     */
    async handleGenerateERDiagram(): Promise<void> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showWarningMessage('请先打开一个工作空间');
            return;
        }

        try {
            // 检查是否为MyBatis项目
            const isMyBatisProject = await this.stateManager.isMyBatisProject();
            if (!isMyBatisProject) {
                const result = await vscode.window.showWarningMessage(
                    '当前工作空间似乎不是MyBatis项目，是否继续？',
                    '继续', '取消'
                );
                if (result !== '继续') {
                    return;
                }
            }

            // 获取配置
            const config = this.configManager.getExtensionConfig();
            
            Logger.info('开始生成ER图', { 
                workspace: this.stateManager.getCurrentWorkspacePath(),
                config: this.configManager.getConfigSummary()
            });

            // 检查缓存
            if (config.autoRefresh && this.stateManager.isCacheValid()) {
                const useCache = await vscode.window.showInformationMessage(
                    '发现有效缓存，是否使用缓存数据？',
                    '使用缓存', '重新生成'
                );
                
                if (useCache === '使用缓存') {
                    const cachedData = await this.stateManager.getERDiagramData();
                    if (cachedData) {
                        Logger.info('使用缓存数据生成ER图');
                        vscode.window.showInformationMessage('ER图生成完成（使用缓存）！');
                        return;
                    }
                }
            }

            // 显示进度条
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "正在生成ER图...",
                cancellable: true
            }, async (progress, token) => {
                await this.performERGeneration(progress, token);
            });

            Logger.info('ER图生成完成');
            vscode.window.showInformationMessage('ER图生成完成！');
            
        } catch (error) {
            Logger.error('生成ER图失败', error as Error);
            vscode.window.showErrorMessage(`生成ER图失败: ${error}`);
        }
    }

    /**
     * 执行ER图生成的核心逻辑
     */
    private async performERGeneration(
        progress: vscode.Progress<{ increment?: number; message?: string }>,
        token: vscode.CancellationToken
    ): Promise<void> {
        progress.report({ increment: 0, message: "扫描项目文件..." });

        // 清理过期缓存
        await this.stateManager.cleanExpiredCache();

        // 扫描项目文件
        const scanResult = await this.fileScanner.scanWorkspace({
            includeTests: this.configManager.getExtensionConfig().includeTestFiles
        });
        
        Logger.info(`文件扫描完成: ${scanResult.stats.totalFiles}个文件`);
        progress.report({ increment: 20, message: `发现${scanResult.stats.entityCount}个实体类...` });

        if (token.isCancellationRequested) {
            throw new Error('用户取消了操作');
        }

        // 解析Java实体文件
        const javaParseResults = [];
        for (const javaFile of scanResult.javaFiles.filter(f => f.isEntity)) {
            if (token.isCancellationRequested) {
                throw new Error('用户取消了操作');
            }

            try {
                const content = await this.fileScanner.getFileContent(javaFile.filePath);
                const result = await this.workerManager.submitTask(
                    WorkerMessageType.PARSE_JAVA_FILE,
                    {
                        filePath: javaFile.filePath,
                        content,
                        fileType: 'java',
                        options: { parseMethodBodies: false }
                    }
                );
                javaParseResults.push(result);
            } catch (error) {
                Logger.warn(`解析Java文件失败: ${javaFile.filePath}`, error as Error);
            }
        }

        progress.report({ increment: 25, message: "解析XML映射文件..." });

        // 解析XML映射文件
        const xmlParseResults = [];
        for (const xmlFile of scanResult.xmlFiles.filter(f => f.isMapper)) {
            if (token.isCancellationRequested) {
                throw new Error('用户取消了操作');
            }

            try {
                const content = await this.fileScanner.getFileContent(xmlFile.filePath);
                const result = await this.workerManager.submitTask(
                    WorkerMessageType.PARSE_XML_FILE,
                    {
                        filePath: xmlFile.filePath,
                        content,
                        fileType: 'xml'
                    }
                );
                xmlParseResults.push(result);
            } catch (error) {
                Logger.warn(`解析XML文件失败: ${xmlFile.filePath}`, error as Error);
            }
        }

        progress.report({ increment: 25, message: "推断实体关系..." });

        if (token.isCancellationRequested) {
            throw new Error('用户取消了操作');
        }

        // 推断实体关系
        const entities = javaParseResults.flatMap(result => result.entity ? [result.entity] : []);
        const xmlResults = xmlParseResults.flatMap(result => result.result ? [result.result] : []);
        
        const relationResult = await this.workerManager.submitTask(
            WorkerMessageType.INFER_RELATIONS,
            {
                entities,
                xmlResults,
                strategies: this.configManager.getExtensionConfig().inferenceStrategies,
                minConfidence: 0.7
            }
        );

        progress.report({ increment: 20, message: "生成ER图..." });

        if (token.isCancellationRequested) {
            throw new Error('用户取消了操作');
        }

        // 生成ER图
        const diagramResult = await this.workerManager.submitTask(
            WorkerMessageType.GENERATE_DIAGRAM,
            {
                entities,
                relations: relationResult.relations || [],
                options: {
                    theme: this.configManager.getExtensionConfig().theme,
                    format: 'mermaid',
                    includeFields: true,
                    includeRelations: true
                }
            }
        );

        // 保存ER图数据
        const erData = {
            entities,
            relations: relationResult.relations || [],
            generatedAt: new Date(),
            projectPath: this.stateManager.getCurrentWorkspacePath() || ''
        };
        await this.stateManager.saveERDiagramData(erData);

        // 更新WebView显示
        this.webviewProvider.updateDiagram(erData);

        progress.report({ increment: 10, message: "完成" });
        
        Logger.info('ER图生成完成', {
            entityCount: entities.length,
            relationCount: relationResult.relations?.length || 0,
            scanStats: scanResult.stats
        });
    }

    /**
     * 刷新ER图命令处理
     */
    async handleRefreshERDiagram(): Promise<void> {
        try {
            Logger.info('开始刷新ER图');
            
            // 清除缓存
            await this.stateManager.clearERDiagramData();
            
            // 重新生成
            await this.handleGenerateERDiagram();
            
            Logger.info('ER图刷新完成');
        } catch (error) {
            Logger.error('刷新ER图失败', error as Error);
            vscode.window.showErrorMessage(`刷新ER图失败: ${error}`);
        }
    }

    /**
     * 导出ER图命令处理
     */
    async handleExportERDiagram(): Promise<void> {
        try {
            // 检查是否有ER图数据
            const erData = await this.stateManager.getERDiagramData();
            if (!erData) {
                const result = await vscode.window.showInformationMessage(
                    '没有找到ER图数据，是否先生成ER图？',
                    '生成ER图', '取消'
                );
                if (result === '生成ER图') {
                    await this.handleGenerateERDiagram();
                    return;
                }
                return;
            }

            // 获取配置的导出格式
            const config = this.configManager.getExtensionConfig();
            
            const options = ['PNG', 'SVG', 'PDF', 'Mermaid文本'];
            const defaultFormat = config.exportFormat.toUpperCase();
            
            const selected = await vscode.window.showQuickPick(options, {
                placeHolder: '选择导出格式',
                value: defaultFormat
            });

            if (selected) {
                Logger.info(`开始导出ER图为${selected}格式`);
                
                // 选择保存位置
                const saveUri = await vscode.window.showSaveDialog({
                    defaultUri: vscode.Uri.file(`er-diagram.${selected.toLowerCase()}`),
                    filters: {
                        [selected]: [selected.toLowerCase()]
                    }
                });

                if (saveUri) {
                    // TODO: 实现实际导出逻辑
                    Logger.info(`ER图将导出到: ${saveUri.fsPath}`);
                    vscode.window.showInformationMessage(`导出为${selected}格式功能开发中...`);
                }
            }
        } catch (error) {
            Logger.error('导出ER图失败', error as Error);
            vscode.window.showErrorMessage(`导出ER图失败: ${error}`);
        }
    }

    /**
     * 打开设置命令处理
     */
    async handleOpenSettings(): Promise<void> {
        try {
            Logger.info('打开扩展设置');
            
            // 显示配置摘要
            const configSummary = this.configManager.getConfigSummary();
            const stateStats = this.stateManager.getStateStats();
            
            Logger.info('当前配置摘要', configSummary);
            Logger.info('当前状态统计', stateStats);
            
            // 打开设置页面
            await vscode.commands.executeCommand('workbench.action.openSettings', 'mybatis-er');
            
        } catch (error) {
            Logger.error('打开设置失败', error as Error);
            vscode.window.showErrorMessage(`打开设置失败: ${error}`);
        }
    }

    /**
     * 显示状态信息命令处理
     */
    async handleShowStatus(): Promise<void> {
        try {
            const configSummary = this.configManager.getConfigSummary();
            const stateStats = this.stateManager.getStateStats();
            const erData = await this.stateManager.getERDiagramData();

            const statusInfo = {
                workspace: stateStats.workspacePath || '未打开工作空间',
                lastScan: stateStats.lastScanTime || '从未扫描',
                cacheValid: stateStats.cacheValid ? '有效' : '无效',
                hasERData: stateStats.hasERData ? '是' : '否',
                entitiesCount: erData?.entities.length || 0,
                relationsCount: erData?.relations.length || 0,
                configValid: configSummary.valid ? '有效' : '无效',
                enabledStrategies: configSummary.enabledStrategies.join(', ') || '无'
            };

            const message = `
MyBatis ER Generator 状态信息：

工作空间: ${statusInfo.workspace}
最后扫描: ${statusInfo.lastScan}
缓存状态: ${statusInfo.cacheValid}
ER图数据: ${statusInfo.hasERData}
实体数量: ${statusInfo.entitiesCount}
关系数量: ${statusInfo.relationsCount}
配置状态: ${statusInfo.configValid}
启用策略: ${statusInfo.enabledStrategies}
            `.trim();

            await vscode.window.showInformationMessage(message, { modal: true });
            Logger.info('显示状态信息', statusInfo);

        } catch (error) {
            Logger.error('显示状态信息失败', error as Error);
            vscode.window.showErrorMessage(`显示状态信息失败: ${error}`);
        }
    }

    /**
     * 清除缓存命令处理
     */
    async handleClearCache(): Promise<void> {
        try {
            const result = await vscode.window.showWarningMessage(
                '确定要清除所有缓存数据吗？这将删除已保存的ER图数据。',
                '确定', '取消'
            );

            if (result === '确定') {
                await this.stateManager.resetWorkspaceState();
                vscode.window.showInformationMessage('缓存已清除');
                Logger.info('用户手动清除了缓存');
            }
        } catch (error) {
            Logger.error('清除缓存失败', error as Error);
            vscode.window.showErrorMessage(`清除缓存失败: ${error}`);
        }
    }

    /**
     * 测试WebView界面 - 加载示例数据
     */
    async handleTestWebView(): Promise<void> {
        try {
            Logger.info('加载测试数据到WebView');
            
            // 生成Mermaid代码
            const mermaidCode = this.mermaidGenerator.generateERDiagram(testERData);
            
            // 发送到WebView
            this.webviewProvider.updateDiagram(testERData);
            
            vscode.window.showInformationMessage('测试数据已加载到ER图视图！');
        } catch (error) {
            Logger.error('加载测试数据失败', error as Error);
            vscode.window.showErrorMessage(`加载测试数据失败: ${error}`);
        }
    }

    /**
     * 运行性能基准测试
     */
    async handlePerformanceBenchmark(): Promise<void> {
        try {
            Logger.info('开始运行性能基准测试');
            
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "正在运行性能基准测试...",
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0, message: "初始化测试环境..." });
                
                const tester = PerformanceTester.getInstance();
                
                progress.report({ increment: 30, message: "运行基准测试套件..." });
                const report = await tester.runBenchmarkSuite();
                
                progress.report({ increment: 100, message: "测试完成" });
                
                // 显示测试报告
                await tester.showPerformanceReport();
            });
            
            Logger.info('性能基准测试完成');
        } catch (error) {
            Logger.error('性能基准测试失败', error as Error);
            vscode.window.showErrorMessage(`性能基准测试失败: ${error}`);
        }
    }
} 