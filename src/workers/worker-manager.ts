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
 * Worker管理器
 * 负责管理Worker线程池，任务分发和结果收集
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
    private stats: WorkerManagerStats;
    
    constructor(config: Partial<WorkerConfig> = {}) {
        super();
        
        // 默认配置
        this.config = {
            maxWorkers: Math.max(2, Math.min(8, require('os').cpus().length - 1)),
            workerTimeout: 30000, // 30秒
            maxQueueSize: 1000,
            heartbeatInterval: 5000, // 5秒
            maxRetries: 3,
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
        Logger.info(`WorkerManager initialized with ${this.config.maxWorkers} max workers`);
    }
    
    /**
     * 启动Worker管理器
     */
    async start(): Promise<void> {
        if (this.isShuttingDown) {
            throw new Error('WorkerManager is shutting down');
        }
        
        // 创建初始Worker
        const initialWorkers = Math.min(2, this.config.maxWorkers);
        for (let i = 0; i < initialWorkers; i++) {
            await this.createWorker();
        }
        
        Logger.info(`WorkerManager started with ${initialWorkers} workers`);
    }
    
    /**
     * 停止Worker管理器
     */
    async shutdown(): Promise<void> {
        this.isShuttingDown = true;
        
        // 停止心跳
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
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
     * 提交任务
     */
    async submitTask<T = any>(
        type: WorkerMessageType,
        data: any,
        options: {
            priority?: number;
            timeout?: number;
            maxRetries?: number;
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
                reject(new Error(`Task ${task.id} timed out`));
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
     * 创建Worker
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
            
            // 设置Worker事件监听
            this.setupWorkerListeners(worker, workerId);
            
            // 保存Worker信息
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
            
            // 发送初始化消息
            await this.sendMessage(workerId, {
                id: this.generateMessageId(),
                type: WorkerMessageType.PING,
                payload: {},
                timestamp: Date.now()
            });
            
            this.emit('workerCreated', { workerId });
            Logger.debug(`Worker ${workerId} created`);
            
            return workerId;
        } catch (error) {
            Logger.error(`Failed to create worker: ${error}`);
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
     * 重新创建Worker
     */
    private async recreateWorker(oldWorkerId: string): Promise<void> {
        try {
            // 移除旧Worker
            this.workers.delete(oldWorkerId);
            this.workerInfos.delete(oldWorkerId);
            
            // 创建新Worker
            await this.createWorker();
            
            Logger.info(`Worker ${oldWorkerId} recreated`);
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
} 