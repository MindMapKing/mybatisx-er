// 在Worker线程中使用简单的console日志
const Logger = {
    debug: (message: string, ...args: any[]) => console.log(`[DEBUG] ${message}`, ...args),
    info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
    warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${message}`, ...args),
    error: (message: string, error?: Error) => console.error(`[ERROR] ${message}`, error)
};

// 导入VS Code API (仅在主线程中可用)
let vscode: any = null;
let isWorkerThread = false;
let vscodeLoadAttempted = false;

// 改进的 Worker 线程检测逻辑
function detectWorkerThread(): boolean {
    try {
        // 方法1: 检查 worker_threads 模块的 parentPort
        const { parentPort } = require('worker_threads');
        if (parentPort !== null) {
            return true;
        }
    } catch (error) {
        // worker_threads 模块不可用，说明不在 Worker 环境中
    }
    
    // 方法2: 检查全局对象特征
    if (typeof (globalThis as any).importScripts === 'function') {
        return true; // Web Worker 环境
    }
    
    // 方法3: 检查进程环境
    if (typeof process !== 'undefined') {
        // 检查是否有 Worker 线程特有的环境变量或属性
        if (process.env.NODE_ENV === 'worker' || 
            (process as any).isWorkerThread === true) {
            return true;
        }
    }
    
    // 方法4: 检查全局上下文
    if (typeof (globalThis as any).self !== 'undefined' && 
        typeof (globalThis as any).window === 'undefined' &&
        typeof (globalThis as any).document === 'undefined') {
        return true; // 可能是 Worker 环境
    }
    
    return false;
}

// 安全的 VS Code API 加载函数
function loadVSCodeAPI(): any {
    if (vscodeLoadAttempted && vscode) {
        return vscode;
    }
    
    vscodeLoadAttempted = true;
    
    try {
        // 方法1: 直接 require
        vscode = require('vscode');
        Logger.debug('VS Code API通过直接require加载成功');
        return vscode;
    } catch (error1) {
        Logger.debug('直接require失败，尝试其他方法', error1);
        
        try {
            // 方法2: 通过 eval 动态加载（避免 webpack 静态分析）
            vscode = eval('require')('vscode');
            Logger.debug('VS Code API通过eval require加载成功');
            return vscode;
        } catch (error2) {
            Logger.debug('eval require失败，尝试全局对象', error2);
            
            try {
                // 方法3: 检查全局对象
                if (typeof (globalThis as any).vscode !== 'undefined') {
                    vscode = (globalThis as any).vscode;
                    Logger.debug('VS Code API从全局对象获取成功');
                    return vscode;
                }
                
                // 方法4: 检查 global 对象
                if (typeof global !== 'undefined' && (global as any).vscode) {
                    vscode = (global as any).vscode;
                    Logger.debug('VS Code API从global对象获取成功');
                    return vscode;
                }
                
                // 方法5: 检查 window 对象（如果存在）
                if (typeof (globalThis as any).window !== 'undefined' && (globalThis as any).window.vscode) {
                    vscode = (globalThis as any).window.vscode;
                    Logger.debug('VS Code API从window对象获取成功');
                    return vscode;
                }
            } catch (error3) {
                Logger.debug('全局对象检查失败', error3);
            }
            
            Logger.debug('所有VS Code API加载方法都失败，将使用正则解析策略');
            return null;
        }
    }
}

// 初始化 VS Code API
try {
    isWorkerThread = detectWorkerThread();
    
    if (!isWorkerThread) {
        // 只在主线程中尝试加载 VS Code API
        vscode = loadVSCodeAPI();
        if (vscode) {
            Logger.debug('VS Code API已加载，LSP解析可用');
        } else {
            Logger.debug('VS Code API加载失败，将使用正则解析策略');
        }
    } else {
        Logger.debug('检测到Worker线程环境，将使用正则解析策略');
    }
} catch (error) {
    // 在Worker线程或其他受限环境中无法访问vscode API
    Logger.debug('VS Code API初始化失败，将使用正则解析策略', error);
}

/**
 * Java实体信息接口
 */
export interface JavaEntity {
    /** 类名 */
    className: string;
    /** 包名 */
    packageName: string;
    /** 表名 */
    tableName: string;
    /** 字段列表 */
    fields: JavaField[];
    /** 注解信息 */
    annotations: JavaAnnotation[];
    /** 文件路径 */
    filePath: string;
    /** 是否为实体类 */
    isEntity: boolean;
    /** 解析方法 */
    parseMethod: 'lsp' | 'regex' | 'hybrid';
    /** 解析置信度 */
    confidence: number;
}

/**
 * Java字段信息接口
 */
export interface JavaField {
    /** 字段名 */
    name: string;
    /** Java类型 */
    javaType: string;
    /** 数据库列名 */
    columnName: string;
    /** 数据库类型 */
    dbType?: string;
    /** 是否主键 */
    isPrimaryKey: boolean;
    /** 是否外键 */
    isForeignKey: boolean;
    /** 是否可空 */
    nullable: boolean;
    /** 注解信息 */
    annotations: JavaAnnotation[];
    /** 注释 */
    comment?: string;
    /** 字段位置信息 */
    position?: {
        line: number;
        character: number;
    };
}

/**
 * Java注解信息接口
 */
export interface JavaAnnotation {
    /** 注解名称 */
    name: string;
    /** 注解属性 */
    attributes: Record<string, any>;
    /** 原始文本 */
    rawText: string;
    /** 注解位置信息 */
    position?: {
        line: number;
        character: number;
    };
}

/**
 * 解析选项接口
 */
export interface JavaParseOptions {
    /** 是否解析方法体 */
    parseMethodBodies: boolean;
    /** 是否包含注释 */
    includeComments: boolean;
    /** 是否解析导入语句 */
    parseImports: boolean;
    /** 最大文件大小 */
    maxFileSize: number;
    /** 是否启用LSP解析 */
    enableLSP: boolean;
    /** LSP解析超时时间(ms) */
    lspTimeout: number;
    /** 是否启用混合解析 */
    enableHybrid: boolean;
}

/**
 * LSP符号信息接口
 */
interface LSPSymbolInfo {
    name: string;
    kind: number;
    location: {
        uri: string;
        range: {
            start: { line: number; character: number };
            end: { line: number; character: number };
        };
    };
    children?: LSPSymbolInfo[];
}

/**
 * 解析结果缓存
 */
class ParseResultCache {
    private cache = new Map<string, { entity: JavaEntity; timestamp: number }>();
    private readonly TTL = 5 * 60 * 1000; // 5分钟缓存

    getCacheKey(filePath: string, content: string): string {
        const contentHash = this.simpleHash(content);
        return `${filePath}:${contentHash}`;
    }

    get(key: string): JavaEntity | null {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.TTL) {
            return cached.entity;
        }
        if (cached) {
            this.cache.delete(key);
        }
        return null;
    }

    set(key: string, entity: JavaEntity): void {
        this.cache.set(key, { entity, timestamp: Date.now() });
    }

    clear(): void {
        this.cache.clear();
    }

    private simpleHash(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(36);
    }
}

/**
 * LSP Java解析器
 * 利用VS Code的Java语言服务进行精确解析
 */
class LSPJavaParser {
    private static instance: LSPJavaParser | null = null;
    private isJavaExtensionAvailable = false;

    private constructor() {
        this.checkJavaExtensionAvailability();
    }

    static getInstance(): LSPJavaParser {
        if (!LSPJavaParser.instance) {
            LSPJavaParser.instance = new LSPJavaParser();
        }
        return LSPJavaParser.instance;
    }

    /**
     * 检测Java扩展是否可用
     */
    private async checkJavaExtensionAvailability(): Promise<void> {
        // 尝试重新加载 VS Code API（如果之前失败了）
        if (!vscode && !isWorkerThread) {
            vscode = loadVSCodeAPI();
        }
        
        if (!vscode) {
            this.isJavaExtensionAvailable = false;
            Logger.debug('VS Code API不可用，LSP解析不可用');
            return;
        }

        try {
            // 尝试多个可能的Java扩展ID
            const possibleExtensionIds = [
                'redhat.java',                    // Language Support for Java by Red Hat
                'vscjava.vscode-java-pack',      // Extension Pack for Java
                'ms-vscode.vscode-java-pack',    // 微软版本的Java包
                'oracle.oracle-java'             // Oracle Java扩展
            ];
            
            let javaExtension: any = null;
            let foundExtensionId = '';
            
            // 查找已安装的Java扩展
            for (const extensionId of possibleExtensionIds) {
                const extension = vscode.extensions.getExtension(extensionId);
                if (extension) {
                    javaExtension = extension;
                    foundExtensionId = extensionId;
                    Logger.debug(`发现Java扩展: ${extensionId} (${extension.packageJSON?.displayName})`);
                    this.isJavaExtensionAvailable = true;
                    break;
                }
            }
            
            if (!javaExtension) {
                this.isJavaExtensionAvailable = false;
                Logger.debug('Java扩展未安装，建议安装 "Language Support for Java(TM) by Red Hat" 以获得更好的解析效果');
                
                // 列出所有Java相关扩展供调试
                this.listJavaRelatedExtensions();
                return;
            }
            
            Logger.debug(`使用Java扩展: ${foundExtensionId} v${javaExtension.packageJSON?.version}`);
            this.isJavaExtensionAvailable = javaExtension.isActive;
            
            if (!this.isJavaExtensionAvailable) {
                Logger.debug('Java扩展未激活，尝试激活中...');
                try {
                    await javaExtension.activate();
                    this.isJavaExtensionAvailable = javaExtension.isActive;
                    if (this.isJavaExtensionAvailable) {
                        Logger.debug('Java扩展激活成功，LSP解析可用');
                    } else {
                        Logger.debug('Java扩展激活失败，将使用正则解析');
                    }
                } catch (activationError) {
                    Logger.debug('Java扩展激活失败:', (activationError as Error)?.message);
                    this.isJavaExtensionAvailable = false;
                }
            } else {
                Logger.debug('Java扩展已激活，LSP解析可用');
            }
        } catch (error) {
            Logger.debug('检测Java扩展时出错:', (error as Error)?.message);
            this.isJavaExtensionAvailable = false;
        }
    }

    /**
     * 列出Java相关扩展（用于调试）
     */
    private listJavaRelatedExtensions(): void {
        try {
            const allExtensions = vscode.extensions.all;
            const javaRelated = allExtensions.filter((ext: any) => {
                const id = ext.id.toLowerCase();
                const displayName = (ext.packageJSON?.displayName || '').toLowerCase();
                return id.includes('java') || 
                       id.includes('redhat') || 
                       displayName.includes('java');
            });
            
            if (javaRelated.length > 0) {
                Logger.debug('发现Java相关扩展:');
                javaRelated.forEach((ext: any) => {
                    const status = ext.isActive ? '已激活' : '未激活';
                    Logger.debug(`  - ${ext.id} (${ext.packageJSON?.displayName}) [${status}]`);
                });
            } else {
                Logger.debug('未发现任何Java相关扩展');
            }
        } catch (error) {
            Logger.debug('列出扩展时出错:', (error as Error)?.message);
        }
    }

    /**
     * 使用LSP解析Java文件
     */
    async parseJavaFile(filePath: string, content: string, options: JavaParseOptions): Promise<JavaEntity | null> {
        if (!this.isJavaExtensionAvailable || !vscode) {
            Logger.debug('LSP不可用，跳过LSP解析');
            return null;
        }

        try {
            Logger.debug(`开始LSP解析: ${filePath}`);
            
            // 创建或打开文档
            const uri = vscode.Uri.file(filePath);
            let document: any;
            
            try {
                document = await vscode.workspace.openTextDocument(uri);
            } catch (error) {
                // 如果文件不存在，创建临时文档
                document = await vscode.workspace.openTextDocument({
                    content,
                    language: 'java'
                });
            }

            // 获取文档符号
            const symbols = await this.getDocumentSymbols(document, options.lspTimeout);
            if (!symbols || symbols.length === 0) {
                Logger.debug('LSP未返回符号信息');
                return null;
            }

            // 解析符号信息
            const entity = await this.extractEntityFromSymbols(symbols, document, filePath);
            if (entity) {
                entity.parseMethod = 'lsp';
                entity.confidence = 0.9; // LSP解析置信度较高
                Logger.debug(`LSP解析成功: ${entity.className}`);
            }

            return entity;

        } catch (error) {
            Logger.warn(`LSP解析失败: ${filePath}`, error as Error);
            return null;
        }
    }

    /**
     * 获取文档符号
     */
    private async getDocumentSymbols(document: any, timeout: number): Promise<LSPSymbolInfo[] | null> {
        return new Promise((resolve) => {
            const timer = setTimeout(() => {
                Logger.debug(`LSP符号获取超时 (${timeout}ms)，降级到正则解析`);
                resolve(null);
            }, timeout);

            vscode.commands.executeCommand(
                'vscode.executeDocumentSymbolProvider',
                document.uri
            ).then((symbols: any) => {
                clearTimeout(timer);
                if (symbols && symbols.length > 0) {
                    Logger.debug(`LSP成功获取 ${symbols.length} 个符号`);
                    resolve(symbols as LSPSymbolInfo[]);
                } else {
                    Logger.debug('LSP未返回符号信息，降级到正则解析');
                    resolve(null);
                }
            }).catch((error: any) => {
                clearTimeout(timer);
                Logger.debug('LSP符号获取失败，降级到正则解析:', error?.message || error);
                resolve(null);
            });
        });
    }

    /**
     * 从LSP符号信息中提取实体
     */
    private async extractEntityFromSymbols(
        symbols: LSPSymbolInfo[], 
        document: any, 
        filePath: string
    ): Promise<JavaEntity | null> {
        // 查找类符号 (SymbolKind.Class = 5)
        const classSymbol = symbols.find(s => s.kind === 5);
        if (!classSymbol) {
            return null;
        }

        const className = classSymbol.name;
        const packageName = this.extractPackageFromDocument(document);
        
        // 检查是否为实体类
        const isEntity = await this.isEntityClassFromSymbols(symbols, document);
        if (!isEntity) {
            return null;
        }

        // 提取字段信息
        const fields = await this.extractFieldsFromSymbols(classSymbol.children || [], document);
        
        // 提取类级别注解
        const classAnnotations = await this.extractClassAnnotationsFromSymbols(classSymbol, document);
        
        // 提取表名
        const tableName = this.extractTableNameFromAnnotations(className, classAnnotations);

        return {
            className,
            packageName: packageName || '',
            tableName,
            fields,
            annotations: classAnnotations,
            filePath,
            isEntity: true,
            parseMethod: 'lsp',
            confidence: 0.9
        };
    }

    /**
     * 从文档中提取包名
     */
    private extractPackageFromDocument(document: any): string | null {
        const text = document.getText();
        const packageMatch = text.match(/package\s+([\w.]+)\s*;/);
        return packageMatch ? packageMatch[1] : null;
    }

    /**
     * 检查是否为实体类 - LSP版本，使用与正则解析器相同的宽松策略
     */
    private async isEntityClassFromSymbols(symbols: LSPSymbolInfo[], document: any): Promise<boolean> {
        const text = document.getText();
        
        // 1. 检查类级别注解
        const entityAnnotations = ['@Entity', '@Table', '@TableName', '@Data', '@Component'];
        for (const annotation of entityAnnotations) {
            if (text.includes(annotation)) {
                Logger.debug(`LSP通过类级别注解识别为实体类: ${annotation}`);
                return true;
            }
        }

        // 2. 检查字段注解
        const fieldAnnotations = ['@Id', '@Column', '@TableId', '@TableField'];
        for (const annotation of fieldAnnotations) {
            if (text.includes(annotation)) {
                Logger.debug(`LSP通过字段注解识别为实体类: ${annotation}`);
                return true;
            }
        }

        // 3. 检查是否有getter/setter方法
        const hasGetters = /public\s+\w+\s+get\w+\s*\(/.test(text);
        const hasSetters = /public\s+void\s+set\w+\s*\(/.test(text);
        
        if (hasGetters && hasSetters) {
            Logger.debug('LSP通过getter/setter方法识别为实体类');
            return true;
        }

        // 4. 检查是否有私有字段（常见的实体类特征）
        const hasPrivateFields = /private\s+\w+\s+\w+\s*;/.test(text);
        if (hasPrivateFields) {
            Logger.debug('LSP通过私有字段识别为潜在实体类');
            return true;
        }

        // 5. 检查类名是否符合实体类命名约定
        const classNameMatch = text.match(/(?:public\s+)?class\s+(\w+)/);
        if (classNameMatch) {
            const className = classNameMatch[1];
            // 常见的实体类命名模式
            const entityPatterns = [
                /Entity$/i,     // 以Entity结尾
                /Model$/i,      // 以Model结尾
                /DO$/i,         // 以DO结尾（Data Object）
                /DTO$/i,        // 以DTO结尾（Data Transfer Object）
                /VO$/i,         // 以VO结尾（Value Object）
                /PO$/i,         // 以PO结尾（Persistent Object）
                /Bean$/i        // 以Bean结尾
            ];
            
            for (const pattern of entityPatterns) {
                if (pattern.test(className)) {
                    Logger.debug(`LSP通过类名模式识别为实体类: ${className}`);
                    return true;
                }
            }
        }

        // 6. 检查是否在特定包路径下（常见的实体类包）
        const packageMatch = text.match(/package\s+([\w.]+)\s*;/);
        if (packageMatch) {
            const packageName = packageMatch[1].toLowerCase();
            const entityPackagePatterns = [
                'entity',
                'model',
                'domain',
                'pojo',
                'bean',
                'dto',
                'vo',
                'po'
            ];
            
            for (const pattern of entityPackagePatterns) {
                if (packageName.includes(pattern)) {
                    Logger.debug(`LSP通过包名识别为实体类: ${packageName}`);
                    return true;
                }
            }
        }

        // 7. 检查是否有序列化接口实现（常见的实体类特征）
        if (text.includes('implements Serializable') || text.includes('extends Serializable')) {
            Logger.debug('LSP通过Serializable接口识别为实体类');
            return true;
        }

        // 8. 检查是否有常见的实体类导入
        const entityImports = [
            'javax.persistence',
            'com.baomidou.mybatisplus',
            'org.springframework.data.jpa',
            'lombok.Data',
            'lombok.Entity'
        ];
        
        for (const importPattern of entityImports) {
            if (text.includes(`import ${importPattern}`)) {
                Logger.debug(`LSP通过导入语句识别为实体类: ${importPattern}`);
                return true;
            }
        }

        // 9. 宽松模式 - 如果有多个字段且类名不是明显的工具类，则认为是潜在实体类
        const fieldCount = (text.match(/private\s+\w+\s+\w+\s*;/g) || []).length;
        if (fieldCount >= 2) {
            // 排除明显的工具类、配置类等
            const utilityClassPatterns = [
                /Util$/i,
                /Utils$/i,
                /Helper$/i,
                /Config$/i,
                /Configuration$/i,
                /Constants?$/i,
                /Factory$/i,
                /Builder$/i,
                /Manager$/i,
                /Service$/i,
                /Controller$/i,
                /Repository$/i,
                /Dao$/i
            ];
            
            let isUtilityClass = false;
            if (classNameMatch) {
                const className = classNameMatch[1];
                for (const pattern of utilityClassPatterns) {
                    if (pattern.test(className)) {
                        isUtilityClass = true;
                        break;
                    }
                }
            }
            
            if (!isUtilityClass) {
                Logger.debug(`LSP通过字段数量识别为潜在实体类: ${fieldCount}个字段`);
                return true;
            }
        }

        Logger.debug('LSP未识别为实体类，将跳过解析');
        return false;
    }

    /**
     * 提取类级别注解
     */
    private async extractClassAnnotationsFromSymbols(classSymbol: LSPSymbolInfo, document: any): Promise<JavaAnnotation[]> {
        const text = document.getText();
        const lines = text.split('\n');
        const classLine = classSymbol.location.range.start.line;
        
        // 获取类声明前的注解
        const annotationLines: string[] = [];
        let currentLine = classLine - 1;
        
        while (currentLine >= 0 && lines[currentLine].trim().startsWith('@')) {
            annotationLines.unshift(lines[currentLine]);
            currentLine--;
        }
        
        const annotationText = annotationLines.join('\n');
        return this.parseFieldAnnotationsFromText(annotationText);
    }

    /**
     * 从注解中提取表名
     */
    private extractTableNameFromAnnotations(className: string, annotations: JavaAnnotation[]): string {
        // 从@Table注解中提取
        const tableAnnotation = annotations.find(a => a.name === 'Table');
        if (tableAnnotation && tableAnnotation.attributes.name) {
            return tableAnnotation.attributes.name;
        }

        // 从@TableName注解中提取（MyBatis-Plus）
        const tableNameAnnotation = annotations.find(a => a.name === 'TableName');
        if (tableNameAnnotation && tableNameAnnotation.attributes.value) {
            return tableNameAnnotation.attributes.value;
        }

        // 根据类名推断表名（驼峰转下划线）
        return this.camelToSnakeCase(className);
    }

    /**
     * 解析注解属性
     */
    private parseAnnotationAttributes(attributesText: string): Record<string, any> {
        const attributes: Record<string, any> = {};
        
        if (!attributesText.trim()) {
            return attributes;
        }
        
        // 处理简单的value属性
        if (!attributesText.includes('=')) {
            attributes.value = this.parseAttributeValue(attributesText.trim());
            return attributes;
        }
        
        // 解析键值对
        const pairs = attributesText.split(',');
        for (const pair of pairs) {
            const [key, value] = pair.split('=').map(s => s.trim());
            if (key && value) {
                attributes[key] = this.parseAttributeValue(value);
            }
        }
        
        return attributes;
    }

    /**
     * 解析属性值
     */
    private parseAttributeValue(value: string): any {
        value = value.trim();
        
        // 移除引号
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            return value.slice(1, -1);
        }
        
        // 布尔值
        if (value === 'true') return true;
        if (value === 'false') return false;
        
        // 数字
        if (/^\d+$/.test(value)) {
            return parseInt(value, 10);
        }
        
        if (/^\d+\.\d+$/.test(value)) {
            return parseFloat(value);
        }
        
        return value;
    }

    /**
     * 映射Java类型到数据库类型
     */
    private mapJavaTypeToDbType(javaType: string): string {
        const TYPE_MAPPINGS: Record<string, string> = {
            'String': 'VARCHAR',
            'Integer': 'INT',
            'int': 'INT',
            'Long': 'BIGINT',
            'long': 'BIGINT',
            'Double': 'DOUBLE',
            'double': 'DOUBLE',
            'Float': 'FLOAT',
            'float': 'FLOAT',
            'Boolean': 'BOOLEAN',
            'boolean': 'BOOLEAN',
            'Date': 'DATETIME',
            'LocalDate': 'DATE',
            'LocalDateTime': 'DATETIME',
            'LocalTime': 'TIME',
            'BigDecimal': 'DECIMAL',
            'byte[]': 'BLOB',
            'Byte[]': 'BLOB'
        };

        // 移除泛型
        const baseType = javaType.replace(/<[^>]+>/g, '');
        return TYPE_MAPPINGS[baseType] || 'VARCHAR';
    }

    /**
     * 驼峰转下划线
     */
    private camelToSnakeCase(str: string): string {
        return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
    }

    /**
     * 获取Java扩展可用性状态
     */
    getJavaExtensionStatus(): boolean {
        return this.isJavaExtensionAvailable;
    }

    /**
     * 从符号信息中提取字段
     */
    private async extractFieldsFromSymbols(fieldSymbols: LSPSymbolInfo[], document: any): Promise<JavaField[]> {
        const fields: JavaField[] = [];
        const text = document.getText();
        const lines = text.split('\n');

        for (const symbol of fieldSymbols) {
            // 只处理字段符号 (SymbolKind.Field = 8)
            if (symbol.kind !== 8) continue;

            const fieldName = symbol.name;
            const line = symbol.location.range.start.line;
            
            // 获取字段声明行及其上方的注解行
            const fieldLines = this.getFieldDeclarationLines(lines, line);
            const fieldText = fieldLines.join('\n');

            // 提取字段类型
            const javaType = this.extractFieldType(fieldText, fieldName);
            if (!javaType) continue;

            // 解析字段注解
            const fieldAnnotations = this.parseFieldAnnotationsFromText(fieldText);
            
            // 提取列名
            const columnName = this.extractColumnNameFromAnnotations(fieldName, fieldAnnotations);
            
            // 判断字段属性
            const isPrimaryKey = this.isPrimaryKeyFromAnnotations(fieldAnnotations);
            const isForeignKey = this.isForeignKeyFromAnnotations(fieldName, fieldAnnotations);
            const nullable = this.isNullableFromAnnotations(fieldAnnotations);
            
            // 映射数据库类型
            const dbType = this.mapJavaTypeToDbType(javaType);

            fields.push({
                name: fieldName,
                javaType,
                columnName,
                dbType,
                isPrimaryKey,
                isForeignKey,
                nullable,
                annotations: fieldAnnotations,
                position: {
                    line: symbol.location.range.start.line,
                    character: symbol.location.range.start.character
                }
            });
        }

        return fields;
    }

    /**
     * 获取字段声明相关行（包括注解）
     */
    private getFieldDeclarationLines(lines: string[], fieldLine: number): string[] {
        const result: string[] = [];
        
        // 向上查找注解行
        let currentLine = fieldLine - 1;
        while (currentLine >= 0 && lines[currentLine].trim().startsWith('@')) {
            result.unshift(lines[currentLine]);
            currentLine--;
        }
        
        // 添加字段声明行
        if (fieldLine < lines.length) {
            result.push(lines[fieldLine]);
        }
        
        return result;
    }

    /**
     * 从字段文本中提取字段类型
     */
    private extractFieldType(fieldText: string, fieldName: string): string | null {
        const typePattern = new RegExp(`(?:private|protected|public)?\\s+(\\w+(?:<[^>]+>)?)\\s+${fieldName}\\s*[;=]`);
        const match = fieldText.match(typePattern);
        return match ? match[1] : null;
    }

    /**
     * 从文本中解析字段注解
     */
    private parseFieldAnnotationsFromText(fieldText: string): JavaAnnotation[] {
        const annotations: JavaAnnotation[] = [];
        const annotationMatches = fieldText.matchAll(/@(\w+)(?:\(([^)]*)\))?/g);
        
        for (const match of annotationMatches) {
            const name = match[1];
            const attributesText = match[2] || '';
            const attributes = this.parseAnnotationAttributes(attributesText);
            
            annotations.push({
                name,
                attributes,
                rawText: match[0]
            });
        }
        
        return annotations;
    }

    /**
     * 从注解中提取列名
     */
    private extractColumnNameFromAnnotations(fieldName: string, annotations: JavaAnnotation[]): string {
        // 从@Column注解中提取
        const columnAnnotation = annotations.find(a => a.name === 'Column');
        if (columnAnnotation && columnAnnotation.attributes.name) {
            return columnAnnotation.attributes.name;
        }

        // 从@TableField注解中提取（MyBatis-Plus）
        const tableFieldAnnotation = annotations.find(a => a.name === 'TableField');
        if (tableFieldAnnotation && tableFieldAnnotation.attributes.value) {
            return tableFieldAnnotation.attributes.value;
        }

        // 根据字段名推断列名（驼峰转下划线）
        return this.camelToSnakeCase(fieldName);
    }

    /**
     * 从注解判断是否为主键
     */
    private isPrimaryKeyFromAnnotations(annotations: JavaAnnotation[]): boolean {
        return annotations.some(a => a.name === 'Id' || a.name === 'TableId');
    }

    /**
     * 从注解判断是否为外键
     */
    private isForeignKeyFromAnnotations(fieldName: string, annotations: JavaAnnotation[]): boolean {
        // 检查@JoinColumn注解
        if (annotations.some(a => a.name === 'JoinColumn')) {
            return true;
        }
        
        // 检查关系注解
        const relationAnnotations = ['OneToOne', 'OneToMany', 'ManyToOne', 'ManyToMany'];
        if (annotations.some(a => relationAnnotations.includes(a.name))) {
            return true;
        }
        
        // 根据命名约定判断（以Id结尾且不是主键）
        if (fieldName.endsWith('Id') && fieldName !== 'id') {
            return true;
        }
        
        return false;
    }

    /**
     * 从注解判断是否可空
     */
    private isNullableFromAnnotations(annotations: JavaAnnotation[]): boolean {
        const columnAnnotation = annotations.find(a => a.name === 'Column');
        if (columnAnnotation && columnAnnotation.attributes.nullable !== undefined) {
            return columnAnnotation.attributes.nullable;
        }
        
        // 默认可空
        return true;
    }
}

/**
 * 智能Java解析器
 * 支持MyBatis/MyBatis-Plus注解识别和实体类解析
 * 集成LSP和正则解析的混合策略
 */
export class SmartJavaParser {
    private static readonly ENTITY_ANNOTATIONS = [
        'Entity', 'Table', 'TableName', 'Data', 'Component'
    ];
    
    private static readonly FIELD_ANNOTATIONS = [
        'Id', 'Column', 'TableId', 'TableField', 'JoinColumn', 'OneToOne', 'OneToMany', 'ManyToOne', 'ManyToMany'
    ];
    
    private static readonly TYPE_MAPPINGS: Record<string, string> = {
        'String': 'VARCHAR',
        'Integer': 'INT',
        'int': 'INT',
        'Long': 'BIGINT',
        'long': 'BIGINT',
        'Double': 'DOUBLE',
        'double': 'DOUBLE',
        'Float': 'FLOAT',
        'float': 'FLOAT',
        'Boolean': 'BOOLEAN',
        'boolean': 'BOOLEAN',
        'Date': 'DATETIME',
        'LocalDate': 'DATE',
        'LocalDateTime': 'DATETIME',
        'LocalTime': 'TIME',
        'BigDecimal': 'DECIMAL',
        'byte[]': 'BLOB',
        'Byte[]': 'BLOB'
    };

    private lspParser: LSPJavaParser;
    private cache: ParseResultCache;

    constructor() {
        this.lspParser = LSPJavaParser.getInstance();
        this.cache = new ParseResultCache();
    }

    /**
     * 解析Java文件 - 混合策略入口
     */
    async parseJavaFile(
        filePath: string, 
        content: string, 
        options: Partial<JavaParseOptions> = {}
    ): Promise<JavaEntity | null> {
        const parseOptions: JavaParseOptions = {
            parseMethodBodies: false,
            includeComments: true,
            parseImports: true,
            maxFileSize: 10 * 1024 * 1024, // 10MB
            enableLSP: true,
            lspTimeout: 3000, // 3秒超时
            enableHybrid: true,
            ...options
        };

        try {
            Logger.debug(`开始混合解析Java文件: ${filePath}`);
            
            // 检查缓存
            const cacheKey = this.cache.getCacheKey(filePath, content);
            const cachedResult = this.cache.get(cacheKey);
            if (cachedResult) {
                Logger.debug(`使用缓存结果: ${cachedResult.className}`);
                return cachedResult;
            }

            // 检查文件大小
            if (content.length > parseOptions.maxFileSize) {
                throw new Error(`文件过大: ${content.length} bytes`);
            }

            let finalResult: JavaEntity | null = null;

            // 策略1: 尝试LSP解析（如果启用且可用）
            if (parseOptions.enableLSP && vscode) {
                try {
                    const lspResult = await this.lspParser.parseJavaFile(filePath, content, parseOptions);
                    if (lspResult) {
                        Logger.debug(`LSP解析成功: ${lspResult.className}`);
                        
                        if (parseOptions.enableHybrid) {
                            // 混合策略：使用正则解析补充MyBatis特定信息
                            const regexResult = await this.parseJavaFileWithRegex(filePath, content, parseOptions);
                            if (regexResult) {
                                finalResult = this.mergeParseResults(lspResult, regexResult);
                                finalResult.parseMethod = 'hybrid';
                                finalResult.confidence = Math.min(lspResult.confidence + 0.05, 0.95);
                                Logger.debug(`混合解析完成: ${finalResult.className}`);
                            } else {
                                finalResult = lspResult;
                            }
                        } else {
                            finalResult = lspResult;
                        }
                    }
                } catch (error) {
                    Logger.warn(`LSP解析失败，降级到正则解析: ${filePath}`, error as Error);
                }
            }

            // 策略2: 降级到正则解析
            if (!finalResult) {
                finalResult = await this.parseJavaFileWithRegex(filePath, content, parseOptions);
                if (finalResult) {
                    finalResult.parseMethod = 'regex';
                    finalResult.confidence = 0.7; // 正则解析置信度较低
                    Logger.debug(`正则解析完成: ${finalResult.className}`);
                }
            }

            // 缓存结果
            if (finalResult) {
                this.cache.set(cacheKey, finalResult);
            }

            return finalResult;

        } catch (error) {
            Logger.error(`解析Java文件失败: ${filePath}`, error as Error);
            throw error;
        }
    }

    /**
     * 批量解析Java文件
     */
    async parseJavaFiles(
        files: Array<{ filePath: string; content: string }>,
        options: Partial<JavaParseOptions> = {}
    ): Promise<JavaEntity[]> {
        const entities: JavaEntity[] = [];
        
        for (const file of files) {
            try {
                const entity = await this.parseJavaFile(file.filePath, file.content, options);
                if (entity) {
                    entities.push(entity);
                }
            } catch (error) {
                Logger.warn(`跳过解析失败的文件: ${file.filePath}`, error as Error);
            }
        }
        
        return entities;
    }

    /**
     * 移除Java注释
     */
    private removeComments(content: string): string {
        // 移除单行注释
        content = content.replace(/\/\/.*$/gm, '');
        
        // 移除多行注释
        content = content.replace(/\/\*[\s\S]*?\*\//g, '');
        
        return content;
    }

    /**
     * 提取包名
     */
    private extractPackageName(content: string): string | null {
        const packageMatch = content.match(/package\s+([\w.]+)\s*;/);
        return packageMatch ? packageMatch[1] : null;
    }

    /**
     * 提取类名
     */
    private extractClassName(content: string): string | null {
        const classMatch = content.match(/(?:public\s+)?class\s+(\w+)/);
        return classMatch ? classMatch[1] : null;
    }

    /**
     * 检查是否为实体类 - 改进版本，更加宽松的识别策略
     */
    private isEntityClass(content: string): boolean {
        // 1. 检查类级别注解（原有逻辑）
        for (const annotation of SmartJavaParser.ENTITY_ANNOTATIONS) {
            if (content.includes(`@${annotation}`)) {
                Logger.debug(`通过类级别注解识别为实体类: @${annotation}`);
                return true;
            }
        }

        // 2. 检查字段注解（原有逻辑）
        for (const annotation of SmartJavaParser.FIELD_ANNOTATIONS) {
            if (content.includes(`@${annotation}`)) {
                Logger.debug(`通过字段注解识别为实体类: @${annotation}`);
                return true;
            }
        }

        // 3. 检查是否有getter/setter方法（原有逻辑）
        const hasGetters = /public\s+\w+\s+get\w+\s*\(/.test(content);
        const hasSetters = /public\s+void\s+set\w+\s*\(/.test(content);
        
        if (hasGetters && hasSetters) {
            Logger.debug('通过getter/setter方法识别为实体类');
            return true;
        }

        // 4. 新增：检查是否有私有字段（常见的实体类特征）
        const hasPrivateFields = /private\s+\w+\s+\w+\s*;/.test(content);
        if (hasPrivateFields) {
            Logger.debug('通过私有字段识别为潜在实体类');
            return true;
        }

        // 5. 新增：检查类名是否符合实体类命名约定
        const classNameMatch = content.match(/(?:public\s+)?class\s+(\w+)/);
        if (classNameMatch) {
            const className = classNameMatch[1];
            // 常见的实体类命名模式
            const entityPatterns = [
                /Entity$/i,     // 以Entity结尾
                /Model$/i,      // 以Model结尾
                /DO$/i,         // 以DO结尾（Data Object）
                /DTO$/i,        // 以DTO结尾（Data Transfer Object）
                /VO$/i,         // 以VO结尾（Value Object）
                /PO$/i,         // 以PO结尾（Persistent Object）
                /Bean$/i        // 以Bean结尾
            ];
            
            for (const pattern of entityPatterns) {
                if (pattern.test(className)) {
                    Logger.debug(`通过类名模式识别为实体类: ${className}`);
                    return true;
                }
            }
        }

        // 6. 新增：检查是否在特定包路径下（常见的实体类包）
        const packageMatch = content.match(/package\s+([\w.]+)\s*;/);
        if (packageMatch) {
            const packageName = packageMatch[1].toLowerCase();
            const entityPackagePatterns = [
                'entity',
                'model',
                'domain',
                'pojo',
                'bean',
                'dto',
                'vo',
                'po'
            ];
            
            for (const pattern of entityPackagePatterns) {
                if (packageName.includes(pattern)) {
                    Logger.debug(`通过包名识别为实体类: ${packageName}`);
                    return true;
                }
            }
        }

        // 7. 新增：检查是否有序列化接口实现（常见的实体类特征）
        if (content.includes('implements Serializable') || content.includes('extends Serializable')) {
            Logger.debug('通过Serializable接口识别为实体类');
            return true;
        }

        // 8. 新增：检查是否有常见的实体类导入
        const entityImports = [
            'javax.persistence',
            'com.baomidou.mybatisplus',
            'org.springframework.data.jpa',
            'lombok.Data',
            'lombok.Entity'
        ];
        
        for (const importPattern of entityImports) {
            if (content.includes(`import ${importPattern}`)) {
                Logger.debug(`通过导入语句识别为实体类: ${importPattern}`);
                return true;
            }
        }

        // 9. 新增：宽松模式 - 如果有多个字段且类名不是明显的工具类，则认为是潜在实体类
        const fieldCount = (content.match(/private\s+\w+\s+\w+\s*;/g) || []).length;
        if (fieldCount >= 2) {
            // 排除明显的工具类、配置类等
            const utilityClassPatterns = [
                /Util$/i,
                /Utils$/i,
                /Helper$/i,
                /Config$/i,
                /Configuration$/i,
                /Constants?$/i,
                /Factory$/i,
                /Builder$/i,
                /Manager$/i,
                /Service$/i,
                /Controller$/i,
                /Repository$/i,
                /Dao$/i
            ];
            
            let isUtilityClass = false;
            if (classNameMatch) {
                const className = classNameMatch[1];
                for (const pattern of utilityClassPatterns) {
                    if (pattern.test(className)) {
                        isUtilityClass = true;
                        break;
                    }
                }
            }
            
            if (!isUtilityClass) {
                Logger.debug(`通过字段数量识别为潜在实体类: ${fieldCount}个字段`);
                return true;
            }
        }

        Logger.debug('未识别为实体类，将跳过解析');
        return false;
    }

    /**
     * 提取类级别注解
     */
    private extractClassAnnotations(content: string): JavaAnnotation[] {
        const annotations: JavaAnnotation[] = [];
        
        // 匹配类声明前的注解
        const classMatch = content.match(/((?:@\w+(?:\([^)]*\))?\s*)*)\s*(?:public\s+)?class\s+\w+/);
        if (!classMatch) return annotations;
        
        const annotationText = classMatch[1];
        const annotationMatches = annotationText.matchAll(/@(\w+)(?:\(([^)]*)\))?/g);
        
        for (const match of annotationMatches) {
            const name = match[1];
            const attributesText = match[2] || '';
            const attributes = this.parseAnnotationAttributes(attributesText);
            
            annotations.push({
                name,
                attributes,
                rawText: match[0]
            });
        }
        
        return annotations;
    }

    /**
     * 提取表名
     */
    private extractTableName(content: string, className: string, annotations: JavaAnnotation[]): string {
        // 从@Table注解中提取
        const tableAnnotation = annotations.find(a => a.name === 'Table');
        if (tableAnnotation && tableAnnotation.attributes.name) {
            return tableAnnotation.attributes.name;
        }

        // 从@TableName注解中提取（MyBatis-Plus）
        const tableNameAnnotation = annotations.find(a => a.name === 'TableName');
        if (tableNameAnnotation && tableNameAnnotation.attributes.value) {
            return tableNameAnnotation.attributes.value;
        }

        // 根据类名推断表名（驼峰转下划线）
        return this.camelToSnakeCase(className);
    }

    /**
     * 提取字段信息
     */
    private extractFields(content: string, options: JavaParseOptions): JavaField[] {
        const fields: JavaField[] = [];
        
        // 匹配字段声明
        const fieldPattern = /((?:@\w+(?:\([^)]*\))?\s*)*)\s*(?:private|protected|public)?\s+(\w+(?:<[^>]+>)?)\s+(\w+)\s*;/g;
        
        let match;
        while ((match = fieldPattern.exec(content)) !== null) {
            const annotationText = match[1];
            const javaType = match[2];
            const fieldName = match[3];
            
            // 跳过静态字段和常量
            if (content.includes(`static ${javaType} ${fieldName}`) || 
                content.includes(`final ${javaType} ${fieldName}`)) {
                continue;
            }
            
            // 解析字段注解
            const fieldAnnotations = this.parseFieldAnnotations(annotationText);
            
            // 提取列名
            const columnName = this.extractColumnName(fieldName, fieldAnnotations);
            
            // 判断是否为主键
            const isPrimaryKey = this.isPrimaryKey(fieldAnnotations);
            
            // 判断是否为外键
            const isForeignKey = this.isForeignKey(fieldName, fieldAnnotations);
            
            // 判断是否可空
            const nullable = this.isNullable(fieldAnnotations);
            
            // 映射数据库类型
            const dbType = this.mapJavaTypeToDbType(javaType);

            fields.push({
                name: fieldName,
                javaType,
                columnName,
                dbType,
                isPrimaryKey,
                isForeignKey,
                nullable,
                annotations: fieldAnnotations
            });
        }
        
        return fields;
    }

    /**
     * 解析字段注解
     */
    private parseFieldAnnotations(annotationText: string): JavaAnnotation[] {
        const annotations: JavaAnnotation[] = [];
        const annotationMatches = annotationText.matchAll(/@(\w+)(?:\(([^)]*)\))?/g);
        
        for (const match of annotationMatches) {
            const name = match[1];
            const attributesText = match[2] || '';
            const attributes = this.parseAnnotationAttributes(attributesText);
            
            annotations.push({
                name,
                attributes,
                rawText: match[0]
            });
        }
        
        return annotations;
    }

    /**
     * 解析注解属性
     */
    private parseAnnotationAttributes(attributesText: string): Record<string, any> {
        const attributes: Record<string, any> = {};
        
        if (!attributesText.trim()) {
            return attributes;
        }
        
        // 处理简单的value属性
        if (!attributesText.includes('=')) {
            attributes.value = this.parseAttributeValue(attributesText.trim());
            return attributes;
        }
        
        // 解析键值对
        const pairs = attributesText.split(',');
        for (const pair of pairs) {
            const [key, value] = pair.split('=').map(s => s.trim());
            if (key && value) {
                attributes[key] = this.parseAttributeValue(value);
            }
        }
        
        return attributes;
    }

    /**
     * 解析属性值
     */
    private parseAttributeValue(value: string): any {
        value = value.trim();
        
        // 移除引号
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            return value.slice(1, -1);
        }
        
        // 布尔值
        if (value === 'true') return true;
        if (value === 'false') return false;
        
        // 数字
        if (/^\d+$/.test(value)) {
            return parseInt(value, 10);
        }
        
        if (/^\d+\.\d+$/.test(value)) {
            return parseFloat(value);
        }
        
        return value;
    }

    /**
     * 提取列名
     */
    private extractColumnName(fieldName: string, annotations: JavaAnnotation[]): string {
        // 从@Column注解中提取
        const columnAnnotation = annotations.find(a => a.name === 'Column');
        if (columnAnnotation && columnAnnotation.attributes.name) {
            return columnAnnotation.attributes.name;
        }

        // 从@TableField注解中提取（MyBatis-Plus）
        const tableFieldAnnotation = annotations.find(a => a.name === 'TableField');
        if (tableFieldAnnotation && tableFieldAnnotation.attributes.value) {
            return tableFieldAnnotation.attributes.value;
        }

        // 根据字段名推断列名（驼峰转下划线）
        return this.camelToSnakeCase(fieldName);
    }

    /**
     * 判断是否为主键
     */
    private isPrimaryKey(annotations: JavaAnnotation[]): boolean {
        return annotations.some(a => a.name === 'Id' || a.name === 'TableId');
    }

    /**
     * 判断是否为外键
     */
    private isForeignKey(fieldName: string, annotations: JavaAnnotation[]): boolean {
        // 检查@JoinColumn注解
        if (annotations.some(a => a.name === 'JoinColumn')) {
            return true;
        }
        
        // 检查关系注解
        const relationAnnotations = ['OneToOne', 'OneToMany', 'ManyToOne', 'ManyToMany'];
        if (annotations.some(a => relationAnnotations.includes(a.name))) {
            return true;
        }
        
        // 根据命名约定判断（以Id结尾且不是主键）
        if (fieldName.endsWith('Id') && fieldName !== 'id') {
            return true;
        }
        
        return false;
    }

    /**
     * 判断是否可空
     */
    private isNullable(annotations: JavaAnnotation[]): boolean {
        const columnAnnotation = annotations.find(a => a.name === 'Column');
        if (columnAnnotation && columnAnnotation.attributes.nullable !== undefined) {
            return columnAnnotation.attributes.nullable;
        }
        
        // 默认可空
        return true;
    }

    /**
     * 使用正则表达式解析Java文件（原有实现）
     */
    private async parseJavaFileWithRegex(
        filePath: string, 
        content: string, 
        options: JavaParseOptions
    ): Promise<JavaEntity | null> {
        try {
            // 预处理：移除注释（如果不需要）
            let processedContent = content;
            if (!options.includeComments) {
                processedContent = this.removeComments(content);
            }

            // 提取基本信息
            const packageName = this.extractPackageName(processedContent);
            const className = this.extractClassName(processedContent);
            
            if (!className) {
                Logger.warn(`无法提取类名: ${filePath}`);
                return null;
            }

            // 检查是否为实体类
            const isEntity = this.isEntityClass(processedContent);
            if (!isEntity) {
                Logger.debug(`非实体类，跳过: ${className}`);
                return null;
            }

            // 提取类级别注解
            const classAnnotations = this.extractClassAnnotations(processedContent);
            
            // 提取表名
            const tableName = this.extractTableName(processedContent, className, classAnnotations);
            
            // 提取字段信息
            const fields = this.extractFields(processedContent, options);

            const entity: JavaEntity = {
                className,
                packageName: packageName || '',
                tableName,
                fields,
                annotations: classAnnotations,
                filePath,
                isEntity: true,
                parseMethod: 'regex',
                confidence: 0.7
            };

            return entity;

        } catch (error) {
            Logger.error(`正则解析Java文件失败: ${filePath}`, error as Error);
            throw error;
        }
    }

    /**
     * 合并LSP和正则解析结果
     */
    private mergeParseResults(lspResult: JavaEntity, regexResult: JavaEntity): JavaEntity {
        // 以LSP结果为基础，用正则结果补充MyBatis特定信息
        const merged: JavaEntity = { ...lspResult };

        // 合并字段信息
        merged.fields = merged.fields.map(lspField => {
            const regexField = regexResult.fields.find(rf => rf.name === lspField.name);
            if (regexField) {
                // 优先使用正则解析的MyBatis特定属性
                return {
                    ...lspField,
                    columnName: regexField.columnName || lspField.columnName,
                    isPrimaryKey: regexField.isPrimaryKey || lspField.isPrimaryKey,
                    isForeignKey: regexField.isForeignKey || lspField.isForeignKey,
                    annotations: this.mergeAnnotations(lspField.annotations, regexField.annotations)
                };
            }
            return lspField;
        });

        // 添加正则解析发现的额外字段
        const lspFieldNames = new Set(merged.fields.map(f => f.name));
        const additionalFields = regexResult.fields.filter(rf => !lspFieldNames.has(rf.name));
        merged.fields.push(...additionalFields);

        // 合并类级别注解
        merged.annotations = this.mergeAnnotations(merged.annotations, regexResult.annotations);

        // 优先使用正则解析的表名（更准确识别MyBatis注解）
        if (regexResult.tableName && regexResult.tableName !== this.camelToSnakeCase(regexResult.className)) {
            merged.tableName = regexResult.tableName;
        }

        return merged;
    }

    /**
     * 合并注解信息
     */
    private mergeAnnotations(lspAnnotations: JavaAnnotation[], regexAnnotations: JavaAnnotation[]): JavaAnnotation[] {
        const merged = [...lspAnnotations];
        const lspAnnotationNames = new Set(lspAnnotations.map(a => a.name));

        // 添加正则解析发现的额外注解
        for (const regexAnnotation of regexAnnotations) {
            if (!lspAnnotationNames.has(regexAnnotation.name)) {
                merged.push(regexAnnotation);
            }
        }

        return merged;
    }

    /**
     * 清除缓存
     */
    clearCache(): void {
        this.cache.clear();
    }

    /**
     * 获取解析统计信息
     */
    getParseStats(entities: JavaEntity[]): {
        total: number;
        lspParsed: number;
        regexParsed: number;
        hybridParsed: number;
        averageConfidence: number;
    } {
        const total = entities.length;
        const lspParsed = entities.filter(e => e.parseMethod === 'lsp').length;
        const regexParsed = entities.filter(e => e.parseMethod === 'regex').length;
        const hybridParsed = entities.filter(e => e.parseMethod === 'hybrid').length;
        const averageConfidence = total > 0 ? entities.reduce((sum, e) => sum + e.confidence, 0) / total : 0;

        return {
            total,
            lspParsed,
            regexParsed,
            hybridParsed,
            averageConfidence
        };
    }

    /**
     * 获取解析器状态报告
     */
    getParserStatus(): {
        isWorkerThread: boolean;
        vscodeApiAvailable: boolean;
        javaExtensionAvailable: boolean;
        recommendedStrategy: string;
        statusMessage: string;
    } {
        const javaExtensionAvailable = this.lspParser.getJavaExtensionStatus();
        
        let recommendedStrategy = 'regex';
        let statusMessage = '';
        
        if (isWorkerThread) {
            recommendedStrategy = 'regex';
            statusMessage = '当前在Worker线程中，自动使用正则解析策略';
        } else if (!vscode) {
            recommendedStrategy = 'regex';
            statusMessage = 'VS Code API不可用，使用正则解析策略';
        } else if (!javaExtensionAvailable) {
            recommendedStrategy = 'regex';
            statusMessage = 'Java扩展不可用，建议安装 "Language Support for Java(TM) by Red Hat" 以获得更好效果';
        } else {
            recommendedStrategy = 'hybrid';
            statusMessage = 'Java扩展可用，推荐使用混合解析策略获得最佳效果';
        }
        
        return {
            isWorkerThread,
            vscodeApiAvailable: !!vscode,
            javaExtensionAvailable,
            recommendedStrategy,
            statusMessage
        };
    }

    /**
     * 验证解析结果
     */
    validateEntity(entity: JavaEntity): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        
        if (!entity.className) {
            errors.push('缺少类名');
        }
        
        if (!entity.tableName) {
            errors.push('缺少表名');
        }
        
        if (entity.fields.length === 0) {
            errors.push('没有找到字段');
        }
        
        // 检查是否有主键
        const hasPrimaryKey = entity.fields.some(f => f.isPrimaryKey);
        if (!hasPrimaryKey) {
            errors.push('没有找到主键字段');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * 映射Java类型到数据库类型
     */
    private mapJavaTypeToDbType(javaType: string): string {
        // 移除泛型
        const baseType = javaType.replace(/<[^>]+>/g, '');
        
        return SmartJavaParser.TYPE_MAPPINGS[baseType] || 'VARCHAR';
    }

    /**
     * 驼峰转下划线
     */
    private camelToSnakeCase(str: string): string {
        return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
    }
} 