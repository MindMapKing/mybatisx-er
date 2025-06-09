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
    private isProcessing: boolean = false;

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
        const javaParseResults = await this.batchProcessJavaFiles(scanResult.javaFiles.filter(f => f.isEntity), progress, token, 20, 25);
        
        progress.report({ increment: 25, message: "解析XML映射文件..." });

        // 解析XML映射文件
        const xmlParseResults = await this.batchProcessXmlFiles(scanResult.xmlFiles.filter(f => f.isMapper), progress, token, 25, 25);

        progress.report({ increment: 25, message: "推断实体关系..." });

        if (token.isCancellationRequested) {
            throw new Error('用户取消了操作');
        }

        // 推断实体关系
        const relationResult = await this.performRelationInference(javaParseResults, xmlParseResults, token);

        progress.report({ increment: 20, message: "生成ER图..." });

        if (token.isCancellationRequested) {
            throw new Error('用户取消了操作');
        }

        // 生成ER图
        const diagramResult = await this.generateERDiagramData(javaParseResults, xmlParseResults, relationResult);

        // 保存ER图数据
        const erData = {
            entities: diagramResult.entities,
            relations: diagramResult.relations,
            mermaidCode: diagramResult.mermaidCode,
            metadata: diagramResult.metadata,
            generatedAt: new Date(),
            projectPath: this.stateManager.getCurrentWorkspacePath() || ''
        };
        await this.stateManager.saveERDiagramData(erData);

        // 更新WebView显示
        this.webviewProvider.updateDiagram(erData);

        progress.report({ increment: 10, message: "完成" });
        
        Logger.info('ER图生成完成', {
            entityCount: diagramResult.entities.length,
            relationCount: diagramResult.relations.length,
            scanStats: scanResult.stats
        });
    }

    /**
     * 新增：批量处理Java文件
     */
    private async batchProcessJavaFiles(
        javaFiles: any[],
        progress: vscode.Progress<{ increment?: number; message?: string }>,
        token: vscode.CancellationToken,
        startProgress: number,
        progressRange: number
    ): Promise<any[]> {
        if (javaFiles.length === 0) {
            return [];
        }
        
        const results: any[] = [];
        // 进一步减少批次大小，避免超时
        const batchSize = Math.min(3, Math.max(1, Math.floor(javaFiles.length / 4))); 
        const batches = this.chunkArray(javaFiles, batchSize);
        
        Logger.info(`批量处理Java文件: ${javaFiles.length}个文件，${batches.length}个批次`);
        
        for (let i = 0; i < batches.length; i++) {
            if (token.isCancellationRequested) {
                throw new Error('用户取消了操作');
            }
            
            const batch = batches[i];
            const batchProgress = startProgress + (i * progressRange / batches.length);
            
            progress.report({ 
                increment: batchProgress, 
                message: `处理Java文件批次 ${i + 1}/${batches.length} (${batch.length}个文件)` 
            });
            
            try {
                // 准备批量数据
                const batchData = await Promise.all(
                    batch.map(async (file: any) => ({
                        filePath: file.filePath,
                        content: await this.fileScanner.getFileContent(file.filePath),
                        fileType: 'java' as const,
                        options: { parseMethodBodies: false }
                    }))
                );
                
                // 提交批量任务 - 大幅减少超时时间
                const batchResult = await this.workerManager.submitTask(
                    WorkerMessageType.PARSE_BATCH_FILES,
                    { files: batchData },
                    { 
                        timeout: Math.min(8000, 3000 * batch.length), // 减少到8秒最大，每个文件3秒
                        maxRetries: 1 
                    }
                );
                
                if (Array.isArray(batchResult)) {
                    results.push(...batchResult);
                } else {
                    results.push(batchResult);
                }
                
                Logger.debug(`批次 ${i + 1} 处理完成，解析了 ${batch.length} 个文件`);
                
            } catch (error) {
                Logger.warn(`批量处理Java文件失败，尝试降级处理`, error as Error);
                
                // 降级到逐个同步处理
                for (const file of batch) {
                    try {
                        const content = await this.fileScanner.getFileContent(file.filePath);
                        const syncResult = await this.parseJavaFileSync({
                            filePath: file.filePath,
                            content,
                            fileType: 'java',
                            options: { parseMethodBodies: false }
                        });
                        results.push(syncResult);
                    } catch (syncError) {
                        Logger.warn(`同步解析失败: ${file.filePath}`, syncError as Error);
                        // 继续处理其他文件
                    }
                }
            }
            
            // 增加延迟避免过载
            if (i < batches.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        return results;
    }
    
    /**
     * 新增：批量处理XML文件
     */
    private async batchProcessXmlFiles(
        xmlFiles: any[],
        progress: vscode.Progress<{ increment?: number; message?: string }>,
        token: vscode.CancellationToken,
        startProgress: number,
        progressRange: number
    ): Promise<any[]> {
        if (xmlFiles.length === 0) {
            return [];
        }
        
        const results: any[] = [];
        // 进一步减少批次大小
        const batchSize = Math.min(4, Math.max(1, Math.floor(xmlFiles.length / 3))); 
        const batches = this.chunkArray(xmlFiles, batchSize);
        
        Logger.info(`批量处理XML文件: ${xmlFiles.length}个文件，${batches.length}个批次`);
        
        for (let i = 0; i < batches.length; i++) {
            if (token.isCancellationRequested) {
                throw new Error('用户取消了操作');
            }
            
            const batch = batches[i];
            const batchProgress = startProgress + (i * progressRange / batches.length);
            
            progress.report({ 
                increment: batchProgress, 
                message: `处理XML文件批次 ${i + 1}/${batches.length} (${batch.length}个文件)` 
            });
            
            try {
                // 准备批量数据
                const batchData = await Promise.all(
                    batch.map(async (file: any) => ({
                        filePath: file.filePath,
                        content: await this.fileScanner.getFileContent(file.filePath),
                        fileType: 'xml' as const
                    }))
                );
                
                // 提交批量任务 - 减少超时时间
                const batchResult = await this.workerManager.submitTask(
                    WorkerMessageType.PARSE_BATCH_FILES,
                    { files: batchData },
                    { 
                        timeout: Math.min(6000, 2000 * batch.length), // 减少到6秒最大，每个文件2秒
                        maxRetries: 1 
                    }
                );
                
                if (Array.isArray(batchResult)) {
                    results.push(...batchResult);
                } else {
                    results.push(batchResult);
                }
                
                Logger.debug(`XML批次 ${i + 1} 处理完成，解析了 ${batch.length} 个文件`);
                
            } catch (error) {
                Logger.warn(`批量处理XML文件失败，尝试降级处理`, error as Error);
                
                // 降级到逐个同步处理
                for (const file of batch) {
                    try {
                        const content = await this.fileScanner.getFileContent(file.filePath);
                        const syncResult = await this.parseXmlFileSync({
                            filePath: file.filePath,
                            content,
                            fileType: 'xml'
                        });
                        results.push(syncResult);
                    } catch (syncError) {
                        Logger.warn(`同步解析XML失败: ${file.filePath}`, syncError as Error);
                        // 继续处理其他文件
                    }
                }
            }
            
            // 增加延迟避免过载
            if (i < batches.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 80));
            }
        }
        
        return results;
    }
    
    /**
     * 新增：执行关系推断
     */
    private async performRelationInference(
        javaResults: any[],
        xmlResults: any[],
        token: vscode.CancellationToken
    ): Promise<any> {
        if (token.isCancellationRequested) {
            throw new Error('用户取消了操作');
        }
        
        try {
            // 转换配置格式
            const configStrategies = this.configManager.getExtensionConfig().inferenceStrategies;
            const strategies = [
                { name: 'naming-convention', weight: 0.8, enabled: configStrategies.naming, minConfidence: 0.6 },
                { name: 'annotation-based', weight: 0.9, enabled: configStrategies.annotation, minConfidence: 0.7 },
                { name: 'xml-mapping', weight: 0.85, enabled: configStrategies.xml, minConfidence: 0.75 },
                { name: 'field-type-analysis', weight: 0.7, enabled: configStrategies.semantic, minConfidence: 0.5 }
            ];
            
            // 使用单个任务进行关系推断，避免创建多个Worker
            const relationResult = await this.workerManager.submitTask(
                WorkerMessageType.INFER_RELATIONS,
                {
                    entities: javaResults.filter(r => r && r.success !== false),
                    mappings: xmlResults.filter(r => r && r.success !== false),
                    strategies
                },
                { 
                    timeout: 15000, // 关系推断可能需要更长时间
                    maxRetries: 1 
                }
            );
            
            return relationResult;
            
        } catch (error) {
            Logger.warn('Worker关系推断失败，尝试同步推断', error as Error);
            
            // 降级到同步关系推断
            return this.performRelationInferenceSync(javaResults, xmlResults);
        }
    }
    
    /**
     * 新增：生成ER图数据
     */
    private async generateERDiagramData(
        javaResults: any[],
        xmlResults: any[],
        relationResults: any
    ): Promise<any> {
        // 整合所有解析结果
        const entities = javaResults.filter(r => r && r.success !== false);
        const mappings = xmlResults.filter(r => r && r.success !== false);
        const relations = relationResults?.relations || [];
        
        // 生成Mermaid ER图代码
        const mermaidCode = this.mermaidGenerator.generateERDiagram({
            entities,
            relations,
            generatedAt: new Date(),
            projectPath: this.stateManager.getCurrentWorkspacePath() || ''
        });
        
        return {
            entities,
            relations,
            mermaidCode,
            metadata: {
                generatedAt: new Date().toISOString(),
                totalEntities: entities.length,
                totalRelations: relations.length,
                confidence: relationResults?.confidence || 0,
                processingStats: {
                    javaFiles: javaResults.length,
                    xmlFiles: xmlResults.length,
                    workerStats: this.workerManager.getStats()
                }
            }
        };
    }
    
    /**
     * 新增：同步Java文件解析（降级方案）
     */
    private async parseJavaFileSync(fileData: any): Promise<any> {
        try {
            // 简化的同步解析逻辑
            const { SmartJavaParser } = await import('../parsers/java-parser');
            const parser = new SmartJavaParser();
            return await parser.parseJavaFile(fileData.filePath, fileData.content);
        } catch (error) {
            Logger.warn(`同步Java解析失败: ${fileData.filePath}`, error as Error);
            return {
                filePath: fileData.filePath,
                error: (error as Error).message,
                success: false
            };
        }
    }
    
    /**
     * 新增：同步XML文件解析（降级方案）
     */
    private async parseXmlFileSync(fileData: any): Promise<any> {
        try {
            // 简化的同步解析逻辑
            const { SmartXmlParser } = await import('../parsers/xml-parser');
            const parser = new SmartXmlParser();
            return await parser.parseXmlFile(fileData.filePath, fileData.content);
        } catch (error) {
            Logger.warn(`同步XML解析失败: ${fileData.filePath}`, error as Error);
            return {
                filePath: fileData.filePath,
                error: (error as Error).message,
                success: false
            };
        }
    }
    
    /**
     * 新增：同步关系推断（降级方案）
     */
    private async performRelationInferenceSync(javaResults: any[], xmlResults: any[]): Promise<any> {
        try {
            const { RelationInferenceEngine } = await import('../parsers/relation-inference');
            const engine = new RelationInferenceEngine();
            
            const entities = javaResults.filter(r => r && r.success !== false);
            const mappings = xmlResults.filter(r => r && r.success !== false);
            
            // 转换配置格式
            const configStrategies = this.configManager.getExtensionConfig().inferenceStrategies;
            const strategies = [
                { name: 'naming-convention', weight: 0.8, enabled: configStrategies.naming, minConfidence: 0.6 },
                { name: 'annotation-based', weight: 0.9, enabled: configStrategies.annotation, minConfidence: 0.7 },
                { name: 'xml-mapping', weight: 0.85, enabled: configStrategies.xml, minConfidence: 0.75 },
                { name: 'field-type-analysis', weight: 0.7, enabled: configStrategies.semantic, minConfidence: 0.5 }
            ];
            
            return await engine.inferRelations(entities, mappings, {
                strategies
            });
        } catch (error) {
            Logger.warn('同步关系推断失败', error as Error);
            return {
                relations: [],
                confidence: 0,
                error: (error as Error).message
            };
        }
    }
    
    /**
     * 新增：数组分块工具方法
     */
    private chunkArray<T>(array: T[], chunkSize: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }

    /**
     * 刷新ER图命令处理 - 优化版本
     */
    async handleRefreshERDiagram(): Promise<void> {
        if (this.isProcessing) {
            vscode.window.showWarningMessage('ER图生成正在进行中，请稍候...');
            return;
        }
        
        try {
            // 清除缓存并重新生成
            await this.stateManager.clearERDiagramData();
            await this.stateManager.cleanExpiredCache();
            await this.handleGenerateERDiagram();
        } catch (error) {
            Logger.error('刷新ER图失败', error as Error);
            vscode.window.showErrorMessage(`刷新ER图失败: ${error}`);
        }
    }

    /**
     * 显示状态命令处理 - 增强版本
     */
    async handleShowStatus(): Promise<void> {
        try {
            const workerStats = this.workerManager.getStats();
            const healthStatus = this.workerManager.getHealthStatus();
            const stateStats = this.stateManager.getStateStats();
            const configSummary = this.configManager.getConfigSummary();
            const memUsage = process.memoryUsage();
            
            const statusInfo = {
                '🔧 Worker状态': {
                    '活跃Worker': `${workerStats.activeWorkers}/${workerStats.activeWorkers + workerStats.idleWorkers}`,
                    '队列任务': workerStats.queuedTasks,
                    '处理中任务': workerStats.processingTasks,
                    '已完成任务': workerStats.totalProcessedTasks,
                    '平均队列时间': `${workerStats.averageQueueTime}ms`
                },
                '💾 内存使用': {
                    '堆内存': `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
                    '总内存': `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
                    '外部内存': `${Math.round(memUsage.external / 1024 / 1024)}MB`
                },
                '🏥 健康状态': {
                    '状态': healthStatus.healthy ? '✅ 健康' : '⚠️ 异常',
                    '问题': healthStatus.issues.length > 0 ? healthStatus.issues.join(', ') : '无',
                    '建议': healthStatus.recommendations.length > 0 ? healthStatus.recommendations.join(', ') : '无'
                },
                '📊 缓存状态': stateStats,
                '⚙️ 配置': configSummary
            };
            
            // 格式化状态信息
            const statusText = Object.entries(statusInfo)
                .map(([category, data]) => {
                    const items = Object.entries(data)
                        .map(([key, value]) => `  ${key}: ${value}`)
                        .join('\n');
                    return `${category}\n${items}`;
                })
                .join('\n\n');
            
            // 显示状态信息
            const action = await vscode.window.showInformationMessage(
                'MyBatis ER Generator 状态信息',
                { modal: true, detail: statusText },
                '复制到剪贴板', '清理缓存', '重启Worker'
            );
            
            if (action === '复制到剪贴板') {
                await vscode.env.clipboard.writeText(statusText);
                vscode.window.showInformationMessage('状态信息已复制到剪贴板');
            } else if (action === '清理缓存') {
                await this.handleClearCache();
            } else if (action === '重启Worker') {
                await this.restartWorkerManager();
            }
            
        } catch (error) {
            Logger.error('获取状态信息失败', error as Error);
            vscode.window.showErrorMessage(`获取状态信息失败: ${error}`);
        }
    }
    
    /**
     * 新增：重启Worker管理器
     */
    private async restartWorkerManager(): Promise<void> {
        try {
            vscode.window.showInformationMessage('正在重启Worker管理器...');
            
            await this.workerManager.shutdown();
            
            // 重新创建Worker管理器
            const workerConfig = this.getOptimizedWorkerConfig();
            this.workerManager = new WorkerManager(workerConfig);
            
            await this.workerManager.start();
            
            vscode.window.showInformationMessage('Worker管理器重启完成');
            Logger.info('Worker管理器重启完成');
            
        } catch (error) {
            Logger.error('重启Worker管理器失败', error as Error);
            vscode.window.showErrorMessage(`重启Worker管理器失败: ${error}`);
        }
    }

    /**
     * 获取优化的Worker配置
     */
    private getOptimizedWorkerConfig(): any {
        const cpuCount = require('os').cpus().length;
        return {
            maxWorkers: Math.min(cpuCount, 6), // 进一步减少到最多6个Worker
            workerTimeout: 10000, // 进一步减少到10秒
            maxQueueSize: 30, // 进一步减少队列大小
            heartbeatInterval: 2000, // 更频繁的心跳检测
            maxRetries: 1, // 只重试1次
            enableProfiling: false
        };
    }

    /**
     * 清除缓存命令处理 - 增强版本
     */
    async handleClearCache(): Promise<void> {
        try {
            const result = await vscode.window.showWarningMessage(
                '确定要清除所有缓存吗？这将删除已解析的数据。',
                '确定', '取消'
            );
            
            if (result === '确定') {
                // 清除ER图数据和过期缓存
                await this.stateManager.clearERDiagramData();
                await this.stateManager.cleanExpiredCache();
                
                // 同时清理Worker状态
                const workerStats = this.workerManager.getStats();
                if (workerStats.activeWorkers > 0) {
                    Logger.info('清理Worker状态');
                    // 可以选择重启Worker管理器来彻底清理
                }
                
                vscode.window.showInformationMessage('缓存已清除');
                Logger.info('用户手动清除缓存');
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

    /**
     * 简单的扩展功能测试
     */
    async handleSimpleTest(): Promise<void> {
        try {
            Logger.info('开始简单功能测试');
            
            // 测试Worker管理器
            const workerStats = this.workerManager.getStats();
            Logger.info('Worker状态', workerStats);
            
            // 测试状态管理器
            const stateStats = this.stateManager.getStateStats();
            Logger.info('状态管理器', stateStats);
            
            // 测试配置管理器
            const configSummary = this.configManager.getConfigSummary();
            Logger.info('配置管理器', configSummary);
            
            // 显示测试结果
            vscode.window.showInformationMessage(
                `扩展功能测试完成！\n` +
                `Worker状态: ${workerStats.activeWorkers + workerStats.idleWorkers}个Worker\n` +
                `配置状态: 正常\n` +
                `状态管理: 正常`
            );
            
            Logger.info('简单功能测试完成');
            
        } catch (error) {
            Logger.error('简单功能测试失败', error as Error);
            vscode.window.showErrorMessage(`功能测试失败: ${error}`);
        }
    }
}