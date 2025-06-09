// 在Worker线程中使用简单的console日志
const Logger = {
    debug: (message: string, ...args: any[]) => console.log(`[DEBUG] ${message}`, ...args),
    info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
    warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${message}`, ...args),
    error: (message: string, error?: Error) => console.error(`[ERROR] ${message}`, error)
};

/**
 * XML映射信息接口
 */
export interface XmlMapping {
    /** 映射ID */
    id: string;
    /** 映射类型 */
    type: 'select' | 'insert' | 'update' | 'delete' | 'resultMap';
    /** 结果类型 */
    resultType?: string;
    /** 结果映射 */
    resultMap?: string;
    /** SQL语句 */
    sql?: string;
    /** 参数类型 */
    parameterType?: string;
    /** 文件路径 */
    filePath: string;
}

/**
 * XML关系信息接口
 */
export interface XmlRelation {
    /** 关系ID */
    id: string;
    /** 源表 */
    sourceTable: string;
    /** 目标表 */
    targetTable: string;
    /** 关系类型 */
    type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
    /** 外键字段 */
    foreignKey?: string;
    /** 连接条件 */
    joinCondition?: string;
    /** 置信度 */
    confidence: number;
    /** 来源 */
    source: 'association' | 'collection' | 'join' | 'sql';
}

/**
 * ResultMap信息接口
 */
export interface ResultMapInfo {
    /** ResultMap ID */
    id: string;
    /** 类型 */
    type: string;
    /** 字段映射 */
    fieldMappings: FieldMapping[];
    /** 关联映射 */
    associations: AssociationMapping[];
    /** 集合映射 */
    collections: CollectionMapping[];
}

/**
 * 字段映射接口
 */
export interface FieldMapping {
    /** 属性名 */
    property: string;
    /** 列名 */
    column: string;
    /** Java类型 */
    javaType?: string;
    /** JDBC类型 */
    jdbcType?: string;
    /** 是否为ID */
    isId: boolean;
}

/**
 * 关联映射接口
 */
export interface AssociationMapping {
    /** 属性名 */
    property: string;
    /** Java类型 */
    javaType: string;
    /** 列名 */
    column?: string;
    /** 外部ResultMap */
    resultMap?: string;
    /** 嵌套查询 */
    select?: string;
}

/**
 * 集合映射接口
 */
export interface CollectionMapping {
    /** 属性名 */
    property: string;
    /** 元素类型 */
    ofType: string;
    /** 列名 */
    column?: string;
    /** 外部ResultMap */
    resultMap?: string;
    /** 嵌套查询 */
    select?: string;
}

/**
 * XML解析选项接口
 */
export interface XmlParseOptions {
    /** 是否解析SQL语句 */
    parseSql: boolean;
    /** 是否提取关系 */
    extractRelations: boolean;
    /** 是否解析ResultMap */
    parseResultMaps: boolean;
    /** 最大文件大小 */
    maxFileSize: number;
}

/**
 * 智能XML解析器
 * 支持MyBatis映射文件解析和关系推断
 */
export class SmartXmlParser {
    private static readonly SQL_KEYWORDS = [
        'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN',
        'ON', 'AND', 'OR', 'GROUP BY', 'ORDER BY', 'HAVING', 'UNION'
    ];

    /**
     * 解析XML文件
     */
    async parseXmlFile(
        filePath: string,
        content: string,
        options: Partial<XmlParseOptions> = {}
    ): Promise<{
        namespace: string;
        mappings: XmlMapping[];
        relations: XmlRelation[];
        resultMaps: ResultMapInfo[];
    } | null> {
        const parseOptions: XmlParseOptions = {
            parseSql: true,
            extractRelations: true,
            parseResultMaps: true,
            maxFileSize: 10 * 1024 * 1024, // 10MB
            ...options
        };

        try {
            Logger.debug(`开始解析XML文件: ${filePath}`);

            // 检查文件大小
            if (content.length > parseOptions.maxFileSize) {
                throw new Error(`文件过大: ${content.length} bytes`);
            }

            // 检查是否为MyBatis映射文件
            if (!this.isMyBatisMapperFile(content)) {
                Logger.debug(`非MyBatis映射文件，跳过: ${filePath}`);
                return null;
            }

            // 提取命名空间
            const namespace = this.extractNamespace(content);
            if (!namespace) {
                Logger.warn(`无法提取命名空间: ${filePath}`);
                return null;
            }

            // 解析映射语句
            const mappings = this.extractMappings(content, filePath, parseOptions);

            // 解析ResultMap
            const resultMaps = parseOptions.parseResultMaps ? 
                this.extractResultMaps(content) : [];

            // 提取关系
            const relations = parseOptions.extractRelations ? 
                this.extractRelations(content, mappings, resultMaps) : [];

            Logger.debug(`XML文件解析完成: ${namespace}, 映射数: ${mappings.length}, 关系数: ${relations.length}`);

            return {
                namespace,
                mappings,
                relations,
                resultMaps
            };

        } catch (error) {
            Logger.error(`解析XML文件失败: ${filePath}`, error as Error);
            throw error;
        }
    }

    /**
     * 批量解析XML文件
     */
    async parseXmlFiles(
        files: Array<{ filePath: string; content: string }>,
        options: Partial<XmlParseOptions> = {}
    ): Promise<Array<{
        namespace: string;
        mappings: XmlMapping[];
        relations: XmlRelation[];
        resultMaps: ResultMapInfo[];
    }>> {
        const results = [];

        for (const file of files) {
            try {
                const result = await this.parseXmlFile(file.filePath, file.content, options);
                if (result) {
                    results.push(result);
                }
            } catch (error) {
                Logger.warn(`跳过解析失败的文件: ${file.filePath}`, error as Error);
            }
        }

        return results;
    }

    /**
     * 检查是否为MyBatis映射文件
     */
    private isMyBatisMapperFile(content: string): boolean {
        return content.includes('<mapper') && 
               content.includes('namespace=');
    }

    /**
     * 提取命名空间
     */
    private extractNamespace(content: string): string | null {
        const namespaceMatch = content.match(/namespace\s*=\s*["']([^"']+)["']/);
        return namespaceMatch ? namespaceMatch[1] : null;
    }

    /**
     * 提取映射语句
     */
    private extractMappings(content: string, filePath: string, options: XmlParseOptions): XmlMapping[] {
        const mappings: XmlMapping[] = [];

        // 匹配各种映射元素
        const mappingTypes = ['select', 'insert', 'update', 'delete', 'resultMap'];
        
        for (const type of mappingTypes) {
            const pattern = new RegExp(`<${type}[^>]*>([\\s\\S]*?)</${type}>`, 'gi');
            let match;

            while ((match = pattern.exec(content)) !== null) {
                const elementContent = match[0];
                const innerContent = match[1];

                // 提取属性
                const id = this.extractAttribute(elementContent, 'id');
                if (!id) continue;

                const mapping: XmlMapping = {
                    id,
                    type: type as any,
                    filePath
                };

                // 提取特定属性
                if (type !== 'resultMap') {
                    mapping.resultType = this.extractAttribute(elementContent, 'resultType');
                    mapping.resultMap = this.extractAttribute(elementContent, 'resultMap');
                    mapping.parameterType = this.extractAttribute(elementContent, 'parameterType');
                    
                    if (options.parseSql) {
                        mapping.sql = this.extractSql(innerContent);
                    }
                }

                mappings.push(mapping);
            }
        }

        return mappings;
    }

    /**
     * 提取ResultMap
     */
    private extractResultMaps(content: string): ResultMapInfo[] {
        const resultMaps: ResultMapInfo[] = [];
        const pattern = /<resultMap[^>]*>([\s\S]*?)<\/resultMap>/gi;
        
        let match;
        while ((match = pattern.exec(content)) !== null) {
            const elementContent = match[0];
            const innerContent = match[1];

            const id = this.extractAttribute(elementContent, 'id');
            const type = this.extractAttribute(elementContent, 'type');
            
            if (!id || !type) continue;

            const resultMap: ResultMapInfo = {
                id,
                type,
                fieldMappings: this.extractFieldMappings(innerContent),
                associations: this.extractAssociations(innerContent),
                collections: this.extractCollections(innerContent)
            };

            resultMaps.push(resultMap);
        }

        return resultMaps;
    }

    /**
     * 提取字段映射
     */
    private extractFieldMappings(content: string): FieldMapping[] {
        const mappings: FieldMapping[] = [];
        
        // 匹配id和result元素
        const patterns = [
            /<id\s+([^>]*?)\/?>|<id\s+([^>]*?)>[\s\S]*?<\/id>/gi,
            /<result\s+([^>]*?)\/?>|<result\s+([^>]*?)>[\s\S]*?<\/result>/gi
        ];

        for (let i = 0; i < patterns.length; i++) {
            const pattern = patterns[i];
            const isId = i === 0;
            
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const attributes = match[1] || match[2];
                
                const property = this.extractAttribute(attributes, 'property');
                const column = this.extractAttribute(attributes, 'column');
                
                if (property && column) {
                    mappings.push({
                        property,
                        column,
                        javaType: this.extractAttribute(attributes, 'javaType'),
                        jdbcType: this.extractAttribute(attributes, 'jdbcType'),
                        isId
                    });
                }
            }
        }

        return mappings;
    }

    /**
     * 提取关联映射
     */
    private extractAssociations(content: string): AssociationMapping[] {
        const associations: AssociationMapping[] = [];
        const pattern = /<association\s+([^>]*?)(?:\/>|>([\s\S]*?)<\/association>)/gi;
        
        let match;
        while ((match = pattern.exec(content)) !== null) {
            const attributes = match[1];
            
            const property = this.extractAttribute(attributes, 'property');
            const javaType = this.extractAttribute(attributes, 'javaType');
            
            if (property && javaType) {
                associations.push({
                    property,
                    javaType,
                    column: this.extractAttribute(attributes, 'column'),
                    resultMap: this.extractAttribute(attributes, 'resultMap'),
                    select: this.extractAttribute(attributes, 'select')
                });
            }
        }

        return associations;
    }

    /**
     * 提取集合映射
     */
    private extractCollections(content: string): CollectionMapping[] {
        const collections: CollectionMapping[] = [];
        const pattern = /<collection\s+([^>]*?)(?:\/>|>([\s\S]*?)<\/collection>)/gi;
        
        let match;
        while ((match = pattern.exec(content)) !== null) {
            const attributes = match[1];
            
            const property = this.extractAttribute(attributes, 'property');
            const ofType = this.extractAttribute(attributes, 'ofType');
            
            if (property && ofType) {
                collections.push({
                    property,
                    ofType,
                    column: this.extractAttribute(attributes, 'column'),
                    resultMap: this.extractAttribute(attributes, 'resultMap'),
                    select: this.extractAttribute(attributes, 'select')
                });
            }
        }

        return collections;
    }

    /**
     * 提取关系
     */
    private extractRelations(
        content: string, 
        mappings: XmlMapping[], 
        resultMaps: ResultMapInfo[]
    ): XmlRelation[] {
        const relations: XmlRelation[] = [];

        // 从ResultMap中提取关系
        relations.push(...this.extractRelationsFromResultMaps(resultMaps));

        // 从SQL语句中提取关系
        relations.push(...this.extractRelationsFromSql(mappings));

        return relations;
    }

    /**
     * 从ResultMap中提取关系
     */
    private extractRelationsFromResultMaps(resultMaps: ResultMapInfo[]): XmlRelation[] {
        const relations: XmlRelation[] = [];

        for (const resultMap of resultMaps) {
            const sourceTable = this.inferTableNameFromType(resultMap.type);

            // 处理association（一对一/多对一）
            for (const association of resultMap.associations) {
                const targetTable = this.inferTableNameFromType(association.javaType);
                
                relations.push({
                    id: `${resultMap.id}_${association.property}`,
                    sourceTable,
                    targetTable,
                    type: 'many-to-one', // association通常表示多对一
                    foreignKey: association.column,
                    confidence: 0.8,
                    source: 'association'
                });
            }

            // 处理collection（一对多）
            for (const collection of resultMap.collections) {
                const targetTable = this.inferTableNameFromType(collection.ofType);
                
                relations.push({
                    id: `${resultMap.id}_${collection.property}`,
                    sourceTable,
                    targetTable,
                    type: 'one-to-many',
                    foreignKey: collection.column,
                    confidence: 0.8,
                    source: 'collection'
                });
            }
        }

        return relations;
    }

    /**
     * 从SQL语句中提取关系
     */
    private extractRelationsFromSql(mappings: XmlMapping[]): XmlRelation[] {
        const relations: XmlRelation[] = [];

        for (const mapping of mappings) {
            if (!mapping.sql) continue;

            const joinRelations = this.extractJoinRelations(mapping.sql, mapping.id);
            relations.push(...joinRelations);
        }

        return relations;
    }

    /**
     * 提取JOIN关系
     */
    private extractJoinRelations(sql: string, mappingId: string): XmlRelation[] {
        const relations: XmlRelation[] = [];
        
        // 清理SQL语句
        const cleanSql = sql.replace(/\s+/g, ' ').trim().toUpperCase();
        
        // 匹配JOIN语句
        const joinPattern = /(LEFT|RIGHT|INNER|FULL)?\s*JOIN\s+(\w+)\s+(?:AS\s+)?(\w+)?\s+ON\s+([\w.]+)\s*=\s*([\w.]+)/gi;
        
        let match;
        while ((match = joinPattern.exec(cleanSql)) !== null) {
            const joinType = match[1] || 'INNER';
            const targetTable = match[2];
            const targetAlias = match[3] || targetTable;
            const leftColumn = match[4];
            const rightColumn = match[5];

            // 推断源表
            const sourceTable = this.inferSourceTableFromSql(cleanSql);
            
            if (sourceTable && targetTable) {
                relations.push({
                    id: `${mappingId}_join_${targetTable}`,
                    sourceTable,
                    targetTable,
                    type: this.inferRelationTypeFromJoin(joinType),
                    joinCondition: `${leftColumn} = ${rightColumn}`,
                    confidence: 0.7,
                    source: 'join'
                });
            }
        }

        return relations;
    }

    /**
     * 提取XML属性
     */
    private extractAttribute(content: string, attributeName: string): string | null {
        const pattern = new RegExp(`${attributeName}\\s*=\\s*["']([^"']+)["']`, 'i');
        const match = content.match(pattern);
        return match ? match[1] : null;
    }

    /**
     * 提取SQL语句
     */
    private extractSql(content: string): string {
        // 移除CDATA标记
        let sql = content.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
        
        // 移除XML注释
        sql = sql.replace(/<!--[\s\S]*?-->/g, '');
        
        // 移除多余空白
        sql = sql.replace(/\s+/g, ' ').trim();
        
        return sql;
    }

    /**
     * 从类型推断表名
     */
    private inferTableNameFromType(type: string): string {
        // 提取类名
        const className = type.split('.').pop() || type;
        
        // 驼峰转下划线
        return className.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
    }

    /**
     * 从SQL推断源表
     */
    private inferSourceTableFromSql(sql: string): string | null {
        const fromMatch = sql.match(/FROM\s+(\w+)/i);
        return fromMatch ? fromMatch[1] : null;
    }

    /**
     * 从JOIN类型推断关系类型
     */
    private inferRelationTypeFromJoin(joinType: string): 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many' {
        switch (joinType.toUpperCase()) {
            case 'LEFT':
            case 'LEFT OUTER':
                return 'one-to-many';
            case 'RIGHT':
            case 'RIGHT OUTER':
                return 'many-to-one';
            default:
                return 'many-to-one'; // 默认多对一
        }
    }

    /**
     * 验证解析结果
     */
    validateXmlResult(result: {
        namespace: string;
        mappings: XmlMapping[];
        relations: XmlRelation[];
        resultMaps: ResultMapInfo[];
    }): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!result.namespace) {
            errors.push('缺少命名空间');
        }

        if (result.mappings.length === 0) {
            errors.push('没有找到映射语句');
        }

        // 检查映射语句的完整性
        for (const mapping of result.mappings) {
            if (!mapping.id) {
                errors.push(`映射语句缺少ID: ${mapping.type}`);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
} 