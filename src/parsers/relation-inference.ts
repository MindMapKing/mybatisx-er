// 在Worker线程中使用简单的console日志
const Logger = {
    debug: (message: string, ...args: any[]) => console.log(`[DEBUG] ${message}`, ...args),
    info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
    warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${message}`, ...args),
    error: (message: string, error?: Error) => console.error(`[ERROR] ${message}`, error)
};

import { JavaEntity, JavaField } from './java-parser';
import { XmlRelation } from './xml-parser';

/**
 * 推断的关系信息接口
 */
export interface InferredRelation {
    /** 关系ID */
    id: string;
    /** 源表 */
    sourceTable: string;
    /** 目标表 */
    targetTable: string;
    /** 源字段 */
    sourceField?: string;
    /** 目标字段 */
    targetField?: string;
    /** 关系类型 */
    type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
    /** 置信度 (0-1) */
    confidence: number;
    /** 推断策略 */
    strategy: string;
    /** 推断依据 */
    evidence: string[];
    /** 是否为双向关系 */
    bidirectional: boolean;
}

/**
 * 推断策略接口
 */
export interface InferenceStrategy {
    /** 策略名称 */
    name: string;
    /** 策略权重 */
    weight: number;
    /** 是否启用 */
    enabled: boolean;
    /** 最小置信度 */
    minConfidence: number;
}

/**
 * 推断选项接口
 */
export interface InferenceOptions {
    /** 推断策略 */
    strategies: InferenceStrategy[];
    /** 最小置信度阈值 */
    minConfidence: number;
    /** 是否合并相似关系 */
    mergeSimilarRelations: boolean;
    /** 是否推断反向关系 */
    inferReverseRelations: boolean;
}

/**
 * 智能关系推断引擎
 * 支持多种策略的表关系推断
 */
export class RelationInferenceEngine {
    private static readonly DEFAULT_STRATEGIES: InferenceStrategy[] = [
        { name: 'naming-convention', weight: 0.8, enabled: true, minConfidence: 0.6 },
        { name: 'annotation-based', weight: 0.9, enabled: true, minConfidence: 0.7 },
        { name: 'xml-mapping', weight: 0.85, enabled: true, minConfidence: 0.75 },
        { name: 'field-type-analysis', weight: 0.7, enabled: true, minConfidence: 0.5 }
    ];

    /**
     * 推断实体间关系
     */
    async inferRelations(
        entities: JavaEntity[],
        xmlResults: any[] = [],
        options: Partial<InferenceOptions> = {}
    ): Promise<InferredRelation[]> {
        const inferenceOptions: InferenceOptions = {
            strategies: RelationInferenceEngine.DEFAULT_STRATEGIES,
            minConfidence: 0.6,
            mergeSimilarRelations: true,
            inferReverseRelations: true,
            ...options
        };

        try {
            Logger.debug(`开始推断关系，实体数: ${entities.length}, XML结果数: ${xmlResults.length}`);

            const relations: InferredRelation[] = [];

            // 1. 基于命名约定的推断
            if (this.isStrategyEnabled('naming-convention', inferenceOptions.strategies)) {
                const namingRelations = await this.inferByNamingConvention(entities, inferenceOptions);
                relations.push(...namingRelations);
            }

            // 2. 基于注解的推断
            if (this.isStrategyEnabled('annotation-based', inferenceOptions.strategies)) {
                const annotationRelations = await this.inferByAnnotations(entities, inferenceOptions);
                relations.push(...annotationRelations);
            }

            // 3. 基于XML映射的推断
            if (this.isStrategyEnabled('xml-mapping', inferenceOptions.strategies)) {
                const xmlRelations = await this.inferByXmlMapping(entities, xmlResults, inferenceOptions);
                relations.push(...xmlRelations);
            }

            // 4. 基于字段类型分析的推断
            if (this.isStrategyEnabled('field-type-analysis', inferenceOptions.strategies)) {
                const typeRelations = await this.inferByFieldTypeAnalysis(entities, inferenceOptions);
                relations.push(...typeRelations);
            }

            // 5. 过滤低置信度关系
            const filteredRelations = relations.filter(r => r.confidence >= inferenceOptions.minConfidence);

            // 6. 合并相似关系
            const mergedRelations = inferenceOptions.mergeSimilarRelations ? 
                this.mergeSimilarRelations(filteredRelations) : filteredRelations;

            // 7. 推断反向关系
            const finalRelations = inferenceOptions.inferReverseRelations ? 
                this.inferReverseRelations(mergedRelations) : mergedRelations;

            Logger.debug(`关系推断完成，发现关系数: ${finalRelations.length}`);
            return finalRelations;

        } catch (error) {
            Logger.error('关系推断失败', error as Error);
            throw error;
        }
    }

    /**
     * 基于命名约定推断关系
     */
    private async inferByNamingConvention(
        entities: JavaEntity[], 
        options: InferenceOptions
    ): Promise<InferredRelation[]> {
        const relations: InferredRelation[] = [];
        const strategy = this.getStrategy('naming-convention', options.strategies);
        
        if (!strategy) return relations;

        for (const entity of entities) {
            for (const field of entity.fields) {
                // 检查外键命名模式
                if (this.isForeignKeyByNaming(field)) {
                    const targetTableName = this.inferTargetTableFromFieldName(field.name);
                    const targetEntity = entities.find(e => 
                        e.tableName === targetTableName || 
                        this.normalizeTableName(e.className) === targetTableName
                    );

                    if (targetEntity) {
                        const confidence = this.calculateNamingConfidence(field, targetEntity);
                        
                        if (confidence >= strategy.minConfidence) {
                            relations.push({
                                id: `naming_${entity.tableName}_${targetEntity.tableName}_${field.name}`,
                                sourceTable: entity.tableName,
                                targetTable: targetEntity.tableName,
                                sourceField: field.name,
                                targetField: 'id',
                                type: 'many-to-one',
                                confidence: confidence * strategy.weight,
                                strategy: 'naming-convention',
                                evidence: [
                                    `字段名 ${field.name} 符合外键命名约定`,
                                    `推断目标表: ${targetEntity.tableName}`
                                ],
                                bidirectional: false
                            });
                        }
                    }
                }
            }
        }

        return relations;
    }

    /**
     * 基于注解推断关系
     */
    private async inferByAnnotations(
        entities: JavaEntity[], 
        options: InferenceOptions
    ): Promise<InferredRelation[]> {
        const relations: InferredRelation[] = [];
        const strategy = this.getStrategy('annotation-based', options.strategies);
        
        if (!strategy) return relations;

        for (const entity of entities) {
            for (const field of entity.fields) {
                // 检查关系注解
                const relationAnnotations = field.annotations.filter(a => 
                    ['OneToOne', 'OneToMany', 'ManyToOne', 'ManyToMany', 'JoinColumn'].includes(a.name)
                );

                for (const annotation of relationAnnotations) {
                    const relationType = this.mapAnnotationToRelationType(annotation.name);
                    if (relationType) {
                        const targetEntity = this.findTargetEntityByType(entities, field.javaType);
                        
                        if (targetEntity) {
                            const confidence = this.calculateAnnotationConfidence(annotation, field);
                            
                            if (confidence >= strategy.minConfidence) {
                                relations.push({
                                    id: `annotation_${entity.tableName}_${targetEntity.tableName}_${field.name}`,
                                    sourceTable: entity.tableName,
                                    targetTable: targetEntity.tableName,
                                    sourceField: field.name,
                                    targetField: this.inferTargetField(annotation, targetEntity),
                                    type: relationType,
                                    confidence: confidence * strategy.weight,
                                    strategy: 'annotation-based',
                                    evidence: [
                                        `注解 @${annotation.name} 明确指定关系类型`,
                                        `字段类型: ${field.javaType}`
                                    ],
                                    bidirectional: false
                                });
                            }
                        }
                    }
                }
            }
        }

        return relations;
    }

    /**
     * 基于XML映射推断关系
     */
    private async inferByXmlMapping(
        entities: JavaEntity[], 
        xmlResults: any[], 
        options: InferenceOptions
    ): Promise<InferredRelation[]> {
        const relations: InferredRelation[] = [];
        const strategy = this.getStrategy('xml-mapping', options.strategies);
        
        if (!strategy) return relations;

        for (const xmlResult of xmlResults) {
            if (!xmlResult.relations) continue;

            for (const xmlRelation of xmlResult.relations) {
                const sourceEntity = entities.find(e => 
                    e.tableName === xmlRelation.sourceTable ||
                    this.normalizeTableName(e.className) === xmlRelation.sourceTable
                );
                
                const targetEntity = entities.find(e => 
                    e.tableName === xmlRelation.targetTable ||
                    this.normalizeTableName(e.className) === xmlRelation.targetTable
                );

                if (sourceEntity && targetEntity) {
                    const confidence = this.calculateXmlConfidence(xmlRelation);
                    
                    if (confidence >= strategy.minConfidence) {
                        relations.push({
                            id: `xml_${xmlRelation.id}`,
                            sourceTable: sourceEntity.tableName,
                            targetTable: targetEntity.tableName,
                            sourceField: xmlRelation.foreignKey,
                            targetField: 'id',
                            type: xmlRelation.type,
                            confidence: confidence * strategy.weight,
                            strategy: 'xml-mapping',
                            evidence: [
                                `XML映射文件中明确定义的关系`,
                                `来源: ${xmlRelation.source}`,
                                xmlRelation.joinCondition ? `连接条件: ${xmlRelation.joinCondition}` : ''
                            ].filter(Boolean),
                            bidirectional: false
                        });
                    }
                }
            }
        }

        return relations;
    }

    /**
     * 基于字段类型分析推断关系
     */
    private async inferByFieldTypeAnalysis(
        entities: JavaEntity[], 
        options: InferenceOptions
    ): Promise<InferredRelation[]> {
        const relations: InferredRelation[] = [];
        const strategy = this.getStrategy('field-type-analysis', options.strategies);
        
        if (!strategy) return relations;

        for (const entity of entities) {
            for (const field of entity.fields) {
                // 检查字段类型是否为其他实体类型
                const targetEntity = this.findTargetEntityByType(entities, field.javaType);
                
                if (targetEntity && targetEntity !== entity) {
                    const confidence = this.calculateTypeAnalysisConfidence(field, targetEntity);
                    
                    if (confidence >= strategy.minConfidence) {
                        relations.push({
                            id: `type_${entity.tableName}_${targetEntity.tableName}_${field.name}`,
                            sourceTable: entity.tableName,
                            targetTable: targetEntity.tableName,
                            sourceField: field.name,
                            targetField: 'id',
                            type: this.inferRelationTypeFromField(field),
                            confidence: confidence * strategy.weight,
                            strategy: 'field-type-analysis',
                            evidence: [
                                `字段类型 ${field.javaType} 对应实体 ${targetEntity.className}`,
                                `推断为对象引用关系`
                            ],
                            bidirectional: false
                        });
                    }
                }
            }
        }

        return relations;
    }

    /**
     * 检查策略是否启用
     */
    private isStrategyEnabled(strategyName: string, strategies: InferenceStrategy[]): boolean {
        const strategy = strategies.find(s => s.name === strategyName);
        return strategy ? strategy.enabled : false;
    }

    /**
     * 获取策略配置
     */
    private getStrategy(strategyName: string, strategies: InferenceStrategy[]): InferenceStrategy | null {
        return strategies.find(s => s.name === strategyName) || null;
    }

    /**
     * 检查字段是否为外键（基于命名）
     */
    private isForeignKeyByNaming(field: JavaField): boolean {
        const name = field.name.toLowerCase();
        
        // 检查是否以Id结尾且不是主键
        if (name.endsWith('id') && !field.isPrimaryKey && name !== 'id') {
            return true;
        }
        
        // 检查是否包含常见的外键模式
        const fkPatterns = ['_id', 'Id', '_key', 'Key'];
        return fkPatterns.some(pattern => field.name.includes(pattern));
    }

    /**
     * 从字段名推断目标表名
     */
    private inferTargetTableFromFieldName(fieldName: string): string {
        // 移除Id后缀
        let tableName = fieldName.replace(/Id$/, '').replace(/_id$/, '');
        
        // 驼峰转下划线
        return this.normalizeTableName(tableName);
    }

    /**
     * 标准化表名
     */
    private normalizeTableName(name: string): string {
        return name.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
    }

    /**
     * 计算命名约定置信度
     */
    private calculateNamingConfidence(field: JavaField, targetEntity: JavaEntity): number {
        let confidence = 0.5; // 基础置信度
        
        // 字段名完全匹配表名+Id
        const expectedFieldName = targetEntity.className.toLowerCase() + 'Id';
        if (field.name.toLowerCase() === expectedFieldName) {
            confidence += 0.3;
        }
        
        // 字段类型为Long或Integer（常见主键类型）
        if (['Long', 'Integer', 'long', 'int'].includes(field.javaType)) {
            confidence += 0.2;
        }
        
        return Math.min(confidence, 1.0);
    }

    /**
     * 映射注解到关系类型
     */
    private mapAnnotationToRelationType(annotationName: string): InferredRelation['type'] | null {
        switch (annotationName) {
            case 'OneToOne': return 'one-to-one';
            case 'OneToMany': return 'one-to-many';
            case 'ManyToOne': return 'many-to-one';
            case 'ManyToMany': return 'many-to-many';
            default: return null;
        }
    }

    /**
     * 根据类型查找目标实体
     */
    private findTargetEntityByType(entities: JavaEntity[], javaType: string): JavaEntity | null {
        // 移除泛型和包名
        const simpleType = javaType.replace(/<[^>]+>/g, '').split('.').pop() || javaType;
        
        return entities.find(e => e.className === simpleType) || null;
    }

    /**
     * 计算注解置信度
     */
    private calculateAnnotationConfidence(annotation: any, field: JavaField): number {
        let confidence = 0.8; // 注解的基础置信度较高
        
        // 如果有JoinColumn注解，置信度更高
        if (annotation.name === 'JoinColumn') {
            confidence += 0.1;
        }
        
        return Math.min(confidence, 1.0);
    }

    /**
     * 推断目标字段
     */
    private inferTargetField(annotation: any, targetEntity: JavaEntity): string {
        // 如果注解中指定了referencedColumnName
        if (annotation.attributes && annotation.attributes.referencedColumnName) {
            return annotation.attributes.referencedColumnName;
        }
        
        // 默认假设是主键
        const primaryKeyField = targetEntity.fields.find(f => f.isPrimaryKey);
        return primaryKeyField ? primaryKeyField.columnName : 'id';
    }

    /**
     * 计算XML置信度
     */
    private calculateXmlConfidence(xmlRelation: XmlRelation): number {
        return xmlRelation.confidence || 0.7;
    }

    /**
     * 计算类型分析置信度
     */
    private calculateTypeAnalysisConfidence(field: JavaField, targetEntity: JavaEntity): number {
        let confidence = 0.6; // 基础置信度
        
        // 如果字段名包含目标实体名称
        if (field.name.toLowerCase().includes(targetEntity.className.toLowerCase())) {
            confidence += 0.2;
        }
        
        return Math.min(confidence, 1.0);
    }

    /**
     * 从字段推断关系类型
     */
    private inferRelationTypeFromField(field: JavaField): InferredRelation['type'] {
        // 如果字段类型是集合，通常是一对多
        if (field.javaType.includes('List') || field.javaType.includes('Set')) {
            return 'one-to-many';
        }
        
        // 默认多对一
        return 'many-to-one';
    }

    /**
     * 合并相似关系
     */
    private mergeSimilarRelations(relations: InferredRelation[]): InferredRelation[] {
        const merged: InferredRelation[] = [];
        const processed = new Set<string>();

        for (const relation of relations) {
            const key = `${relation.sourceTable}_${relation.targetTable}_${relation.sourceField}`;
            
            if (processed.has(key)) continue;
            
            // 查找相似关系
            const similar = relations.filter(r => 
                r.sourceTable === relation.sourceTable &&
                r.targetTable === relation.targetTable &&
                r.sourceField === relation.sourceField &&
                !processed.has(`${r.sourceTable}_${r.targetTable}_${r.sourceField}`)
            );

            if (similar.length > 1) {
                // 合并关系，取最高置信度
                const bestRelation = similar.reduce((best, current) => 
                    current.confidence > best.confidence ? current : best
                );
                
                // 合并证据
                bestRelation.evidence = Array.from(new Set(
                    similar.flatMap(r => r.evidence)
                ));
                
                merged.push(bestRelation);
                similar.forEach(r => processed.add(`${r.sourceTable}_${r.targetTable}_${r.sourceField}`));
            } else {
                merged.push(relation);
                processed.add(key);
            }
        }

        return merged;
    }

    /**
     * 推断反向关系
     */
    private inferReverseRelations(relations: InferredRelation[]): InferredRelation[] {
        const result = [...relations];

        for (const relation of relations) {
            // 检查是否已存在反向关系
            const reverseExists = relations.some(r => 
                r.sourceTable === relation.targetTable &&
                r.targetTable === relation.sourceTable
            );

            if (!reverseExists && relation.type !== 'many-to-many') {
                const reverseType = this.getReverseRelationType(relation.type);
                
                if (reverseType) {
                    result.push({
                        id: `reverse_${relation.id}`,
                        sourceTable: relation.targetTable,
                        targetTable: relation.sourceTable,
                        sourceField: relation.targetField,
                        targetField: relation.sourceField,
                        type: reverseType,
                        confidence: relation.confidence * 0.8, // 反向关系置信度稍低
                        strategy: `reverse-${relation.strategy}`,
                        evidence: [`基于 ${relation.strategy} 推断的反向关系`],
                        bidirectional: true
                    });
                }
            }
        }

        return result;
    }

    /**
     * 获取反向关系类型
     */
    private getReverseRelationType(type: InferredRelation['type']): InferredRelation['type'] | null {
        switch (type) {
            case 'one-to-many': return 'many-to-one';
            case 'many-to-one': return 'one-to-many';
            case 'one-to-one': return 'one-to-one';
            default: return null;
        }
    }

    /**
     * 验证推断结果
     */
    validateInferenceResult(relations: InferredRelation[]): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        for (const relation of relations) {
            if (!relation.sourceTable || !relation.targetTable) {
                errors.push(`关系缺少源表或目标表: ${relation.id}`);
            }

            if (relation.confidence < 0 || relation.confidence > 1) {
                errors.push(`关系置信度超出范围 [0,1]: ${relation.id}`);
            }

            if (!relation.strategy) {
                errors.push(`关系缺少推断策略: ${relation.id}`);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
} 