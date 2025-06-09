import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { Logger } from './logger';

/**
 * 文件扫描结果接口
 */
export interface ScanResult {
    /** Java文件列表 */
    javaFiles: FileInfo[];
    /** XML文件列表 */
    xmlFiles: FileInfo[];
    /** 扫描统计 */
    stats: ScanStats;
    /** 扫描时间 */
    scanTime: number;
}

/**
 * 文件信息接口
 */
export interface FileInfo {
    /** 文件路径 */
    filePath: string;
    /** 相对路径 */
    relativePath: string;
    /** 文件名 */
    fileName: string;
    /** 文件大小(字节) */
    size: number;
    /** 最后修改时间 */
    lastModified: number;
    /** 文件类型 */
    fileType: 'java' | 'xml';
    /** 是否为实体类 */
    isEntity?: boolean;
    /** 是否为Mapper文件 */
    isMapper?: boolean;
    /** 包名(Java文件) */
    packageName?: string;
    /** 命名空间(XML文件) */
    namespace?: string;
}

/**
 * 扫描统计接口
 */
export interface ScanStats {
    /** 总文件数 */
    totalFiles: number;
    /** Java文件数 */
    javaFileCount: number;
    /** XML文件数 */
    xmlFileCount: number;
    /** 实体类数量 */
    entityCount: number;
    /** Mapper文件数量 */
    mapperCount: number;
    /** 扫描的目录数 */
    directoriesScanned: number;
    /** 跳过的文件数 */
    skippedFiles: number;
    /** 错误文件数 */
    errorFiles: number;
}

/**
 * 扫描选项接口
 */
export interface ScanOptions {
    /** 包含的文件模式 */
    includePatterns: string[];
    /** 排除的文件模式 */
    excludePatterns: string[];
    /** 最大文件大小(字节) */
    maxFileSize: number;
    /** 是否递归扫描 */
    recursive: boolean;
    /** 是否包含测试文件 */
    includeTests: boolean;
    /** 是否解析文件内容 */
    parseContent: boolean;
    /** 最大扫描深度 */
    maxDepth: number;
}

/**
 * 文件扫描器
 * 负责扫描工作空间中的Java和XML文件
 */
export class FileScanner {
    private workspaceRoot: string;
    private defaultOptions: ScanOptions;
    
    constructor(workspaceRoot?: string) {
        this.workspaceRoot = workspaceRoot || this.getWorkspaceRoot();
        this.defaultOptions = {
            includePatterns: ['**/*.java', '**/*.xml'],
            excludePatterns: [
                '**/node_modules/**',
                '**/target/**',
                '**/build/**',
                '**/out/**',
                '**/bin/**',
                '**/.git/**',
                '**/.vscode/**',
                '**/.idea/**'
            ],
            maxFileSize: 10 * 1024 * 1024, // 10MB
            recursive: true,
            includeTests: false,
            parseContent: true,
            maxDepth: 10
        };
    }
    
    /**
     * 扫描工作空间文件
     */
    async scanWorkspace(options?: Partial<ScanOptions>): Promise<ScanResult> {
        const startTime = Date.now();
        const scanOptions = { ...this.defaultOptions, ...options };
        
        Logger.info('开始扫描工作空间文件...');
        
        try {
            const stats: ScanStats = {
                totalFiles: 0,
                javaFileCount: 0,
                xmlFileCount: 0,
                entityCount: 0,
                mapperCount: 0,
                directoriesScanned: 0,
                skippedFiles: 0,
                errorFiles: 0
            };
            
            const javaFiles: FileInfo[] = [];
            const xmlFiles: FileInfo[] = [];
            
            // 扫描文件
            await this.scanDirectory(
                this.workspaceRoot,
                scanOptions,
                javaFiles,
                xmlFiles,
                stats,
                0
            );
            
            // 解析文件内容(如果启用)
            if (scanOptions.parseContent) {
                await this.parseFileContents(javaFiles, xmlFiles, stats);
            }
            
            const scanTime = Date.now() - startTime;
            
            Logger.info(`文件扫描完成: ${stats.totalFiles}个文件, 耗时${scanTime}ms`);
            
            return {
                javaFiles,
                xmlFiles,
                stats,
                scanTime
            };
            
        } catch (error) {
            Logger.error(`文件扫描失败: ${error}`);
            throw error;
        }
    }
    
    /**
     * 扫描指定目录
     */
    private async scanDirectory(
        dirPath: string,
        options: ScanOptions,
        javaFiles: FileInfo[],
        xmlFiles: FileInfo[],
        stats: ScanStats,
        depth: number
    ): Promise<void> {
        if (depth > options.maxDepth) {
            return;
        }
        
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            stats.directoriesScanned++;
            
            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                const relativePath = path.relative(this.workspaceRoot, fullPath);
                
                // 检查是否应该排除
                if (this.shouldExclude(relativePath, options.excludePatterns)) {
                    stats.skippedFiles++;
                    continue;
                }
                
                if (entry.isDirectory()) {
                    if (options.recursive) {
                        await this.scanDirectory(
                            fullPath,
                            options,
                            javaFiles,
                            xmlFiles,
                            stats,
                            depth + 1
                        );
                    }
                } else if (entry.isFile()) {
                    await this.processFile(
                        fullPath,
                        relativePath,
                        options,
                        javaFiles,
                        xmlFiles,
                        stats
                    );
                }
            }
        } catch (error) {
            Logger.warn(`扫描目录失败 ${dirPath}: ${error}`);
            stats.errorFiles++;
        }
    }
    
    /**
     * 处理单个文件
     */
    private async processFile(
        filePath: string,
        relativePath: string,
        options: ScanOptions,
        javaFiles: FileInfo[],
        xmlFiles: FileInfo[],
        stats: ScanStats
    ): Promise<void> {
        try {
            const fileName = path.basename(filePath);
            const ext = path.extname(fileName).toLowerCase();
            
            // 检查文件类型
            if (ext !== '.java' && ext !== '.xml') {
                return;
            }
            
            // 检查是否包含测试文件
            if (!options.includeTests && this.isTestFile(relativePath)) {
                stats.skippedFiles++;
                return;
            }
            
            // 检查文件大小
            const fileStat = await fs.stat(filePath);
            if (fileStat.size > options.maxFileSize) {
                Logger.warn(`文件过大，跳过: ${relativePath} (${fileStat.size} bytes)`);
                stats.skippedFiles++;
                return;
            }
            
            // 创建文件信息
            const fileInfo: FileInfo = {
                filePath,
                relativePath,
                fileName,
                size: fileStat.size,
                lastModified: fileStat.mtime.getTime(),
                fileType: ext === '.java' ? 'java' : 'xml'
            };
            
            // 添加到相应列表
            if (ext === '.java') {
                javaFiles.push(fileInfo);
                stats.javaFileCount++;
            } else if (ext === '.xml') {
                xmlFiles.push(fileInfo);
                stats.xmlFileCount++;
            }
            
            stats.totalFiles++;
            
        } catch (error) {
            Logger.warn(`处理文件失败 ${filePath}: ${error}`);
            stats.errorFiles++;
        }
    }
    
    /**
     * 解析文件内容
     */
    private async parseFileContents(
        javaFiles: FileInfo[],
        xmlFiles: FileInfo[],
        stats: ScanStats
    ): Promise<void> {
        Logger.info('开始解析文件内容...');
        
        // 解析Java文件
        for (const fileInfo of javaFiles) {
            try {
                await this.parseJavaFile(fileInfo);
                if (fileInfo.isEntity) {
                    stats.entityCount++;
                }
            } catch (error) {
                Logger.warn(`解析Java文件失败 ${fileInfo.relativePath}: ${error}`);
                stats.errorFiles++;
            }
        }
        
        // 解析XML文件
        for (const fileInfo of xmlFiles) {
            try {
                await this.parseXmlFile(fileInfo);
                if (fileInfo.isMapper) {
                    stats.mapperCount++;
                }
            } catch (error) {
                Logger.warn(`解析XML文件失败 ${fileInfo.relativePath}: ${error}`);
                stats.errorFiles++;
            }
        }
    }
    
    /**
     * 解析Java文件
     */
    private async parseJavaFile(fileInfo: FileInfo): Promise<void> {
        try {
            const content = await fs.readFile(fileInfo.filePath, 'utf-8');
            
            // 提取包名
            const packageMatch = content.match(/package\s+([\w.]+)\s*;/);
            if (packageMatch) {
                fileInfo.packageName = packageMatch[1];
            }
            
            // 检查是否为实体类
            fileInfo.isEntity = this.isEntityClass(content, fileInfo.fileName);
            
        } catch (error) {
            throw new Error(`读取Java文件失败: ${error}`);
        }
    }
    
    /**
     * 解析XML文件
     */
    private async parseXmlFile(fileInfo: FileInfo): Promise<void> {
        try {
            const content = await fs.readFile(fileInfo.filePath, 'utf-8');
            
            // 提取命名空间
            const namespaceMatch = content.match(/namespace\s*=\s*["']([^"']+)["']/);
            if (namespaceMatch) {
                fileInfo.namespace = namespaceMatch[1];
            }
            
            // 检查是否为Mapper文件
            fileInfo.isMapper = this.isMapperFile(content, fileInfo.fileName);
            
        } catch (error) {
            throw new Error(`读取XML文件失败: ${error}`);
        }
    }
    
    /**
     * 检查是否为实体类
     */
    private isEntityClass(content: string, fileName: string): boolean {
        // 检查注解
        const entityAnnotations = [
            '@Entity',
            '@Table',
            '@TableName',
            '@Data',
            '@Component'
        ];
        
        for (const annotation of entityAnnotations) {
            if (content.includes(annotation)) {
                return true;
            }
        }
        
        // 检查文件名模式
        const entityPatterns = [
            /Entity\.java$/,
            /Model\.java$/,
            /DO\.java$/,
            /PO\.java$/,
            /VO\.java$/,
            /DTO\.java$/
        ];
        
        for (const pattern of entityPatterns) {
            if (pattern.test(fileName)) {
                return true;
            }
        }
        
        // 检查类声明
        const classMatch = content.match(/public\s+class\s+(\w+)/);
        if (classMatch) {
            const className = classMatch[1];
            // 检查是否有getter/setter方法
            const hasGetters = /public\s+\w+\s+get\w+\s*\(/.test(content);
            const hasSetters = /public\s+void\s+set\w+\s*\(/.test(content);
            
            if (hasGetters && hasSetters) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * 检查是否为Mapper文件
     */
    private isMapperFile(content: string, fileName: string): boolean {
        // 检查文件名
        if (fileName.toLowerCase().includes('mapper')) {
            return true;
        }
        
        // 检查XML内容
        const mapperElements = [
            '<mapper',
            '<select',
            '<insert',
            '<update',
            '<delete',
            '<resultMap'
        ];
        
        for (const element of mapperElements) {
            if (content.includes(element)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * 检查是否为测试文件
     */
    private isTestFile(filePath: string): boolean {
        const testPatterns = [
            /\/test\//,
            /\/tests\//,
            /Test\.java$/,
            /Tests\.java$/,
            /TestCase\.java$/,
            /_test\.java$/,
            /_tests\.java$/
        ];
        
        return testPatterns.some(pattern => pattern.test(filePath));
    }
    
    /**
     * 检查是否应该排除文件
     */
    private shouldExclude(filePath: string, excludePatterns: string[]): boolean {
        return excludePatterns.some(pattern => {
            // 简单的glob模式匹配
            const regex = new RegExp(
                pattern
                    .replace(/\*\*/g, '.*')
                    .replace(/\*/g, '[^/]*')
                    .replace(/\?/g, '[^/]')
            );
            return regex.test(filePath);
        });
    }
    
    /**
     * 获取工作空间根目录
     */
    private getWorkspaceRoot(): string {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            throw new Error('没有打开的工作空间');
        }
        return workspaceFolders[0].uri.fsPath;
    }
    
    /**
     * 监听文件变化
     */
    createFileWatcher(
        callback: (event: 'created' | 'changed' | 'deleted', filePath: string) => void
    ): vscode.Disposable {
        const watcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(this.workspaceRoot, '**/*.{java,xml}')
        );
        
        const disposables = [
            watcher.onDidCreate(uri => callback('created', uri.fsPath)),
            watcher.onDidChange(uri => callback('changed', uri.fsPath)),
            watcher.onDidDelete(uri => callback('deleted', uri.fsPath)),
            watcher
        ];
        
        return vscode.Disposable.from(...disposables);
    }
    
    /**
     * 获取文件内容
     */
    async getFileContent(filePath: string): Promise<string> {
        try {
            return await fs.readFile(filePath, 'utf-8');
        } catch (error) {
            throw new Error(`读取文件失败 ${filePath}: ${error}`);
        }
    }
    
    /**
     * 检查文件是否存在
     */
    async fileExists(filePath: string): Promise<boolean> {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }
    
    /**
     * 获取文件统计信息
     */
    async getFileStats(filePath: string): Promise<fs.Stats> {
        return await fs.stat(filePath);
    }
    
    /**
     * 批量获取文件内容
     */
    async getFileContents(filePaths: string[]): Promise<Map<string, string>> {
        const contents = new Map<string, string>();
        
        const promises = filePaths.map(async (filePath) => {
            try {
                const content = await this.getFileContent(filePath);
                contents.set(filePath, content);
            } catch (error) {
                Logger.warn(`读取文件失败 ${filePath}: ${error}`);
            }
        });
        
        await Promise.all(promises);
        return contents;
    }
    
    /**
     * 过滤文件列表
     */
    filterFiles(
        files: FileInfo[],
        filter: {
            fileType?: 'java' | 'xml';
            isEntity?: boolean;
            isMapper?: boolean;
            packageName?: string;
            namespace?: string;
            minSize?: number;
            maxSize?: number;
            modifiedAfter?: number;
        }
    ): FileInfo[] {
        return files.filter(file => {
            if (filter.fileType && file.fileType !== filter.fileType) {
                return false;
            }
            
            if (filter.isEntity !== undefined && file.isEntity !== filter.isEntity) {
                return false;
            }
            
            if (filter.isMapper !== undefined && file.isMapper !== filter.isMapper) {
                return false;
            }
            
            if (filter.packageName && file.packageName !== filter.packageName) {
                return false;
            }
            
            if (filter.namespace && file.namespace !== filter.namespace) {
                return false;
            }
            
            if (filter.minSize && file.size < filter.minSize) {
                return false;
            }
            
            if (filter.maxSize && file.size > filter.maxSize) {
                return false;
            }
            
            if (filter.modifiedAfter && file.lastModified < filter.modifiedAfter) {
                return false;
            }
            
            return true;
        });
    }
} 