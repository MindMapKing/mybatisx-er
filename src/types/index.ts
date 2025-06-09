/**
 * MyBatis ER图生成插件 - 类型定义
 */

// 实体信息
export interface EntityInfo {
    /** 实体名称 */
    name: string;
    /** 表名 */
    tableName: string;
    /** 文件路径 */
    filePath: string;
    /** 字段列表 */
    fields: FieldInfo[];
    /** 注解信息 */
    annotations: AnnotationInfo[];
}

// 字段信息
export interface FieldInfo {
    /** 字段名称 */
    name: string;
    /** 字段类型 */
    type: string;
    /** 数据库列名 */
    columnName?: string;
    /** 是否主键 */
    isPrimaryKey: boolean;
    /** 是否外键 */
    isForeignKey: boolean;
    /** 注解信息 */
    annotations: AnnotationInfo[];
    /** 注释 */
    comment?: string;
}

// 注解信息
export interface AnnotationInfo {
    /** 注解名称 */
    name: string;
    /** 注解属性 */
    attributes: Record<string, any>;
}

// 关系信息
export interface RelationInfo {
    /** 关系ID */
    id: string;
    /** 源实体 */
    sourceEntity: string;
    /** 目标实体 */
    targetEntity: string;
    /** 关系类型 */
    type: RelationType;
    /** 置信度 */
    confidence: number;
    /** 推断策略 */
    strategy: InferenceStrategy;
    /** 关系描述 */
    description?: string;
}

// 关系类型
export enum RelationType {
    ONE_TO_ONE = 'one_to_one',
    ONE_TO_MANY = 'one_to_many',
    MANY_TO_ONE = 'many_to_one',
    MANY_TO_MANY = 'many_to_many'
}

// 推断策略
export enum InferenceStrategy {
    NAMING = 'naming',
    XML = 'xml',
    ANNOTATION = 'annotation',
    SEMANTIC = 'semantic'
}

// 推断结果
export interface InferenceResult {
    /** 关系信息 */
    relation: RelationInfo;
    /** 置信度 */
    confidence: number;
    /** 推断策略 */
    strategy: InferenceStrategy;
    /** 推断依据 */
    evidence: string[];
}

// ER图数据
export interface ERDiagramData {
    /** 实体列表 */
    entities: EntityInfo[];
    /** 关系列表 */
    relations: RelationInfo[];
    /** 生成时间 */
    generatedAt: Date;
    /** 项目路径 */
    projectPath: string;
}

// 配置选项
export interface ConfigOptions {
    /** 自动刷新 */
    autoRefresh: boolean;
    /** 推断策略配置 */
    inferenceStrategies: {
        naming: boolean;
        xml: boolean;
        annotation: boolean;
        semantic: boolean;
    };
    /** 主题 */
    theme: 'auto' | 'light' | 'dark';
    /** 导出格式 */
    exportFormat: 'png' | 'svg' | 'pdf' | 'mermaid';
}

// Worker消息类型
export interface WorkerMessage {
    /** 消息ID */
    id: string;
    /** 消息类型 */
    type: WorkerMessageType;
    /** 消息载荷 */
    payload: any;
    /** 时间戳 */
    timestamp: number;
}

// Worker消息类型
export enum WorkerMessageType {
    PARSE_ENTITY = 'PARSE_ENTITY',
    PARSE_XML = 'PARSE_XML',
    INFER_RELATIONS = 'INFER_RELATIONS',
    GENERATE_DIAGRAM = 'GENERATE_DIAGRAM'
}

// 解析任务
export interface ParseTask {
    /** 任务ID */
    id: string;
    /** 任务类型 */
    type: 'entity' | 'xml';
    /** 文件路径 */
    filePath: string;
    /** 文件内容 */
    content: string;
    /** 优先级 */
    priority: number;
}

// 解析结果
export interface ParseResult {
    /** 任务ID */
    taskId: string;
    /** 是否成功 */
    success: boolean;
    /** 结果数据 */
    data?: any;
    /** 错误信息 */
    error?: string;
    /** 处理时间 */
    processingTime: number;
}

// 导出Worker相关类型
export * from './worker-types'; 