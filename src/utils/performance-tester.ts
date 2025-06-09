import * as vscode from 'vscode';
import { Logger } from './logger';

/**
 * 性能测试工具
 * 用于测试解析引擎的性能指标
 */
export class PerformanceTester {
    private static instance: PerformanceTester;
    private testResults: Map<string, PerformanceResult> = new Map();

    private constructor() {}

    public static getInstance(): PerformanceTester {
        if (!PerformanceTester.instance) {
            PerformanceTester.instance = new PerformanceTester();
        }
        return PerformanceTester.instance;
    }

    /**
     * 开始性能测试
     */
    public startTest(testName: string): PerformanceTest {
        const test = new PerformanceTest(testName);
        Logger.info(`开始性能测试: ${testName}`);
        return test;
    }

    /**
     * 记录测试结果
     */
    public recordResult(result: PerformanceResult): void {
        this.testResults.set(result.testName, result);
        Logger.info(`性能测试完成: ${result.testName}`, {
            duration: result.duration,
            memoryUsed: result.memoryUsed,
            itemsProcessed: result.itemsProcessed
        });
    }

    /**
     * 获取测试报告
     */
    public getTestReport(): PerformanceReport {
        const results = Array.from(this.testResults.values());
        
        return {
            totalTests: results.length,
            results: results,
            summary: {
                totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
                averageDuration: results.length > 0 ? 
                    results.reduce((sum, r) => sum + r.duration, 0) / results.length : 0,
                maxMemoryUsed: Math.max(...results.map(r => r.memoryUsed)),
                totalItemsProcessed: results.reduce((sum, r) => sum + r.itemsProcessed, 0)
            }
        };
    }

    /**
     * 显示性能报告
     */
    public async showPerformanceReport(): Promise<void> {
        const report = this.getTestReport();
        
        const message = `
性能测试报告：

总测试数: ${report.totalTests}
总耗时: ${report.summary.totalDuration.toFixed(2)}ms
平均耗时: ${report.summary.averageDuration.toFixed(2)}ms
最大内存使用: ${(report.summary.maxMemoryUsed / 1024 / 1024).toFixed(2)}MB
总处理项目: ${report.summary.totalItemsProcessed}

详细结果:
${report.results.map(r => 
    `- ${r.testName}: ${r.duration.toFixed(2)}ms, ${(r.memoryUsed / 1024 / 1024).toFixed(2)}MB, ${r.itemsProcessed}项`
).join('\n')}
        `.trim();

        await vscode.window.showInformationMessage(message, { modal: true });
    }

    /**
     * 清除测试结果
     */
    public clearResults(): void {
        this.testResults.clear();
        Logger.info('性能测试结果已清除');
    }

    /**
     * 运行基准测试套件
     */
    public async runBenchmarkSuite(): Promise<PerformanceReport> {
        Logger.info('开始运行基准测试套件');
        
        // 清除之前的结果
        this.clearResults();
        
        // 测试1: 内存使用基准
        const memoryTest = this.startTest('内存使用基准');
        await this.simulateMemoryUsage();
        memoryTest.finish(100);
        
        // 测试2: 解析速度基准
        const parseTest = this.startTest('解析速度基准');
        await this.simulateParsingLoad();
        parseTest.finish(500);
        
        // 测试3: 关系推断基准
        const inferenceTest = this.startTest('关系推断基准');
        await this.simulateInferenceLoad();
        inferenceTest.finish(200);
        
        const report = this.getTestReport();
        Logger.info('基准测试套件完成', report.summary);
        
        return report;
    }

    /**
     * 模拟内存使用测试
     */
    private async simulateMemoryUsage(): Promise<void> {
        // 模拟创建大量对象
        const objects: any[] = [];
        for (let i = 0; i < 10000; i++) {
            objects.push({
                id: i,
                name: `Entity_${i}`,
                fields: Array.from({ length: 10 }, (_, j) => ({
                    name: `field_${j}`,
                    type: 'String',
                    value: `value_${i}_${j}`
                }))
            });
        }
        
        // 等待一段时间让GC运行
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 清理对象
        objects.length = 0;
    }

    /**
     * 模拟解析负载测试
     */
    private async simulateParsingLoad(): Promise<void> {
        // 模拟解析大量文件
        for (let i = 0; i < 500; i++) {
            // 模拟文件解析操作
            const content = `
                @Entity
                @Table(name = "entity_${i}")
                public class Entity${i} {
                    @Id
                    private Long id;
                    
                    @Column(name = "name")
                    private String name;
                    
                    // 模拟复杂解析
                    ${Array.from({ length: 10 }, (_, j) => 
                        `@Column(name = "field_${j}") private String field${j};`
                    ).join('\n')}
                }
            `;
            
            // 模拟解析时间
            await new Promise(resolve => setTimeout(resolve, 1));
        }
    }

    /**
     * 模拟关系推断负载测试
     */
    private async simulateInferenceLoad(): Promise<void> {
        // 模拟关系推断计算
        for (let i = 0; i < 200; i++) {
            // 模拟复杂的关系推断算法
            const entities = Array.from({ length: 50 }, (_, j) => ({
                name: `Entity${j}`,
                fields: [`id`, `name`, `entity${i}_id`]
            }));
            
            // 模拟推断计算
            for (const entity of entities) {
                for (const field of entity.fields) {
                    if (field.endsWith('_id')) {
                        // 模拟关系推断逻辑
                        const confidence = Math.random();
                        if (confidence > 0.8) {
                            // 找到高置信度关系
                        }
                    }
                }
            }
            
            await new Promise(resolve => setTimeout(resolve, 1));
        }
    }
}

/**
 * 性能测试实例
 */
export class PerformanceTest {
    private startTime: number;
    private startMemory: number;
    private testName: string;

    constructor(testName: string) {
        this.testName = testName;
        this.startTime = performance.now();
        this.startMemory = this.getMemoryUsage();
    }

    /**
     * 完成测试并记录结果
     */
    public finish(itemsProcessed: number = 0): PerformanceResult {
        const endTime = performance.now();
        const endMemory = this.getMemoryUsage();
        
        const result: PerformanceResult = {
            testName: this.testName,
            duration: endTime - this.startTime,
            memoryUsed: endMemory - this.startMemory,
            itemsProcessed: itemsProcessed,
            timestamp: new Date()
        };
        
        PerformanceTester.getInstance().recordResult(result);
        return result;
    }

    /**
     * 获取当前内存使用量
     */
    private getMemoryUsage(): number {
        if (process.memoryUsage) {
            return process.memoryUsage().heapUsed;
        }
        return 0;
    }
}

/**
 * 性能测试结果
 */
export interface PerformanceResult {
    testName: string;
    duration: number; // 毫秒
    memoryUsed: number; // 字节
    itemsProcessed: number;
    timestamp: Date;
}

/**
 * 性能测试报告
 */
export interface PerformanceReport {
    totalTests: number;
    results: PerformanceResult[];
    summary: {
        totalDuration: number;
        averageDuration: number;
        maxMemoryUsed: number;
        totalItemsProcessed: number;
    };
} 