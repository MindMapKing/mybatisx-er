import * as vscode from 'vscode';
import { Logger } from './logger';
import { ConfigOptions } from '../types';

/**
 * 配置管理器
 * 负责读取VS Code配置、扩展配置，并提供配置变更监听
 */
export class ConfigManager {
    private static instance: ConfigManager;
    private configChangeListeners: Array<(config: ConfigOptions) => void> = [];

    private constructor() {
        // 监听配置变更
        vscode.workspace.onDidChangeConfiguration(this.onConfigurationChanged.bind(this));
        Logger.info('配置管理器已初始化');
    }

    /**
     * 获取配置管理器实例
     */
    static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    /**
     * 获取扩展配置
     */
    getExtensionConfig(): ConfigOptions {
        const config = vscode.workspace.getConfiguration('mybatis-er');
        
        return {
            autoRefresh: config.get<boolean>('autoRefresh', true),
            includeTestFiles: config.get<boolean>('includeTestFiles', false),
            inferenceStrategies: config.get('inferenceStrategies', {
                naming: true,
                xml: true,
                annotation: true,
                semantic: true
            }),
            theme: config.get<'auto' | 'light' | 'dark'>('theme', 'auto'),
            exportFormat: config.get<'png' | 'svg' | 'pdf' | 'mermaid'>('exportFormat', 'png'),
            execution: config.get('execution', {
                useWorkerThreads: false,  // 默认关闭Worker线程
                useMainThreadSerial: true, // 默认使用主线程串行
                maxConcurrency: 2,
                batchSize: 5,
                timeout: 15000
            })
        };
    }

    /**
     * 更新扩展配置
     */
    async updateExtensionConfig(key: string, value: any, target?: vscode.ConfigurationTarget): Promise<void> {
        try {
            const config = vscode.workspace.getConfiguration('mybatis-er');
            await config.update(key, value, target || vscode.ConfigurationTarget.Workspace);
            Logger.info(`配置已更新: ${key} = ${JSON.stringify(value)}`);
        } catch (error) {
            Logger.error(`更新配置失败: ${key}`, error as Error);
            throw error;
        }
    }

    /**
     * 获取工作空间配置
     */
    getWorkspaceConfig() {
        return {
            // Java相关配置
            javaHome: this.getJavaConfig('home'),
            javaSourcePaths: this.getJavaConfig('sourcePaths', []),
            
            // 文件扫描配置
            includePatterns: this.getFileConfig('include', ['**/*.java', '**/*.xml']),
            excludePatterns: this.getFileConfig('exclude', [
                '**/node_modules/**',
                '**/target/**',
                '**/build/**',
                '**/.git/**'
            ]),
            
            // 编辑器配置
            tabSize: this.getEditorConfig('tabSize', 4),
            insertSpaces: this.getEditorConfig('insertSpaces', true),
            
            // 搜索配置
            searchMaxResults: this.getSearchConfig('maxResults', 1000),
            searchTimeout: this.getSearchConfig('timeout', 10000)
        };
    }

    /**
     * 获取Java相关配置
     */
    private getJavaConfig(key: string, defaultValue?: any): any {
        const config = vscode.workspace.getConfiguration('java');
        return config.get(key, defaultValue);
    }

    /**
     * 获取文件相关配置
     */
    private getFileConfig(key: string, defaultValue?: any): any {
        const config = vscode.workspace.getConfiguration('files');
        return config.get(key, defaultValue);
    }

    /**
     * 获取编辑器配置
     */
    private getEditorConfig(key: string, defaultValue?: any): any {
        const config = vscode.workspace.getConfiguration('editor');
        return config.get(key, defaultValue);
    }

    /**
     * 获取搜索配置
     */
    private getSearchConfig(key: string, defaultValue?: any): any {
        const config = vscode.workspace.getConfiguration('search');
        return config.get(key, defaultValue);
    }

    /**
     * 获取MyBatis特定配置
     */
    getMyBatisConfig() {
        const config = vscode.workspace.getConfiguration('mybatis-er');
        
        return {
            // 解析配置
            parseTimeout: config.get<number>('parseTimeout', 30000),
            maxFileSize: config.get<number>('maxFileSize', 10 * 1024 * 1024), // 10MB
            
            // 推断配置
            inferenceTimeout: config.get<number>('inferenceTimeout', 10000),
            minConfidence: config.get<number>('minConfidence', 0.6),
            
            // 缓存配置
            cacheEnabled: config.get<boolean>('cacheEnabled', true),
            cacheMaxAge: config.get<number>('cacheMaxAge', 5 * 60 * 1000), // 5分钟
            
            // UI配置
            maxEntitiesInView: config.get<number>('maxEntitiesInView', 500),
            animationEnabled: config.get<boolean>('animationEnabled', true),
            
            // 导出配置
            exportPath: config.get<string>('exportPath', ''),
            exportQuality: config.get<number>('exportQuality', 1.0)
        };
    }

    /**
     * 获取性能相关配置
     */
    getPerformanceConfig() {
        const config = vscode.workspace.getConfiguration('mybatis-er');
        
        return {
            // Worker配置
            maxWorkers: config.get<number>('maxWorkers', Math.max(2, Math.floor(require('os').cpus().length / 2))),
            workerTimeout: config.get<number>('workerTimeout', 30000),
            
            // 内存配置
            maxMemoryUsage: config.get<number>('maxMemoryUsage', 100 * 1024 * 1024), // 100MB
            gcThreshold: config.get<number>('gcThreshold', 0.8),
            
            // 并发配置
            maxConcurrentParsing: config.get<number>('maxConcurrentParsing', 4),
            batchSize: config.get<number>('batchSize', 50),
            
            // 调试配置
            enableProfiling: config.get<boolean>('enableProfiling', false),
            logLevel: config.get<string>('logLevel', 'info')
        };
    }

    /**
     * 检查配置有效性
     */
    validateConfig(): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        const config = this.getExtensionConfig();
        const myBatisConfig = this.getMyBatisConfig();
        const performanceConfig = this.getPerformanceConfig();

        // 验证基础配置
        if (typeof config.autoRefresh !== 'boolean') {
            errors.push('autoRefresh必须是布尔值');
        }

        if (!['auto', 'light', 'dark'].includes(config.theme)) {
            errors.push('theme必须是auto、light或dark之一');
        }

        if (!['png', 'svg', 'pdf', 'mermaid'].includes(config.exportFormat)) {
            errors.push('exportFormat必须是png、svg、pdf或mermaid之一');
        }

        // 验证推断策略
        const strategies = config.inferenceStrategies;
        if (typeof strategies !== 'object' || strategies === null) {
            errors.push('inferenceStrategies必须是对象');
        } else {
            const requiredKeys = ['naming', 'xml', 'annotation', 'semantic'];
            for (const key of requiredKeys) {
                if (typeof strategies[key as keyof typeof strategies] !== 'boolean') {
                    errors.push(`inferenceStrategies.${key}必须是布尔值`);
                }
            }
        }

        // 验证性能配置
        if (performanceConfig.maxWorkers < 1 || performanceConfig.maxWorkers > 16) {
            errors.push('maxWorkers必须在1-16之间');
        }

        if (myBatisConfig.minConfidence < 0 || myBatisConfig.minConfidence > 1) {
            errors.push('minConfidence必须在0-1之间');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * 重置配置为默认值
     */
    async resetToDefaults(): Promise<void> {
        try {
            const config = vscode.workspace.getConfiguration('mybatis-er');
            const keys = [
                'autoRefresh',
                'inferenceStrategies',
                'theme',
                'exportFormat',
                'parseTimeout',
                'maxFileSize',
                'inferenceTimeout',
                'minConfidence',
                'cacheEnabled',
                'cacheMaxAge',
                'maxEntitiesInView',
                'animationEnabled'
            ];

            for (const key of keys) {
                await config.update(key, undefined, vscode.ConfigurationTarget.Workspace);
            }

            Logger.info('配置已重置为默认值');
        } catch (error) {
            Logger.error('重置配置失败', error as Error);
            throw error;
        }
    }

    /**
     * 导出配置
     */
    exportConfig(): any {
        return {
            extension: this.getExtensionConfig(),
            workspace: this.getWorkspaceConfig(),
            mybatis: this.getMyBatisConfig(),
            performance: this.getPerformanceConfig(),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 导入配置
     */
    async importConfig(configData: any): Promise<void> {
        try {
            if (!configData.extension) {
                throw new Error('无效的配置数据');
            }

            const extensionConfig = configData.extension;
            const config = vscode.workspace.getConfiguration('mybatis-er');

            // 导入扩展配置
            for (const [key, value] of Object.entries(extensionConfig)) {
                await config.update(key, value, vscode.ConfigurationTarget.Workspace);
            }

            Logger.info('配置导入成功');
        } catch (error) {
            Logger.error('导入配置失败', error as Error);
            throw error;
        }
    }

    /**
     * 添加配置变更监听器
     */
    onConfigChanged(listener: (config: ConfigOptions) => void): vscode.Disposable {
        this.configChangeListeners.push(listener);
        
        return new vscode.Disposable(() => {
            const index = this.configChangeListeners.indexOf(listener);
            if (index >= 0) {
                this.configChangeListeners.splice(index, 1);
            }
        });
    }

    /**
     * 配置变更事件处理
     */
    private onConfigurationChanged(event: vscode.ConfigurationChangeEvent): void {
        if (event.affectsConfiguration('mybatis-er')) {
            const newConfig = this.getExtensionConfig();
            Logger.info('配置已变更', newConfig);
            
            // 通知所有监听器
            this.configChangeListeners.forEach(listener => {
                try {
                    listener(newConfig);
                } catch (error) {
                    Logger.error('配置变更监听器执行失败', error as Error);
                }
            });
        }
    }

    /**
     * 获取配置摘要信息
     */
    getConfigSummary(): any {
        const validation = this.validateConfig();
        const extensionConfig = this.getExtensionConfig();
        const performanceConfig = this.getPerformanceConfig();
        
        return {
            valid: validation.valid,
            errors: validation.errors,
            autoRefresh: extensionConfig.autoRefresh,
            enabledStrategies: Object.entries(extensionConfig.inferenceStrategies)
                .filter(([_, enabled]) => enabled)
                .map(([strategy, _]) => strategy),
            theme: extensionConfig.theme,
            maxWorkers: performanceConfig.maxWorkers,
            cacheEnabled: this.getMyBatisConfig().cacheEnabled
        };
    }
} 