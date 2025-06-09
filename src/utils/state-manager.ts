import * as vscode from 'vscode';
import { Logger } from './logger';
import { ERDiagramData, ConfigOptions } from '../types';

/**
 * 扩展状态管理器
 * 负责管理扩展的全局状态、工作空间状态和持久化数据
 */
export class StateManager {
    private static instance: StateManager;
    private context: vscode.ExtensionContext;
    private workspaceState: vscode.Memento;
    private globalState: vscode.Memento;

    // 状态键常量
    private static readonly KEYS = {
        ER_DIAGRAM_DATA: 'erDiagramData',
        LAST_SCAN_TIME: 'lastScanTime',
        PROJECT_CONFIG: 'projectConfig',
        CACHE_VERSION: 'cacheVersion',
        WORKSPACE_ENTITIES: 'workspaceEntities',
        INFERENCE_CACHE: 'inferenceCache'
    };

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.workspaceState = context.workspaceState;
        this.globalState = context.globalState;
        Logger.info('状态管理器已初始化');
    }

    /**
     * 初始化状态管理器
     */
    static initialize(context: vscode.ExtensionContext): StateManager {
        if (!StateManager.instance) {
            StateManager.instance = new StateManager(context);
        }
        return StateManager.instance;
    }

    /**
     * 获取状态管理器实例
     */
    static getInstance(): StateManager {
        if (!StateManager.instance) {
            throw new Error('StateManager未初始化，请先调用initialize()');
        }
        return StateManager.instance;
    }

    // ==================== ER图数据管理 ====================

    /**
     * 保存ER图数据
     */
    async saveERDiagramData(data: ERDiagramData): Promise<void> {
        try {
            await this.workspaceState.update(StateManager.KEYS.ER_DIAGRAM_DATA, {
                ...data,
                generatedAt: data.generatedAt.toISOString()
            });
            await this.workspaceState.update(StateManager.KEYS.LAST_SCAN_TIME, Date.now());
            Logger.info(`ER图数据已保存，包含${data.entities.length}个实体，${data.relations.length}个关系`);
        } catch (error) {
            Logger.error('保存ER图数据失败', error as Error);
            throw error;
        }
    }

    /**
     * 获取ER图数据
     */
    async getERDiagramData(): Promise<ERDiagramData | undefined> {
        try {
            const data = this.workspaceState.get<any>(StateManager.KEYS.ER_DIAGRAM_DATA);
            if (!data) {
                return undefined;
            }

            // 转换日期字符串回Date对象
            return {
                ...data,
                generatedAt: new Date(data.generatedAt)
            };
        } catch (error) {
            Logger.error('获取ER图数据失败', error as Error);
            return undefined;
        }
    }

    /**
     * 清除ER图数据
     */
    async clearERDiagramData(): Promise<void> {
        try {
            await this.workspaceState.update(StateManager.KEYS.ER_DIAGRAM_DATA, undefined);
            await this.workspaceState.update(StateManager.KEYS.LAST_SCAN_TIME, undefined);
            Logger.info('ER图数据已清除');
        } catch (error) {
            Logger.error('清除ER图数据失败', error as Error);
            throw error;
        }
    }

    // ==================== 项目配置管理 ====================

    /**
     * 保存项目配置
     */
    async saveProjectConfig(config: Partial<ConfigOptions>): Promise<void> {
        try {
            const currentConfig = await this.getProjectConfig();
            const newConfig = { ...currentConfig, ...config };
            await this.workspaceState.update(StateManager.KEYS.PROJECT_CONFIG, newConfig);
            Logger.info('项目配置已保存', newConfig);
        } catch (error) {
            Logger.error('保存项目配置失败', error as Error);
            throw error;
        }
    }

    /**
     * 获取项目配置
     */
    async getProjectConfig(): Promise<ConfigOptions> {
        try {
            const config = this.workspaceState.get<ConfigOptions>(StateManager.KEYS.PROJECT_CONFIG);
            
            // 返回默认配置合并用户配置
            return {
                autoRefresh: true,
                inferenceStrategies: {
                    naming: true,
                    xml: true,
                    annotation: true,
                    semantic: true
                },
                theme: 'auto',
                exportFormat: 'png',
                ...config
            };
        } catch (error) {
            Logger.error('获取项目配置失败', error as Error);
            // 返回默认配置
            return {
                autoRefresh: true,
                inferenceStrategies: {
                    naming: true,
                    xml: true,
                    annotation: true,
                    semantic: true
                },
                theme: 'auto',
                exportFormat: 'png'
            };
        }
    }

    // ==================== 缓存管理 ====================

    /**
     * 获取最后扫描时间
     */
    getLastScanTime(): number | undefined {
        return this.workspaceState.get<number>(StateManager.KEYS.LAST_SCAN_TIME);
    }

    /**
     * 检查缓存是否有效
     */
    isCacheValid(maxAge: number = 5 * 60 * 1000): boolean {
        const lastScanTime = this.getLastScanTime();
        if (!lastScanTime) {
            return false;
        }
        return Date.now() - lastScanTime < maxAge;
    }

    /**
     * 保存实体缓存
     */
    async saveEntityCache(filePath: string, entityData: any): Promise<void> {
        try {
            const cache = this.workspaceState.get<Record<string, any>>(StateManager.KEYS.WORKSPACE_ENTITIES) || {};
            cache[filePath] = {
                data: entityData,
                timestamp: Date.now()
            };
            await this.workspaceState.update(StateManager.KEYS.WORKSPACE_ENTITIES, cache);
        } catch (error) {
            Logger.error('保存实体缓存失败', error as Error);
        }
    }

    /**
     * 获取实体缓存
     */
    getEntityCache(filePath: string): any | undefined {
        try {
            const cache = this.workspaceState.get<Record<string, any>>(StateManager.KEYS.WORKSPACE_ENTITIES) || {};
            const entityCache = cache[filePath];
            
            if (!entityCache) {
                return undefined;
            }

            // 检查缓存是否过期 (5分钟)
            if (Date.now() - entityCache.timestamp > 5 * 60 * 1000) {
                return undefined;
            }

            return entityCache.data;
        } catch (error) {
            Logger.error('获取实体缓存失败', error as Error);
            return undefined;
        }
    }

    /**
     * 清除过期缓存
     */
    async cleanExpiredCache(): Promise<void> {
        try {
            const cache = this.workspaceState.get<Record<string, any>>(StateManager.KEYS.WORKSPACE_ENTITIES) || {};
            const now = Date.now();
            const maxAge = 5 * 60 * 1000; // 5分钟

            const cleanedCache: Record<string, any> = {};
            let removedCount = 0;

            for (const [filePath, entityCache] of Object.entries(cache)) {
                if (now - entityCache.timestamp <= maxAge) {
                    cleanedCache[filePath] = entityCache;
                } else {
                    removedCount++;
                }
            }

            if (removedCount > 0) {
                await this.workspaceState.update(StateManager.KEYS.WORKSPACE_ENTITIES, cleanedCache);
                Logger.info(`清除了${removedCount}个过期缓存项`);
            }
        } catch (error) {
            Logger.error('清除过期缓存失败', error as Error);
        }
    }

    // ==================== 工作空间状态 ====================

    /**
     * 获取当前工作空间路径
     */
    getCurrentWorkspacePath(): string | undefined {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        return workspaceFolders?.[0]?.uri.fsPath;
    }

    /**
     * 检查是否为MyBatis项目
     */
    async isMyBatisProject(): Promise<boolean> {
        const workspacePath = this.getCurrentWorkspacePath();
        if (!workspacePath) {
            return false;
        }

        try {
            // 检查是否存在MyBatis相关文件
            const files = await vscode.workspace.findFiles(
                '**/{*.xml,pom.xml,build.gradle,application.yml,application.properties}',
                '**/node_modules/**',
                10
            );

            // 简单检查是否包含MyBatis相关内容
            for (const file of files) {
                const content = await vscode.workspace.fs.readFile(file);
                const text = Buffer.from(content).toString('utf8');
                
                if (text.includes('mybatis') || 
                    text.includes('MyBatis') || 
                    text.includes('mybatis-plus') ||
                    text.includes('com.baomidou')) {
                    return true;
                }
            }

            return false;
        } catch (error) {
            Logger.error('检查MyBatis项目失败', error as Error);
            return false;
        }
    }

    // ==================== 全局设置 ====================

    /**
     * 保存全局设置
     */
    async saveGlobalSetting(key: string, value: any): Promise<void> {
        try {
            await this.globalState.update(key, value);
            Logger.debug(`全局设置已保存: ${key}`);
        } catch (error) {
            Logger.error('保存全局设置失败', error as Error);
            throw error;
        }
    }

    /**
     * 获取全局设置
     */
    getGlobalSetting<T>(key: string, defaultValue?: T): T | undefined {
        return this.globalState.get<T>(key, defaultValue);
    }

    // ==================== 状态重置 ====================

    /**
     * 重置工作空间状态
     */
    async resetWorkspaceState(): Promise<void> {
        try {
            const keys = Object.values(StateManager.KEYS);
            for (const key of keys) {
                await this.workspaceState.update(key, undefined);
            }
            Logger.info('工作空间状态已重置');
        } catch (error) {
            Logger.error('重置工作空间状态失败', error as Error);
            throw error;
        }
    }

    /**
     * 获取状态统计信息
     */
    getStateStats(): any {
        const lastScanTime = this.getLastScanTime();
        const workspacePath = this.getCurrentWorkspacePath();
        
        return {
            workspacePath,
            lastScanTime: lastScanTime ? new Date(lastScanTime).toISOString() : null,
            cacheValid: this.isCacheValid(),
            hasERData: !!this.workspaceState.get(StateManager.KEYS.ER_DIAGRAM_DATA)
        };
    }
} 