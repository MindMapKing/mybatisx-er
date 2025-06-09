// 在Worker线程中使用简单的console日志
const Logger = {
    debug: (message: string, ...args: any[]) => console.log(`[DEBUG] ${message}`, ...args),
    info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
    warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${message}`, ...args),
    error: (message: string, error?: Error) => console.error(`[ERROR] ${message}`, error)
};

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
}

/**
 * 智能Java解析器
 * 支持MyBatis/MyBatis-Plus注解识别和实体类解析
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

    /**
     * 解析Java文件
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
            ...options
        };

        try {
            Logger.debug(`开始解析Java文件: ${filePath}`);
            
            // 检查文件大小
            if (content.length > parseOptions.maxFileSize) {
                throw new Error(`文件过大: ${content.length} bytes`);
            }

            // 预处理：移除注释（如果不需要）
            let processedContent = content;
            if (!parseOptions.includeComments) {
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
            const fields = this.extractFields(processedContent, parseOptions);

            const entity: JavaEntity = {
                className,
                packageName: packageName || '',
                tableName,
                fields,
                annotations: classAnnotations,
                filePath,
                isEntity: true
            };

            Logger.debug(`Java文件解析完成: ${className}, 字段数: ${fields.length}`);
            return entity;

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
     * 检查是否为实体类
     */
    private isEntityClass(content: string): boolean {
        // 检查类级别注解
        for (const annotation of SmartJavaParser.ENTITY_ANNOTATIONS) {
            if (content.includes(`@${annotation}`)) {
                return true;
            }
        }

        // 检查是否有字段注解
        for (const annotation of SmartJavaParser.FIELD_ANNOTATIONS) {
            if (content.includes(`@${annotation}`)) {
                return true;
            }
        }

        // 检查是否有getter/setter方法
        const hasGetters = /public\s+\w+\s+get\w+\s*\(/.test(content);
        const hasSetters = /public\s+void\s+set\w+\s*\(/.test(content);
        
        if (hasGetters && hasSetters) {
            return true;
        }

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
} 