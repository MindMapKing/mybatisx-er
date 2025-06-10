import { FileScanner } from './file-scanner';
import { Logger } from './logger';

/**
 * 文件扫描器测试
 */
export class FileScannerTest {
    private scanner: FileScanner;

    constructor() {
        this.scanner = new FileScanner();
    }

    /**
     * 测试基本文件扫描功能
     */
    async testBasicScanning(): Promise<void> {
        console.log('🧪 开始测试文件扫描器...');

        try {
            // 测试基本扫描
            const result = await this.scanner.scanWorkspace({
                parseContent: true,
                includeTests: false,
                maxDepth: 5
            });

            console.log('✅ 文件扫描完成:', {
                总文件数: result.stats.totalFiles,
                Java文件数: result.stats.javaFileCount,
                XML文件数: result.stats.xmlFileCount,
                实体类数量: result.stats.entityCount,
                Mapper文件数量: result.stats.mapperCount,
                扫描目录数: result.stats.directoriesScanned,
                跳过文件数: result.stats.skippedFiles,
                错误文件数: result.stats.errorFiles,
                扫描耗时: `${result.scanTime}ms`
            });

            // 显示GitIgnore状态
            const gitIgnoreStatus = this.scanner.getGitIgnoreStatus();
            console.log('📋 GitIgnore状态:', {
                已加载: gitIgnoreStatus.loaded,
                模式数量: gitIgnoreStatus.patternCount
            });

            // 显示发现的实体类
            const entityFiles = result.javaFiles.filter(f => f.isEntity);
            if (entityFiles.length > 0) {
                console.log('🏗️ 发现的实体类:');
                entityFiles.forEach(file => {
                    console.log(`  - ${file.relativePath} (${file.packageName || '无包名'})`);
                });
            }

            // 显示发现的Mapper文件
            const mapperFiles = result.xmlFiles.filter(f => f.isMapper);
            if (mapperFiles.length > 0) {
                console.log('🗺️ 发现的Mapper文件:');
                mapperFiles.forEach(file => {
                    console.log(`  - ${file.relativePath} (${file.namespace || '无命名空间'})`);
                });
            }

        } catch (error) {
            console.log('❌ 文件扫描失败:', error);
        }
    }

    /**
     * 测试文件过滤功能
     */
    async testFileFiltering(): Promise<void> {
        console.log('🔍 测试文件过滤功能...');

        try {
            const result = await this.scanner.scanWorkspace({
                parseContent: true,
                includeTests: true // 包含测试文件以测试过滤
            });

            // 测试各种过滤条件
            const filters = [
                { name: '仅Java文件', filter: { fileType: 'java' as const } },
                { name: '仅XML文件', filter: { fileType: 'xml' as const } },
                { name: '仅实体类', filter: { isEntity: true } },
                { name: '仅Mapper文件', filter: { isMapper: true } },
                { name: '大于1KB的文件', filter: { minSize: 1024 } },
                { name: '小于10KB的文件', filter: { maxSize: 10240 } }
            ];

            for (const { name, filter } of filters) {
                const allFiles = [...result.javaFiles, ...result.xmlFiles];
                const filteredFiles = this.scanner.filterFiles(allFiles, filter);
                console.log(`  ${name}: ${filteredFiles.length}个文件`);
            }

        } catch (error) {
            console.log('❌ 文件过滤测试失败:', error);
        }
    }

    /**
     * 测试GitIgnore功能
     */
    async testGitIgnoreFeature(): Promise<void> {
        console.log('🚫 测试GitIgnore功能...');

        const gitIgnoreStatus = this.scanner.getGitIgnoreStatus();
        
        if (gitIgnoreStatus.loaded) {
            console.log(`✅ GitIgnore已加载，包含${gitIgnoreStatus.patternCount}个模式`);
            
            // 进行一次扫描来观察GitIgnore的效果
            const result = await this.scanner.scanWorkspace({
                parseContent: false, // 快速扫描
                maxDepth: 3
            });
            
            console.log('📊 GitIgnore过滤效果:', {
                跳过文件数: result.stats.skippedFiles,
                总文件数: result.stats.totalFiles
            });
            
        } else {
            console.log('⚠️ 未找到.gitignore文件或加载失败');
        }
    }

    /**
     * 测试实体类识别增强功能
     */
    async testEntityRecognition(): Promise<void> {
        console.log('🎯 测试实体类识别增强功能...');

        try {
            const result = await this.scanner.scanWorkspace({
                parseContent: true,
                includeTests: false
            });

            const entityFiles = result.javaFiles.filter(f => f.isEntity);
            
            if (entityFiles.length > 0) {
                console.log(`✅ 识别到${entityFiles.length}个实体类:`);
                
                // 按包名分组显示
                const packageGroups = new Map<string, typeof entityFiles>();
                entityFiles.forEach(file => {
                    const pkg = file.packageName || '无包名';
                    if (!packageGroups.has(pkg)) {
                        packageGroups.set(pkg, []);
                    }
                    packageGroups.get(pkg)!.push(file);
                });

                packageGroups.forEach((files, packageName) => {
                    console.log(`  📦 ${packageName}:`);
                    files.forEach(file => {
                        console.log(`    - ${file.fileName} (${(file.size / 1024).toFixed(1)}KB)`);
                    });
                });
            } else {
                console.log('⚠️ 未识别到任何实体类');
            }

        } catch (error) {
            console.log('❌ 实体类识别测试失败:', error);
        }
    }

    /**
     * 测试文件监听功能
     */
    testFileWatcher(): void {
        console.log('👁️ 测试文件监听功能...');

        const watcher = this.scanner.createFileWatcher((event, filePath) => {
            console.log(`📁 文件${event}: ${filePath}`);
        });

        console.log('✅ 文件监听器已启动，监听Java和XML文件变化');
        console.log('💡 提示：修改、创建或删除Java/XML文件来测试监听功能');
        
        // 返回清理函数
        return () => {
            watcher.dispose();
            console.log('🛑 文件监听器已停止');
        };
    }

    /**
     * 性能测试
     */
    async testPerformance(): Promise<void> {
        console.log('⚡ 进行性能测试...');

        const iterations = 3;
        const times: number[] = [];

        for (let i = 0; i < iterations; i++) {
            const startTime = Date.now();
            
            await this.scanner.scanWorkspace({
                parseContent: true,
                includeTests: false
            });
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            times.push(duration);
            
            console.log(`  第${i + 1}次扫描: ${duration}ms`);
        }

        const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);

        console.log('📊 性能统计:', {
            平均耗时: `${avgTime.toFixed(1)}ms`,
            最快耗时: `${minTime}ms`,
            最慢耗时: `${maxTime}ms`
        });
    }

    /**
     * 运行所有测试
     */
    async runAllTests(): Promise<void> {
        console.log('🚀 开始运行文件扫描器完整测试套件...\n');

        try {
            await this.testBasicScanning();
            console.log('');
            
            await this.testFileFiltering();
            console.log('');
            
            await this.testGitIgnoreFeature();
            console.log('');
            
            await this.testEntityRecognition();
            console.log('');
            
            await this.testPerformance();
            console.log('');
            
            console.log('✅ 所有测试完成！');
            
        } catch (error) {
            console.log('❌ 测试过程中发生错误:', error);
        }
    }
}

/**
 * 导出测试函数供外部调用
 */
export async function runFileScannerTest(): Promise<void> {
    const test = new FileScannerTest();
    await test.runAllTests();
}

/**
 * 导出文件监听测试函数
 */
export function startFileWatcherTest(): () => void {
    const test = new FileScannerTest();
    return test.testFileWatcher();
} 