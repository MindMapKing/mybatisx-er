import { Worker } from 'worker_threads';
import * as path from 'path';
import { EventEmitter } from 'events';
import { Logger } from '../utils/logger';
import {
    WorkerMessage,
    WorkerMessageType,
    WorkerResponse,
    WorkerTask,
    WorkerStatus,
    WorkerInfo,
    WorkerConfig,
    WorkerManagerStats,
    WorkerError,
    WorkerErrorType,
    WorkerEvent,
    WorkerEventType,
    ProgressReport
} from '../types/worker-types';

/**
 * Worker管理器 - 优化版本
 * 负责管理Worker线程池，任务分发和结果收集
 * 
 * 优化重点：
 * 1. 减少Worker数量，避免资源过度消耗
 * 2. 实现批量任务处理，提高效率
 * 3. 添加资源监控和自动清理机制
 * 4. 实现降级处理，提高稳定性
 */
export class WorkerManager extends EventEmitter {
    private workers: Map<string, Worker> = new Map();
    private workerInfos: Map<string, WorkerInfo> = new Map();
    private taskQueue: WorkerTask[] = [];
    private activeTasks: Map<string, WorkerTask> = new Map();
    private pendingResponses: Map<string, {
        resolve: (value: any) => void;
        reject: (reason: any) => void;
        timeout: NodeJS.Timeout;
    }> = new Map();
    
    private config: WorkerConfig;
    private isShuttingDown = false;
    private heartbeatInterval?: NodeJS.Timeout;
    private resourceMonitorInterval?: NodeJS.Timeout;
    private stats: WorkerManagerStats;
    
    constructor(config: Partial<WorkerConfig> = {}) {
        super();
        
        // 优化后的默认配置 - 按需求调整
        const cpuCount = require('os').cpus().length;
        this.config = {
            maxWorkers: Math.min(cpuCount * 2, 16), // 最多CPU的两倍，但不超过16个
            workerTimeout: 30000, // 30秒超时
            maxQueueSize: 100,    // 队列最多100个任务
            heartbeatInterval: 5000, // 5秒心跳
            maxRetries: 3,        // 重试3次
            enableProfiling: false,
            ...config
        };
        
        // 初始化统计信息
        this.stats = {
            activeWorkers: 0,
            idleWorkers: 0,
            queuedTasks: 0,
            processingTasks: 0,
            totalProcessedTasks: 0,
            averageQueueTime: 0,
            systemLoad: 0
        };
        
        this.startHeartbeat();
        this.startResourceMonitoring();
        
        Logger.info(`WorkerManager initialized with optimized config`, {
            maxWorkers: this.config.maxWorkers,
            timeout: this.config.workerTimeout,
            queueSize: this.config.maxQueueSize
        });
    }
    
    /**
     * 启动Worker管理器
     */
    async start(): Promise<void> {
        if (this.isShuttingDown) {
            throw new Error('WorkerManager is shutting down');
        }
        
        // 只创建1个初始Worker，按需创建更多
        try {
            await this.createWorker();
            Logger.info(`WorkerManager started with 1 initial worker`);
        } catch (error) {
            Logger.error('Failed to create initial worker', error as Error);
            throw error;
        }
    }
    
    /**
     * 停止Worker管理器
     */
    async shutdown(): Promise<void> {
        this.isShuttingDown = true;
        
        // 停止监控
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        if (this.resourceMonitorInterval) {
            clearInterval(this.resourceMonitorInterval);
        }
        
        // 清空任务队列
        this.taskQueue = [];
        
        // 拒绝所有待处理的响应
        for (const [id, pending] of this.pendingResponses) {
            clearTimeout(pending.timeout);
            pending.reject(new Error('WorkerManager is shutting down'));
        }
        this.pendingResponses.clear();
        
        // 终止所有Worker
        const terminationPromises = Array.from(this.workers.values()).map(worker => 
            this.terminateWorker(worker)
        );
        
        await Promise.all(terminationPromises);
        
        this.workers.clear();
        this.workerInfos.clear();
        this.activeTasks.clear();
        
        Logger.info('WorkerManager shutdown completed');
    }
    
    /**
     * 提交任务 - 优化版本，支持批量处理
     */
    async submitTask<T = any>(
        type: WorkerMessageType,
        data: any,
        options: {
            priority?: number;
            timeout?: number;
            maxRetries?: number;
            preferBatch?: boolean; // 新增：是否优先使用批量处理
        } = {}
    ): Promise<T> {
        if (this.isShuttingDown) {
            throw new Error('WorkerManager is shutting down');
        }
        
        if (this.taskQueue.length >= this.config.maxQueueSize) {
            throw new Error('Task queue is full');
        }
        
        const task: WorkerTask = {
            id: this.generateTaskId(),
            type,
            data,
            priority: options.priority || 5,
            timeout: options.timeout || this.config.workerTimeout,
            retryCount: 0,
            maxRetries: options.maxRetries || this.config.maxRetries,
            createdAt: Date.now()
        };
        
        return new Promise((resolve, reject) => {
            // 添加到队列
            this.addTaskToQueue(task);
            
            // 设置响应处理
            const timeout = setTimeout(() => {
                this.pendingResponses.delete(task.id);
                reject(new Error(`Task ${task.id} timed out after ${task.timeout}ms`));
            }, task.timeout);
            
            this.pendingResponses.set(task.id, {
                resolve,
                reject,
                timeout
            });
            
            // 尝试立即处理任务
            this.processQueue();
        });
    }
    
    /**
     * 新增：批量提交任务
     */
    async submitBatchTasks<T = any>(
        tasks: Array<{
            type: WorkerMessageType;
            data: any;
            options?: {
                priority?: number;
                timeout?: number;
                maxRetries?: number;
            };
        }>
    ): Promise<T[]> {
        if (tasks.length === 0) {
            return [];
        }
        
        // 如果任务数量较少，直接批量处理
        if (tasks.length <= 10) {
            return Promise.all(tasks.map(task => 
                this.submitTask(task.type, task.data, task.options)
            ));
        }
        
        // 对于大量任务，分批处理
        const batchSize = 5;
        const results: T[] = [];
        
        for (let i = 0; i < tasks.length; i += batchSize) {
            const batch = tasks.slice(i, i + batchSize);
            const batchResults = await Promise.all(
                batch.map(task => this.submitTask(task.type, task.data, task.options))
            );
            results.push(...batchResults);
            
            // 添加小延迟避免过载
            if (i + batchSize < tasks.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        return results;
    }
    
    /**
     * 获取管理器统计信息
     */
    getStats(): WorkerManagerStats {
        this.updateStats();
        return { ...this.stats };
    }
    
    /**
     * 获取Worker信息
     */
    getWorkerInfos(): WorkerInfo[] {
        return Array.from(this.workerInfos.values());
    }

    /**
     * 获取Worker处理状态详情 - 新增功能
     */
    getWorkerProcessingDetails(): Array<{
        workerId: string;
        status: WorkerStatus;
        currentTask?: {
            id: string;
            type: WorkerMessageType;
            startedAt: number;
            duration: number;
            description: string;
        };
        processedTasks: number;
        errorCount: number;
    }> {
        const details = [];
        
        for (const [workerId, workerInfo] of this.workerInfos) {
            const detail: any = {
                workerId,
                status: workerInfo.status,
                processedTasks: workerInfo.processedTasks,
                errorCount: workerInfo.errorCount
            };
            
            // 如果Worker正在处理任务，添加任务详情
            if (workerInfo.currentTaskId) {
                const task = this.activeTasks.get(workerInfo.currentTaskId);
                if (task) {
                    detail.currentTask = {
                        id: task.id,
                        type: task.type,
                        startedAt: task.startedAt || task.createdAt,
                        duration: Date.now() - (task.startedAt || task.createdAt),
                        description: this.getTaskDescription(task)
                    };
                }
            }
            
            details.push(detail);
        }
        
        return details;
    }

    /**
     * 获取任务描述 - 辅助方法
     */
    private getTaskDescription(task: WorkerTask): string {
        switch (task.type) {
            case WorkerMessageType.PARSE_JAVA_FILE:
                return `解析Java文件: ${task.data?.filePath || '未知文件'}`;
            case WorkerMessageType.PARSE_XML_FILE:
                return `解析XML文件: ${task.data?.filePath || '未知文件'}`;
            case WorkerMessageType.PARSE_BATCH_FILES:
                return `批量解析文件: ${task.data?.files?.length || 0}个文件`;
            case WorkerMessageType.INFER_RELATIONS:
                return `推断关系: ${task.data?.entities?.length || 0}个实体`;
            case WorkerMessageType.VALIDATE_RELATIONS:
                return `验证关系: ${task.data?.relations?.length || 0}个关系`;
            case WorkerMessageType.GENERATE_DIAGRAM:
                return `生成图表: ${task.data?.entities?.length || 0}个实体`;
            case WorkerMessageType.EXPORT_DIAGRAM:
                return `导出图表: ${task.data?.format || '未知格式'}`;
            default:
                return `执行任务: ${task.type}`;
        }
    }

    /**
     * 输出Worker处理状态 - 新增功能
     */
    logWorkerProcessingStatus(): void {
        const details = this.getWorkerProcessingDetails();
        const stats = this.getStats();
        
        Logger.info('=== Worker处理状态报告 ===');
        Logger.info(`总Worker数: ${this.workers.size}/${this.config.maxWorkers}`);
        Logger.info(`活跃Worker: ${stats.activeWorkers}, 空闲Worker: ${stats.idleWorkers}`);
        Logger.info(`队列任务: ${stats.queuedTasks}, 处理中任务: ${stats.processingTasks}`);
        
        details.forEach(detail => {
            if (detail.status === WorkerStatus.BUSY && detail.currentTask) {
                const task = detail.currentTask;
                const durationSec = Math.round(task.duration / 1000);
                Logger.info(`🔄 Worker ${detail.workerId}: ${task.description} (${durationSec}秒)`);
            } else {
                Logger.info(`💤 Worker ${detail.workerId}: ${detail.status} (已处理${detail.processedTasks}个任务)`);
            }
        });
        
        Logger.info('========================');
    }
    
    /**
     * 新增：获取系统健康状态
     */
    getHealthStatus(): {
        healthy: boolean;
        issues: string[];
        recommendations: string[];
    } {
        const issues: string[] = [];
        const recommendations: string[] = [];
        
        const stats = this.getStats();
        const memUsage = process.memoryUsage();
        
        // 检查内存使用
        if (memUsage.heapUsed > 50 * 1024 * 1024) { // 50MB
            issues.push('内存使用过高');
            recommendations.push('考虑清理缓存或减少并发任务');
        }
        
        // 检查Worker数量
        if (stats.activeWorkers > this.config.maxWorkers) {
            issues.push('Worker数量超限');
            recommendations.push('等待当前任务完成或重启扩展');
        }
        
        // 检查队列长度
        if (stats.queuedTasks > this.config.maxQueueSize * 0.8) {
            issues.push('任务队列接近满载');
            recommendations.push('减少并发操作或增加处理能力');
        }
        
        return {
            healthy: issues.length === 0,
            issues,
            recommendations
        };
    }
    
    /**
     * 创建Worker - 优化版本
     */
    private async createWorker(): Promise<string> {
        const workerId = this.generateWorkerId();
        const workerPath = path.join(__dirname, 'workers', 'worker-thread.js');
        
        try {
            const worker = new Worker(workerPath, {
                workerData: {
                    workerId,
                    config: this.config
                }
            });
            
            this.workers.set(workerId, worker);
            this.workerInfos.set(workerId, {
                id: workerId,
                status: WorkerStatus.IDLE,
                processedTasks: 0,
                errorCount: 0,
                createdAt: Date.now(),
                lastActiveAt: Date.now(),
                averageProcessingTime: 0
            });
            
            this.setupWorkerListeners(worker, workerId);
            
            Logger.info(`Worker created: ${workerId}`);
            return workerId;
            
        } catch (error) {
            Logger.error(`Failed to create worker: ${workerId}`, error as Error);
            this.workerInfos.delete(workerId);
            throw error;
        }
    }
    
    /**
     * 设置Worker事件监听
     */
    private setupWorkerListeners(worker: Worker, workerId: string): void {
        worker.on('message', (message: WorkerMessage) => {
            this.handleWorkerMessage(workerId, message);
        });
        
        worker.on('error', (error: Error) => {
            this.handleWorkerError(workerId, error);
        });
        
        worker.on('exit', (code: number) => {
            this.handleWorkerExit(workerId, code);
        });
    }
    
    /**
     * 处理Worker消息
     */
    private handleWorkerMessage(workerId: string, message: WorkerMessage): void {
        const workerInfo = this.workerInfos.get(workerId);
        if (!workerInfo) return;
        
        // 更新最后活动时间
        workerInfo.lastActiveAt = Date.now();
        
        switch (message.type) {
            case WorkerMessageType.PONG:
                // 心跳响应
                break;
                
            case WorkerMessageType.PROGRESS:
                // 进度报告
                this.emit('progress', message.payload as ProgressReport);
                break;
                
            case WorkerMessageType.ERROR:
                // 错误报告
                this.handleTaskError(workerId, message);
                break;
                
            default:
                // 任务响应
                if (message.isResponse && message.responseToId) {
                    this.handleTaskResponse(workerId, message);
                }
                break;
        }
    }
    
    /**
     * 处理任务响应
     */
    private handleTaskResponse(workerId: string, message: WorkerMessage): void {
        const taskId = message.responseToId!;
        const pending = this.pendingResponses.get(taskId);
        const task = this.activeTasks.get(taskId);
        const workerInfo = this.workerInfos.get(workerId);
        
        if (!pending || !task || !workerInfo) return;
        
        // 清理
        clearTimeout(pending.timeout);
        this.pendingResponses.delete(taskId);
        this.activeTasks.delete(taskId);
        
        // 更新Worker状态
        workerInfo.status = WorkerStatus.IDLE;
        workerInfo.currentTaskId = undefined;
        workerInfo.processedTasks++;
        
        // 更新处理时间
        const processingTime = Date.now() - (task.startedAt || task.createdAt);
        workerInfo.averageProcessingTime = 
            (workerInfo.averageProcessingTime * (workerInfo.processedTasks - 1) + processingTime) / 
            workerInfo.processedTasks;
        
        // 完成任务
        task.completedAt = Date.now();
        this.stats.totalProcessedTasks++;
        
        const response = message.payload as WorkerResponse;
        if (response.success) {
            pending.resolve(response.data);
            this.emit('taskCompleted', { taskId, workerId, result: response.data });
        } else {
            pending.reject(new Error(response.error || 'Task failed'));
            this.emit('taskFailed', { taskId, workerId, error: response.error });
        }
        
        // 处理队列中的下一个任务
        this.processQueue();
    }
    
    /**
     * 处理任务错误
     */
    private handleTaskError(workerId: string, message: WorkerMessage): void {
        const error = message.payload as WorkerError;
        const workerInfo = this.workerInfos.get(workerId);
        
        if (workerInfo) {
            workerInfo.errorCount++;
            workerInfo.status = WorkerStatus.ERROR;
        }
        
        if (error.taskId) {
            const pending = this.pendingResponses.get(error.taskId);
            const task = this.activeTasks.get(error.taskId);
            
            if (pending && task) {
                // 检查是否可以重试
                if (task.retryCount < task.maxRetries) {
                    task.retryCount++;
                    this.addTaskToQueue(task);
                    Logger.warn(`Retrying task ${task.id}, attempt ${task.retryCount}/${task.maxRetries}`);
                } else {
                    // 任务失败
                    clearTimeout(pending.timeout);
                    this.pendingResponses.delete(error.taskId);
                    this.activeTasks.delete(error.taskId);
                    pending.reject(new Error(error.message));
                }
            }
        }
        
        Logger.error(`Worker ${workerId} error: ${error.message}`);
        this.emit('workerError', { workerId, error });
    }
    
    /**
     * 处理Worker错误
     */
    private handleWorkerError(workerId: string, error: Error): void {
        Logger.error(`Worker ${workerId} encountered error: ${error.message}`);
        
        const workerInfo = this.workerInfos.get(workerId);
        if (workerInfo) {
            workerInfo.status = WorkerStatus.ERROR;
            workerInfo.errorCount++;
        }
        
        // 重新创建Worker
        this.recreateWorker(workerId);
    }
    
    /**
     * 处理Worker退出
     */
    private handleWorkerExit(workerId: string, code: number): void {
        Logger.warn(`Worker ${workerId} exited with code ${code}`);
        
        // 清理Worker信息
        this.workers.delete(workerId);
        const workerInfo = this.workerInfos.get(workerId);
        if (workerInfo) {
            workerInfo.status = WorkerStatus.TERMINATED;
        }
        
        // 如果不是正在关闭，重新创建Worker
        if (!this.isShuttingDown) {
            this.recreateWorker(workerId);
        }
    }
    
    /**
     * 重新创建Worker - 优化版本
     */
    private async recreateWorker(oldWorkerId: string): Promise<void> {
        try {
            // 检查是否超过最大Worker数量限制
            const currentWorkerCount = this.workers.size;
            const cpuCount = require('os').cpus().length;
            const maxAllowedWorkers = Math.min(cpuCount * 2, 16);
            
            if (currentWorkerCount >= maxAllowedWorkers) {
                Logger.warn(`已达到最大Worker数量限制 (${maxAllowedWorkers})，不再重建Worker ${oldWorkerId}`);
                return;
            }
            
            // 移除旧Worker
            this.workers.delete(oldWorkerId);
            this.workerInfos.delete(oldWorkerId);
            
            // 创建新Worker
            await this.createWorker();
            
            Logger.info(`Worker ${oldWorkerId} recreated (${this.workers.size}/${maxAllowedWorkers})`);
        } catch (error) {
            Logger.error(`Failed to recreate worker: ${error}`);
        }
    }
    
    /**
     * 添加任务到队列
     */
    private addTaskToQueue(task: WorkerTask): void {
        // 按优先级插入
        let insertIndex = this.taskQueue.length;
        for (let i = 0; i < this.taskQueue.length; i++) {
            if (this.taskQueue[i].priority < task.priority) {
                insertIndex = i;
                break;
            }
        }
        
        this.taskQueue.splice(insertIndex, 0, task);
        this.stats.queuedTasks = this.taskQueue.length;
    }
    
    /**
     * 处理任务队列
     */
    private processQueue(): void {
        if (this.taskQueue.length === 0) return;
        
        // 查找空闲Worker
        const idleWorker = this.findIdleWorker();
        if (!idleWorker) {
            // 如果没有空闲Worker且未达到最大数量，创建新Worker
            if (this.workers.size < this.config.maxWorkers) {
                this.createWorker().then(() => this.processQueue());
            }
            return;
        }
        
        // 获取下一个任务
        const task = this.taskQueue.shift();
        if (!task) return;
        
        this.stats.queuedTasks = this.taskQueue.length;
        
        // 分配任务给Worker
        this.assignTaskToWorker(idleWorker, task);
    }
    
    /**
     * 查找空闲Worker
     */
    private findIdleWorker(): string | null {
        for (const [workerId, workerInfo] of this.workerInfos) {
            if (workerInfo.status === WorkerStatus.IDLE) {
                return workerId;
            }
        }
        return null;
    }
    
    /**
     * 分配任务给Worker
     */
    private assignTaskToWorker(workerId: string, task: WorkerTask): void {
        const worker = this.workers.get(workerId);
        const workerInfo = this.workerInfos.get(workerId);
        
        if (!worker || !workerInfo) return;
        
        // 更新状态
        workerInfo.status = WorkerStatus.BUSY;
        workerInfo.currentTaskId = task.id;
        task.startedAt = Date.now();
        
        this.activeTasks.set(task.id, task);
        this.stats.processingTasks = this.activeTasks.size;
        
        // 发送任务消息
        const message: WorkerMessage = {
            id: this.generateMessageId(),
            type: task.type,
            payload: task.data,
            timestamp: Date.now()
        };
        
        this.sendMessage(workerId, message);
        this.emit('taskStarted', { taskId: task.id, workerId });
        
        Logger.debug(`Task ${task.id} assigned to worker ${workerId}`);
    }
    
    /**
     * 发送消息给Worker
     */
    private async sendMessage(workerId: string, message: WorkerMessage): Promise<void> {
        const worker = this.workers.get(workerId);
        if (!worker) {
            throw new Error(`Worker ${workerId} not found`);
        }
        
        worker.postMessage(message);
    }
    
    /**
     * 终止Worker
     */
    private async terminateWorker(worker: Worker): Promise<void> {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                worker.terminate();
                resolve();
            }, 5000);
            
            worker.once('exit', () => {
                clearTimeout(timeout);
                resolve();
            });
            
            // 发送终止消息
            worker.postMessage({
                id: this.generateMessageId(),
                type: WorkerMessageType.TERMINATE,
                payload: {},
                timestamp: Date.now()
            });
        });
    }
    
    /**
     * 启动心跳检测
     */
    private startHeartbeat(): void {
        this.heartbeatInterval = setInterval(() => {
            this.performHeartbeat();
        }, this.config.heartbeatInterval);
    }
    
    /**
     * 执行心跳检测
     */
    private performHeartbeat(): void {
        const now = Date.now();
        
        for (const [workerId, workerInfo] of this.workerInfos) {
            // 检查Worker是否超时
            if (now - workerInfo.lastActiveAt > this.config.workerTimeout) {
                Logger.warn(`Worker ${workerId} appears to be unresponsive`);
                this.recreateWorker(workerId);
                continue;
            }
            
            // 发送心跳
            const worker = this.workers.get(workerId);
            if (worker && workerInfo.status === WorkerStatus.IDLE) {
                worker.postMessage({
                    id: this.generateMessageId(),
                    type: WorkerMessageType.PING,
                    payload: {},
                    timestamp: now
                });
            }
        }
    }
    
    /**
     * 更新统计信息
     */
    private updateStats(): void {
        let activeWorkers = 0;
        let idleWorkers = 0;
        
        for (const workerInfo of this.workerInfos.values()) {
            if (workerInfo.status === WorkerStatus.BUSY) {
                activeWorkers++;
            } else if (workerInfo.status === WorkerStatus.IDLE) {
                idleWorkers++;
            }
        }
        
        this.stats.activeWorkers = activeWorkers;
        this.stats.idleWorkers = idleWorkers;
        this.stats.queuedTasks = this.taskQueue.length;
        this.stats.processingTasks = this.activeTasks.size;
        
        // 计算系统负载
        this.stats.systemLoad = (activeWorkers / Math.max(1, this.workers.size)) * 100;
    }
    
    /**
     * 生成Worker ID
     */
    private generateWorkerId(): string {
        return `worker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * 生成任务ID
     */
    private generateTaskId(): string {
        return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * 生成消息ID
     */
    private generateMessageId(): string {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * 新增：启动资源监控
     */
    private startResourceMonitoring(): void {
        this.resourceMonitorInterval = setInterval(() => {
            this.performResourceCheck();
        }, 30000); // 每30秒检查一次
    }
    
    /**
     * 新增：执行资源检查
     */
    private performResourceCheck(): void {
        const memUsage = process.memoryUsage();
        const stats = this.getStats();
        
        Logger.debug('Resource check', {
            memory: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
            workers: `${stats.activeWorkers}/${this.config.maxWorkers}`,
            queue: stats.queuedTasks
        });
        
        // 输出Worker处理状态（每分钟一次）
        if (stats.activeWorkers > 0 || stats.queuedTasks > 0) {
            this.logWorkerProcessingStatus();
        }
        
        // 内存使用过高时清理空闲Worker
        if (memUsage.heapUsed > 50 * 1024 * 1024) { // 50MB
            Logger.warn('High memory usage detected, cleaning up idle workers');
            this.cleanupIdleWorkers();
        }
        
        // Worker数量过多时强制清理
        if (stats.activeWorkers > this.config.maxWorkers) {
            Logger.warn('Too many active workers, forcing cleanup');
            this.forceCleanupWorkers();
        }
    }
    
    /**
     * 新增：清理空闲Worker
     */
    private cleanupIdleWorkers(): void {
        const now = Date.now();
        const idleThreshold = 60000; // 1分钟
        
        for (const [workerId, info] of this.workerInfos) {
            if (info.status === WorkerStatus.IDLE && 
                now - info.lastActiveAt > idleThreshold) {
                
                Logger.info(`Cleaning up idle worker: ${workerId}`);
                const worker = this.workers.get(workerId);
                if (worker) {
                    this.terminateWorker(worker);
                }
            }
        }
    }
    
    /**
     * 新增：强制清理Worker
     */
    private forceCleanupWorkers(): void {
        const workerIds = Array.from(this.workerInfos.keys());
        const excessCount = workerIds.length - this.config.maxWorkers;
        
        if (excessCount > 0) {
            // 优先清理空闲和最老的Worker
            const sortedWorkers = workerIds
                .map(id => ({ id, info: this.workerInfos.get(id)! }))
                .sort((a, b) => {
                    // 空闲状态优先
                    if (a.info.status === WorkerStatus.IDLE && b.info.status !== WorkerStatus.IDLE) {
                        return -1;
                    }
                    if (b.info.status === WorkerStatus.IDLE && a.info.status !== WorkerStatus.IDLE) {
                        return 1;
                    }
                    // 然后按创建时间排序
                    return a.info.createdAt - b.info.createdAt;
                });
            
            for (let i = 0; i < excessCount && i < sortedWorkers.length; i++) {
                const workerId = sortedWorkers[i].id;
                const worker = this.workers.get(workerId);
                if (worker) {
                    Logger.warn(`Force terminating worker: ${workerId}`);
                    this.terminateWorker(worker);
                }
            }
        }
    }
} 