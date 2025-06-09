import { ERDiagramData, EntityInfo, RelationInfo, JavaField } from '../types';

/**
 * Mermaid ER图生成器
 * 将解析的实体和关系数据转换为Mermaid格式的ER图
 */
export class MermaidERGenerator {
    
    /**
     * 生成完整的Mermaid ER图代码
     */
    public generateERDiagram(data: ERDiagramData): string {
        const { entities, relations } = data;
        
        if (!entities || entities.length === 0) {
            return this.generateEmptyDiagram();
        }
        
        let mermaidCode = 'erDiagram\n';
        
        // 生成实体定义
        mermaidCode += this.generateEntities(entities);
        
        // 生成关系定义
        if (relations && relations.length > 0) {
            mermaidCode += '\n';
            mermaidCode += this.generateRelations(relations);
        }
        
        return mermaidCode;
    }
    
    /**
     * 生成空图表提示
     */
    private generateEmptyDiagram(): string {
        return `erDiagram
    NO_ENTITIES {
        string message "未找到MyBatis实体类"
        string suggestion "请确保项目包含@TableName等注解的实体类"
    }`;
    }
    
    /**
     * 生成实体定义
     */
    private generateEntities(entities: EntityInfo[]): string {
        return entities.map(entity => this.generateEntity(entity)).join('\n\n');
    }
    
    /**
     * 生成单个实体定义
     */
    private generateEntity(entity: EntityInfo): string {
        const tableName = this.sanitizeTableName(entity.tableName);
        let entityCode = `    ${tableName} {\n`;
        
        // 生成字段定义
        if (entity.fields && entity.fields.length > 0) {
            const fieldDefinitions = entity.fields.map(field => 
                this.generateField(field)
            ).join('\n');
            entityCode += fieldDefinitions;
        } else {
            entityCode += '        string placeholder "暂无字段信息"\n';
        }
        
        entityCode += '    }';
        
        // 添加注释说明
        const comment = this.generateEntityComment(entity);
        if (comment) {
            entityCode += ` %% ${comment}`;
        }
        
        return entityCode;
    }
    
    /**
     * 生成字段定义
     */
    private generateField(field: JavaField): string {
        const columnType = this.mapJavaTypeToDBType(field.javaType);
        const columnName = this.sanitizeColumnName(field.columnName);
        const constraints = this.generateFieldConstraints(field);
        
        return `        ${columnType} ${columnName}${constraints}`;
    }
    
    /**
     * 生成字段约束
     */
    private generateFieldConstraints(field: JavaField): string {
        const constraints: string[] = [];
        
        if (field.isPrimaryKey) {
            constraints.push('PK');
        }
        
        if (field.isNotNull) {
            constraints.push('NOT NULL');
        }
        
        if (field.isUnique) {
            constraints.push('UNIQUE');
        }
        
        if (field.defaultValue) {
            constraints.push(`DEFAULT "${field.defaultValue}"`);
        }
        
        if (field.comment) {
            constraints.push(`"${field.comment}"`);
        }
        
        return constraints.length > 0 ? ` ${constraints.join(' ')}` : '';
    }
    
    /**
     * 生成实体注释
     */
    private generateEntityComment(entity: EntityInfo): string {
        const comments: string[] = [];
        
        if (entity.className) {
            comments.push(`Java类: ${entity.className}`);
        }
        
        if (entity.comment) {
            comments.push(entity.comment);
        }
        
        const tableAnnotation = entity.annotations.find(ann => 
            ann.name === 'TableName' || ann.name === 'Table'
        );
        if (tableAnnotation) {
            comments.push(`注解: @${tableAnnotation.name}`);
        }
        
        return comments.join(', ');
    }
    
    /**
     * 生成关系定义
     */
    private generateRelations(relations: RelationInfo[]): string {
        return relations.map(relation => this.generateRelation(relation)).join('\n');
    }
    
    /**
     * 生成单个关系定义
     */
    private generateRelation(relation: RelationInfo): string {
        const fromTable = this.sanitizeTableName(relation.fromTable);
        const toTable = this.sanitizeTableName(relation.toTable);
        const relationshipSymbol = this.getRelationshipSymbol(relation.type);
        
        let relationCode = `    ${fromTable} ${relationshipSymbol} ${toTable}`;
        
        // 添加关系标签
        if (relation.fromField || relation.toField) {
            const label = this.generateRelationLabel(relation);
            relationCode += ` : ${label}`;
        }
        
        // 添加注释
        const comment = this.generateRelationComment(relation);
        if (comment) {
            relationCode += ` %% ${comment}`;
        }
        
        return relationCode;
    }
    
    /**
     * 获取关系符号
     */
    private getRelationshipSymbol(relationType: string): string {
        switch (relationType.toLowerCase()) {
            case 'one-to-one':
                return '||--||';
            case 'one-to-many':
                return '||--o{';
            case 'many-to-one':
                return '}o--||';
            case 'many-to-many':
                return '}o--o{';
            default:
                return '||--||'; // 默认一对一
        }
    }
    
    /**
     * 生成关系标签
     */
    private generateRelationLabel(relation: RelationInfo): string {
        const labels: string[] = [];
        
        if (relation.fromField) {
            labels.push(relation.fromField);
        }
        
        if (relation.toField && relation.toField !== relation.fromField) {
            labels.push(relation.toField);
        }
        
        return labels.join('-');
    }
    
    /**
     * 生成关系注释
     */
    private generateRelationComment(relation: RelationInfo): string {
        const comments: string[] = [];
        
        if (relation.confidence !== undefined) {
            comments.push(`置信度: ${(relation.confidence * 100).toFixed(1)}%`);
        }
        
        if (relation.source) {
            comments.push(`来源: ${relation.source}`);
        }
        
        if (relation.description) {
            comments.push(relation.description);
        }
        
        return comments.join(', ');
    }
    
    /**
     * Java类型到数据库类型的映射
     */
    private mapJavaTypeToDBType(javaType: string): string {
        const typeMapping: { [key: string]: string } = {
            'String': 'varchar',
            'Integer': 'int',
            'int': 'int',
            'Long': 'bigint',
            'long': 'bigint',
            'Double': 'double',
            'double': 'double',
            'Float': 'float',
            'float': 'float',
            'Boolean': 'boolean',
            'boolean': 'boolean',
            'Date': 'datetime',
            'LocalDate': 'date',
            'LocalDateTime': 'datetime',
            'LocalTime': 'time',
            'Timestamp': 'timestamp',
            'BigDecimal': 'decimal',
            'byte[]': 'blob',
            'Byte[]': 'blob'
        };
        
        // 处理泛型类型
        const baseType = javaType.split('<')[0];
        return typeMapping[baseType] || 'varchar';
    }
    
    /**
     * 清理表名，确保符合Mermaid语法
     */
    private sanitizeTableName(tableName: string): string {
        if (!tableName) {
            return 'UNKNOWN_TABLE';
        }
        
        // 移除特殊字符，保留字母、数字和下划线
        return tableName.replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase();
    }
    
    /**
     * 清理列名，确保符合Mermaid语法
     */
    private sanitizeColumnName(columnName: string): string {
        if (!columnName) {
            return 'unknown_column';
        }
        
        // 移除特殊字符，保留字母、数字和下划线
        return columnName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    }
    
    /**
     * 生成带主题的Mermaid图表
     */
    public generateThemedDiagram(data: ERDiagramData, theme: 'default' | 'dark' | 'forest' | 'neutral' = 'default'): string {
        const diagram = this.generateERDiagram(data);
        
        // 添加主题配置
        const themeConfig = this.getThemeConfig(theme);
        
        return `%%{init: ${themeConfig}}%%\n${diagram}`;
    }
    
    /**
     * 获取主题配置
     */
    private getThemeConfig(theme: string): string {
        const themeConfigs = {
            default: '{"theme": "default"}',
            dark: '{"theme": "dark"}',
            forest: '{"theme": "forest"}',
            neutral: '{"theme": "neutral"}'
        };
        
        return themeConfigs[theme as keyof typeof themeConfigs] || themeConfigs.default;
    }
    
    /**
     * 生成统计信息
     */
    public generateStatistics(data: ERDiagramData): {
        entityCount: number;
        relationCount: number;
        fieldCount: number;
        relationTypes: { [key: string]: number };
    } {
        const { entities, relations } = data;
        
        const stats = {
            entityCount: entities.length,
            relationCount: relations.length,
            fieldCount: entities.reduce((total, entity) => total + entity.fields.length, 0),
            relationTypes: {} as { [key: string]: number }
        };
        
        // 统计关系类型
        relations.forEach(relation => {
            const type = relation.type;
            stats.relationTypes[type] = (stats.relationTypes[type] || 0) + 1;
        });
        
        return stats;
    }
    
    /**
     * 验证生成的Mermaid代码
     */
    public validateMermaidCode(mermaidCode: string): {
        isValid: boolean;
        errors: string[];
        warnings: string[];
    } {
        const errors: string[] = [];
        const warnings: string[] = [];
        
        // 基本语法检查
        if (!mermaidCode.trim().startsWith('erDiagram')) {
            errors.push('Mermaid代码必须以"erDiagram"开头');
        }
        
        // 检查实体定义
        const entityMatches = mermaidCode.match(/\s+\w+\s*\{[^}]*\}/g);
        if (!entityMatches || entityMatches.length === 0) {
            warnings.push('未找到实体定义');
        }
        
        // 检查关系定义
        const relationMatches = mermaidCode.match(/\s+\w+\s+\|\|--[o\|]\{?\s+\w+/g);
        if (!relationMatches || relationMatches.length === 0) {
            warnings.push('未找到关系定义');
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
} 