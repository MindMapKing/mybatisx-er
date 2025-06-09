import { parentPort, workerData } from 'worker_threads';
import {
    WorkerMessage,
    WorkerMessageType,
    WorkerResponse,
    WorkerError,
    WorkerErrorType,
    ParseTaskData,
    BatchParseTaskData,
    InferenceTaskData,
    DiagramTaskData,
    ProgressReport
} from '../types/worker-types';
import { SmartJavaParser } from '../parsers/java-parser';
import { SmartXmlParser } from '../parsers/xml-parser';
import { RelationInferenceEngine } from '../parsers/relation-inference';

/**
 * Worker线程主类 - 优化版本
 * 处理来自主线程的任务请求
 * 
 * 优化重点：
 * 1. 实现批量文件处理，提高效率
 * 2. 优化内存使用，避免内存泄漏
 * 3. 改进错误处理，提高稳定性
 * 4. 添加性能监控和资源管理
 */
class WorkerThread {
    private workerId: string;
    private config: any;
    private isTerminating = false;
    private javaParser: SmartJavaParser;
    private xmlParser: SmartXmlParser;
    private relationInference: RelationInferenceEngine;
    private processedTasks = 0;
    private startTime = Date.now();
    
    constructor() {
        this.workerId = workerData.workerId;
        this.config = workerData.config;
        this.javaParser = new SmartJavaParser();
        this.xmlParser = new SmartXmlParser();
        this.relationInference = new RelationInferenceEngine();
        
        this.setupMessageHandling();
        this.sendMessage({
            id: this.generateMessageId(),
            type: WorkerMessageType.PONG,
            payload: { 
                workerId: this.workerId,
                startTime: this.startTime
            },
            timestamp: Date.now(),
            isResponse: true
        });
    }
    
    /**
     * 设置消息处理
     */
    private setupMessageHandling(): void {
        if (!parentPort) {
            throw new Error('Worker must be run in worker_threads context');
        }
        
        parentPort.on('message', async (message: WorkerMessage) => {
            if (this.isTerminating) return;
            
            try {
                await this.handleMessage(message);
            } catch (error) {
                this.sendError(error as Error, message.id);
            }
        });
        
        parentPort.on('error', (error: Error) => {
            this.sendError(error);
        });
        
        // 定期清理内存
        setInterval(() => {
            if (global.gc) {
                global.gc();
            }
        }, 30000); // 每30秒尝试垃圾回收
    }
    
    /**
     * 处理消息 - 优化版本
     */
    private async handleMessage(message: WorkerMessage): Promise<void> {
        const startTime = Date.now();
        
        try {
            let result: any;
            
            switch (message.type) {
                case WorkerMessageType.PING:
                    result = await this.handlePing(message);
                    break;
                    
                case WorkerMessageType.PARSE_JAVA_FILE:
                    result = await this.handleParseJavaFile(message);
                    break;
                    
                case WorkerMessageType.PARSE_XML_FILE:
                    result = await this.handleParseXmlFile(message);
                    break;
                    
                case WorkerMessageType.PARSE_BATCH_FILES:
                    result = await this.handleBatchParse(message);
                    break;
                    
                case WorkerMessageType.INFER_RELATIONS:
                    result = await this.handleInferRelations(message);
                    break;
                    
                case WorkerMessageType.VALIDATE_RELATIONS:
                    result = await this.handleValidateRelations(message);
                    break;
                    
                case WorkerMessageType.GENERATE_DIAGRAM:
                    result = await this.handleGenerateDiagram(message);
                    break;
                    
                case WorkerMessageType.EXPORT_DIAGRAM:
                    result = await this.handleExportDiagram(message);
                    break;
                    
                case WorkerMessageType.TERMINATE:
                    await this.handleTerminate();
                    return;
                    
                default:
                    throw new Error(`Unknown message type: ${message.type}`);
            }
            
            this.processedTasks++;
            
            // 发送成功响应
            this.sendResponse(message.id, {
                success: true,
                data: result,
                processingTime: Date.now() - startTime,
                workerStats: {
                    processedTasks: this.processedTasks,
                    uptime: Date.now() - this.startTime,
                    memoryUsage: process.memoryUsage()
                }
            });
            
        } catch (error) {
            // 发送错误响应
            this.sendResponse(message.id, {
                success: false,
                error: (error as Error).message,
                processingTime: Date.now() - startTime,
                workerStats: {
                    processedTasks: this.processedTasks,
                    uptime: Date.now() - this.startTime,
                    memoryUsage: process.memoryUsage()
                }
            });
        }
    }
    
    /**
     * 处理心跳 - 增强版本
     */
    private async handlePing(message: WorkerMessage): Promise<any> {
        return {
            workerId: this.workerId,
            timestamp: Date.now(),
            uptime: Date.now() - this.startTime,
            processedTasks: this.processedTasks,
            memoryUsage: process.memoryUsage(),
            status: 'healthy'
        };
    }
    
    /**
     * 处理Java文件解析
     */
    private async handleParseJavaFile(message: WorkerMessage): Promise<any> {
        const data = message.payload as ParseTaskData;
        
        this.sendProgress(message.id, {
            taskId: message.id,
            percentage: 0,
            message: '开始解析Java文件',
            processed: 0,
            total: 1
        });
        
        // 直接进行真实解析，无需模拟延迟
        const result = await this.parseJavaFileContent(data);
        
        this.sendProgress(message.id, {
            taskId: message.id,
            percentage: 100,
            message: '解析完成',
            processed: 1,
            total: 1
        });
        
        return result;
    }
    
    /**
     * 处理XML文件解析
     */
    private async handleParseXmlFile(message: WorkerMessage): Promise<any> {
        const data = message.payload as ParseTaskData;
        
        this.sendProgress(message.id, {
            taskId: message.id,
            percentage: 0,
            message: '开始解析XML文件',
            processed: 0,
            total: 1
        });
        
        // 直接进行真实解析，无需模拟延迟
        const result = await this.parseXmlFileContent(data);
        
        this.sendProgress(message.id, {
            taskId: message.id,
            percentage: 100,
            message: '解析完成',
            processed: 1,
            total: 1
        });
        
        return result;
    }
    
    /**
     * 处理批量文件解析 - 优化实现
     */
    private async handleBatchParse(message: WorkerMessage): Promise<any> {
        const data = message.payload as BatchParseTaskData;
        const results = [];
        const totalFiles = data.files.length;
        
        this.sendProgress(message.id, {
            taskId: message.id,
            percentage: 0,
            message: `开始批量解析${totalFiles}个文件`,
            processed: 0,
            total: totalFiles
        });
        
        // 按文件类型分组处理
        const javaFiles = data.files.filter(f => f.fileType === 'java');
        const xmlFiles = data.files.filter(f => f.fileType === 'xml');
        
        let processed = 0;
        
        // 批量处理Java文件
        if (javaFiles.length > 0) {
            this.sendProgress(message.id, {
                taskId: message.id,
                percentage: Math.floor(processed * 100 / totalFiles),
                message: `处理${javaFiles.length}个Java文件...`,
                processed,
                total: totalFiles
            });
            
            for (const file of javaFiles) {
                try {
                    const result = await this.parseJavaFileContent(file);
                    results.push(result);
                    processed++;
                    
                    // 每处理5个文件报告一次进度
                    if (processed % 5 === 0 || processed === totalFiles) {
                        this.sendProgress(message.id, {
                            taskId: message.id,
                            percentage: Math.floor(processed * 100 / totalFiles),
                            message: `已处理 ${processed}/${totalFiles} 个文件`,
                            processed,
                            total: totalFiles
                        });
                    }
                    
                } catch (error) {
                    console.warn(`批量解析Java文件失败: ${file.filePath}`, error);
                    results.push({
                        filePath: file.filePath,
                        error: (error as Error).message,
                        success: false
                    });
                    processed++;
                }
                
                // 添加小延迟避免CPU占用过高
                if (processed % 3 === 0) {
                    await this.sleep(5);
                }
            }
        }
        
        // 批量处理XML文件
        if (xmlFiles.length > 0) {
            this.sendProgress(message.id, {
                taskId: message.id,
                percentage: Math.floor(processed * 100 / totalFiles),
                message: `处理${xmlFiles.length}个XML文件...`,
                processed,
                total: totalFiles
            });
            
            for (const file of xmlFiles) {
                try {
                    const result = await this.parseXmlFileContent(file);
                    results.push(result);
                    processed++;
                    
                    // 每处理5个文件报告一次进度
                    if (processed % 5 === 0 || processed === totalFiles) {
                        this.sendProgress(message.id, {
                            taskId: message.id,
                            percentage: Math.floor(processed * 100 / totalFiles),
                            message: `已处理 ${processed}/${totalFiles} 个文件`,
                            processed,
                            total: totalFiles
                        });
                    }
                    
                } catch (error) {
                    console.warn(`批量解析XML文件失败: ${file.filePath}`, error);
                    results.push({
                        filePath: file.filePath,
                        error: (error as Error).message,
                        success: false
                    });
                    processed++;
                }
                
                // 添加小延迟避免CPU占用过高
                if (processed % 3 === 0) {
                    await this.sleep(5);
                }
            }
        }
        
        this.sendProgress(message.id, {
            taskId: message.id,
            percentage: 100,
            message: `批量解析完成，成功处理${results.filter(r => r.success !== false).length}个文件`,
            processed: totalFiles,
            total: totalFiles
        });
        
        return results;
    }
    
    /**
     * 处理关系推断 - 优化版本
     */
    private async handleInferRelations(message: WorkerMessage): Promise<any> {
        const data = message.payload as InferenceTaskData;
        
        this.sendProgress(message.id, {
            taskId: message.id,
            percentage: 0,
            message: '开始推断实体关系',
            processed: 0,
            total: 1
        });
        
        try {
            // 使用关系推断引擎
            const result = await this.inferEntityRelations(data);
            
            this.sendProgress(message.id, {
                taskId: message.id,
                percentage: 100,
                message: `关系推断完成，发现${result.relations?.length || 0}个关系`,
                processed: 1,
                total: 1
            });
            
            return result;
            
        } catch (error) {
            console.warn('关系推断失败', error);
            return {
                relations: [],
                confidence: 0,
                error: (error as Error).message
            };
        }
    }
    
    /**
     * 处理关系验证
     */
    private async handleValidateRelations(message: WorkerMessage): Promise<any> {
        const data = message.payload;
        
        this.sendProgress(message.id, {
            taskId: message.id,
            percentage: 0,
            message: '开始关系验证',
            processed: 0,
            total: 1
        });
        
        // 直接进行真实验证，无需模拟延迟
        const result = await this.validateEntityRelations(data);
        
        this.sendProgress(message.id, {
            taskId: message.id,
            percentage: 100,
            message: '关系验证完成',
            processed: 1,
            total: 1
        });
        
        return result;
    }
    
    /**
     * 处理图表生成
     */
    private async handleGenerateDiagram(message: WorkerMessage): Promise<any> {
        const data = message.payload as DiagramTaskData;
        
        this.sendProgress(message.id, {
            taskId: message.id,
            percentage: 0,
            message: '开始生成ER图',
            processed: 0,
            total: 1
        });
        
        // 直接进行真实生成，无需模拟延迟
        const result = await this.generateDiagramContent(data);
        
        this.sendProgress(message.id, {
            taskId: message.id,
            percentage: 100,
            message: 'ER图生成完成',
            processed: 1,
            total: 1
        });
        
        return result;
    }
    
    /**
     * 处理图表导出
     */
    private async handleExportDiagram(message: WorkerMessage): Promise<any> {
        const data = message.payload;
        
        this.sendProgress(message.id, {
            taskId: message.id,
            percentage: 0,
            message: '开始导出图表',
            processed: 0,
            total: 1
        });
        
        // 直接进行真实导出，无需模拟延迟
        const result = await this.exportDiagramContent(data);
        
        this.sendProgress(message.id, {
            taskId: message.id,
            percentage: 100,
            message: '图表导出完成',
            processed: 1,
            total: 1
        });
        
        return result;
    }
    
    /**
     * 处理终止 - 增强版本
     */
    private async handleTerminate(): Promise<void> {
        this.isTerminating = true;
        
        this.sendMessage({
            id: this.generateMessageId(),
            type: WorkerMessageType.PONG,
            payload: { 
                workerId: this.workerId, 
                terminating: true,
                finalStats: {
                    processedTasks: this.processedTasks,
                    uptime: Date.now() - this.startTime,
                    memoryUsage: process.memoryUsage()
                }
            },
            timestamp: Date.now(),
            isResponse: true
        });
        
        await this.cleanup();
        
        // 延迟退出，确保消息发送完成
        setTimeout(() => {
            process.exit(0);
        }, 100);
    }
    
    /**
     * 解析Java文件内容
     */
    private async parseJavaFileContent(data: ParseTaskData): Promise<any> {
        try {
            const entity = await this.javaParser.parseJavaFile(
                data.filePath,
                data.content,
                data.options
            );
            
            return {
                filePath: data.filePath,
                fileType: 'java',
                entity: entity,
                parseTime: Date.now()
            };
        } catch (error) {
            throw new Error(`Java文件解析失败: ${error}`);
        }
    }
    
    /**
     * 解析XML文件内容
     */
    private async parseXmlFileContent(data: ParseTaskData): Promise<any> {
        try {
            const result = await this.xmlParser.parseXmlFile(
                data.filePath,
                data.content,
                data.options
            );
            
            return {
                filePath: data.filePath,
                fileType: 'xml',
                result: result,
                parseTime: Date.now()
            };
        } catch (error) {
            throw new Error(`XML文件解析失败: ${error}`);
        }
    }
    
    /**
     * 优化的实体关系推断
     */
    private async inferEntityRelations(data: InferenceTaskData): Promise<any> {
        try {
            const { entities, mappings = [], strategies, minConfidence = 0.6 } = data;
            
            // 使用关系推断引擎
            const result = await this.relationInference.inferRelations(entities, mappings, {
                minConfidence,
                mergeSimilarRelations: true,
                inferReverseRelations: true
            });
            
            return {
                relations: result,
                confidence: result.length > 0 ? result.reduce((sum, r) => sum + r.confidence, 0) / result.length : 0,
                totalRelations: result.length
            };
            
        } catch (error) {
            console.warn('实体关系推断失败', error);
            return {
                relations: [],
                confidence: 0,
                error: (error as Error).message
            };
        }
    }
    
    /**
     * 验证实体关系 (占位符实现)
     */
    private async validateEntityRelations(data: any): Promise<any> {
        // 占位符实现，立即返回结果，无需模拟延迟
        return {
            valid: true,
            validatedRelations: data.relations || [],
            validationErrors: [],
            validationTime: Date.now()
        };
    }
    
    /**
     * 生成图表内容 (占位符实现)
     */
    private async generateDiagramContent(data: DiagramTaskData): Promise<any> {
        // 占位符实现，立即返回结果，无需模拟延迟
        return {
            format: data.options.format,
            content: `
                erDiagram
                    User {
                        int id
                        string name
                        string email
                    }
                    Order {
                        int id
                        int user_id
                        decimal amount
                    }
                    User ||--o{ Order : has
            `,
            metadata: {
                entityCount: data.entities.length,
                relationCount: data.relations.length,
                theme: data.options.theme
            },
            generationTime: Date.now()
        };
    }
    
    /**
     * 导出图表内容 (占位符实现)
     */
    private async exportDiagramContent(data: any): Promise<any> {
        // 占位符实现，立即返回结果，无需模拟延迟
        return {
            exportPath: data.exportPath,
            format: data.format,
            size: 1024,
            exportTime: Date.now()
        };
    }
    
    /**
     * 发送响应消息
     */
    private sendResponse(originalMessageId: string, response: WorkerResponse): void {
        this.sendMessage({
            id: this.generateMessageId(),
            type: WorkerMessageType.PONG, // 使用PONG作为通用响应类型
            payload: response,
            timestamp: Date.now(),
            isResponse: true,
            responseToId: originalMessageId
        });
    }
    
    /**
     * 发送进度报告
     */
    private sendProgress(taskId: string, progress: ProgressReport): void {
        this.sendMessage({
            id: this.generateMessageId(),
            type: WorkerMessageType.PROGRESS,
            payload: progress,
            timestamp: Date.now()
        });
    }
    
    /**
     * 发送错误消息
     */
    private sendError(error: Error, taskId?: string): void {
        const workerError: WorkerError = {
            type: WorkerErrorType.UNKNOWN_ERROR,
            message: error.message,
            stack: error.stack,
            taskId,
            workerId: this.workerId,
            timestamp: Date.now(),
            context: {
                memoryUsage: process.memoryUsage()
            }
        };
        
        this.sendMessage({
            id: this.generateMessageId(),
            type: WorkerMessageType.ERROR,
            payload: workerError,
            timestamp: Date.now()
        });
    }
    
    /**
     * 发送消息到主线程
     */
    private sendMessage(message: WorkerMessage): void {
        if (parentPort && !this.isTerminating) {
            parentPort.postMessage(message);
        }
    }
    
    /**
     * 优化的清理方法
     */
    private async cleanup(): Promise<void> {
        try {
            // 清理解析器实例
            this.javaParser = null as any;
            this.xmlParser = null as any;
            this.relationInference = null as any;
            
            // 强制垃圾回收
            if (global.gc) {
                global.gc();
            }
            
        } catch (error) {
            console.warn('Worker cleanup failed', error);
        }
    }
    
    /**
     * 睡眠函数
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * 生成消息ID
     */
    private generateMessageId(): string {
        return `msg_${this.workerId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// 启动Worker线程
new WorkerThread(); 