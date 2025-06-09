/**
 * Worker线程相关类型定义
 */

// Worker消息类型枚举
export enum WorkerMessageType {
    // 解析相关
    PARSE_JAVA_FILE = 'PARSE_JAVA_FILE',
    PARSE_XML_FILE = 'PARSE_XML_FILE',
    PARSE_BATCH_FILES = 'PARSE_BATCH_FILES',
    
    // 推断相关
    INFER_RELATIONS = 'INFER_RELATIONS',
    VALIDATE_RELATIONS = 'VALIDATE_RELATIONS',
    
    // 生成相关
    GENERATE_DIAGRAM = 'GENERATE_DIAGRAM',
    EXPORT_DIAGRAM = 'EXPORT_DIAGRAM',
    
    // 控制相关
    PING = 'PING',
    PONG = 'PONG',
    TERMINATE = 'TERMINATE',
    ERROR = 'ERROR',
    PROGRESS = 'PROGRESS'
}

// Worker消息接口
export interface WorkerMessage<T = any> {
    /** 消息ID */
    id: string;
    /** 消息类型 */
    type: WorkerMessageType;
    /** 消息载荷 */
    payload: T;
    /** 时间戳 */
    timestamp: number;
    /** 是否为响应消息 */
    isResponse?: boolean;
    /** 响应的原始消息ID */
    responseToId?: string;
}

// Worker响应接口
export interface WorkerResponse<T = any> {
    /** 是否成功 */
    success: boolean;
    /** 响应数据 */
    data?: T;
    /** 错误信息 */
    error?: string;
    /** 处理时间(毫秒) */
    processingTime: number;
    /** Worker统计信息 */
    workerStats?: {
        processedTasks: number;
        uptime: number;
        memoryUsage: NodeJS.MemoryUsage;
    };
    /** 额外元数据 */
    metadata?: Record<string, any>;
}

// Worker任务接口
export interface WorkerTask<T = any> {
    /** 任务ID */
    id: string;
    /** 任务类型 */
    type: WorkerMessageType;
    /** 任务数据 */
    data: T;
    /** 优先级 (1-10, 10最高) */
    priority: number;
    /** 超时时间(毫秒) */
    timeout: number;
    /** 重试次数 */
    retryCount: number;
    /** 最大重试次数 */
    maxRetries: number;
    /** 创建时间 */
    createdAt: number;
    /** 开始时间 */
    startedAt?: number;
    /** 完成时间 */
    completedAt?: number;
}

// Worker状态枚举
export enum WorkerStatus {
    IDLE = 'idle',
    BUSY = 'busy',
    ERROR = 'error',
    TERMINATED = 'terminated'
}

// Worker信息接口
export interface WorkerInfo {
    /** Worker ID */
    id: string;
    /** Worker状态 */
    status: WorkerStatus;
    /** 当前任务ID */
    currentTaskId?: string;
    /** 已处理任务数 */
    processedTasks: number;
    /** 错误次数 */
    errorCount: number;
    /** 创建时间 */
    createdAt: number;
    /** 最后活动时间 */
    lastActiveAt: number;
    /** 平均处理时间 */
    averageProcessingTime: number;
}

// Worker配置接口
export interface WorkerConfig {
    /** 最大Worker数量 */
    maxWorkers: number;
    /** Worker超时时间 */
    workerTimeout: number;
    /** 任务队列最大长度 */
    maxQueueSize: number;
    /** 心跳间隔 */
    heartbeatInterval: number;
    /** 最大重试次数 */
    maxRetries: number;
    /** 是否启用性能监控 */
    enableProfiling: boolean;
}

// 解析任务数据接口
export interface ParseTaskData {
    /** 文件路径 */
    filePath: string;
    /** 文件内容 */
    content: string;
    /** 文件类型 */
    fileType: 'java' | 'xml';
    /** 解析选项 */
    options?: ParseOptions;
}

// 解析选项接口
export interface ParseOptions {
    /** 是否包含注释 */
    includeComments?: boolean;
    /** 是否解析方法体 */
    parseMethodBodies?: boolean;
    /** 最大文件大小(字节) */
    maxFileSize?: number;
    /** 编码格式 */
    encoding?: string;
}

// 批量解析任务数据接口
export interface BatchParseTaskData {
    /** 文件列表 */
    files: Array<{
        filePath: string;
        content: string;
        fileType: 'java' | 'xml';
    }>;
    /** 批次大小 */
    batchSize: number;
    /** 解析选项 */
    options?: ParseOptions;
}

// 关系推断任务数据接口
export interface InferenceTaskData {
    /** 实体列表 */
    entities: any[];
    /** XML映射数据 */
    mappings?: any[];
    /** 推断策略配置 */
    strategies?: {
        naming: boolean;
        xml: boolean;
        annotation: boolean;
        semantic: boolean;
    };
    /** 最小置信度 */
    minConfidence?: number;
}

// 图表生成任务数据接口
export interface DiagramTaskData {
    /** 实体数据 */
    entities: any[];
    /** 关系数据 */
    relations: any[];
    /** 生成选项 */
    options: {
        theme: 'light' | 'dark' | 'auto';
        format: 'mermaid' | 'plantuml';
        includeFields: boolean;
        includeRelations: boolean;
    };
}

// 进度报告接口
export interface ProgressReport {
    /** 任务ID */
    taskId: string;
    /** 完成百分比 (0-100) */
    percentage: number;
    /** 当前步骤描述 */
    message: string;
    /** 已处理项目数 */
    processed: number;
    /** 总项目数 */
    total: number;
    /** 预估剩余时间(毫秒) */
    estimatedTimeRemaining?: number;
}

// Worker性能统计接口
export interface WorkerPerformanceStats {
    /** Worker ID */
    workerId: string;
    /** 总任务数 */
    totalTasks: number;
    /** 成功任务数 */
    successfulTasks: number;
    /** 失败任务数 */
    failedTasks: number;
    /** 平均处理时间 */
    averageProcessingTime: number;
    /** 最小处理时间 */
    minProcessingTime: number;
    /** 最大处理时间 */
    maxProcessingTime: number;
    /** 内存使用情况 */
    memoryUsage: {
        used: number;
        total: number;
        percentage: number;
    };
    /** CPU使用率 */
    cpuUsage: number;
}

// Worker管理器统计接口
export interface WorkerManagerStats {
    /** 活跃Worker数量 */
    activeWorkers: number;
    /** 空闲Worker数量 */
    idleWorkers: number;
    /** 队列中的任务数 */
    queuedTasks: number;
    /** 正在处理的任务数 */
    processingTasks: number;
    /** 总处理任务数 */
    totalProcessedTasks: number;
    /** 平均队列等待时间 */
    averageQueueTime: number;
    /** 系统负载 */
    systemLoad: number;
}

// 错误类型枚举
export enum WorkerErrorType {
    TIMEOUT = 'timeout',
    PARSE_ERROR = 'parse_error',
    MEMORY_ERROR = 'memory_error',
    NETWORK_ERROR = 'network_error',
    VALIDATION_ERROR = 'validation_error',
    UNKNOWN_ERROR = 'unknown_error'
}

// Worker错误接口
export interface WorkerError {
    /** 错误类型 */
    type: WorkerErrorType;
    /** 错误消息 */
    message: string;
    /** 错误堆栈 */
    stack?: string;
    /** 任务ID */
    taskId?: string;
    /** Worker ID */
    workerId?: string;
    /** 错误时间 */
    timestamp: number;
    /** 额外上下文 */
    context?: Record<string, any>;
}

// Worker事件类型枚举
export enum WorkerEventType {
    WORKER_CREATED = 'worker_created',
    WORKER_TERMINATED = 'worker_terminated',
    TASK_STARTED = 'task_started',
    TASK_COMPLETED = 'task_completed',
    TASK_FAILED = 'task_failed',
    QUEUE_FULL = 'queue_full',
    PERFORMANCE_WARNING = 'performance_warning'
}

// Worker事件接口
export interface WorkerEvent<T = any> {
    /** 事件类型 */
    type: WorkerEventType;
    /** 事件数据 */
    data: T;
    /** 时间戳 */
    timestamp: number;
    /** Worker ID */
    workerId?: string;
    /** 任务ID */
    taskId?: string;
} 