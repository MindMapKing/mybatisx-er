# VS Code MyBatis ER图生成插件 - 详细实现计划

## 📋 项目概述

基于完成的创意设计阶段，本文档详细规划VS Code MyBatis ER图生成插件的实现路径。项目采用**智能分层异步架构**，实现比原IDEA插件更优异的性能和用户体验。

## 🎯 项目目标

| 目标维度 | 指标 | 当前状态 |
|----------|------|----------|
| **功能完整性** | 支持MyBatis-Plus全部主流注解 | 📋 待实现 |
| **解析准确性** | 90%以上实体识别，80%以上关系推断 | 📋 待实现 |
| **性能指标** | 1000实体<10秒，增量更新<1秒 | 📋 待实现 |
| **用户体验** | 现代化界面，流畅交互 | 📋 待实现 |

## 🚀 实现阶段详细拆分

### 阶段一：核心框架搭建 (第1-2周)

#### 1.1 项目初始化 (2天)
**任务列表**:
- [ ] 创建VS Code扩展项目结构
- [ ] 配置TypeScript + webpack + esbuild构建环境
- [ ] 设置package.json和扩展配置
- [ ] 配置开发环境和调试设置

**输出物**:
```
vscode-mybatis-er/
├── src/
│   ├── extension.ts           # 扩展入口
│   ├── commands/             # 命令处理
│   ├── workers/              # Worker线程
│   ├── parsers/              # 解析器
│   ├── ui/                   # UI组件
│   └── utils/                # 工具函数
├── package.json              # 扩展配置
├── tsconfig.json             # TS配置
├── webpack.config.js         # 构建配置
└── README.md                # 项目文档
```

#### 1.2 Extension入口和命令系统 (2天)
**任务列表**:
- [ ] 实现extension.ts主入口
- [ ] 注册核心命令 (生成ER图、刷新、导出等)
- [ ] 配置命令面板集成
- [ ] 实现基础的状态管理

**技术要点**:
```typescript
// extension.ts
export function activate(context: vscode.ExtensionContext) {
  // 注册命令
  const generateCommand = vscode.commands.registerCommand(
    'mybatis-er.generate',
    () => generateERDiagram()
  );
  
  context.subscriptions.push(generateCommand);
}
```

#### 1.3 Worker线程通信框架 (3天)
**任务列表**:
- [ ] 设计Worker消息协议
- [ ] 实现WorkerManager管理器
- [ ] 创建基础Worker模板
- [ ] 实现错误处理和重试机制

**架构设计**:
```typescript
interface WorkerMessage {
  id: string;
  type: 'PARSE_ENTITY' | 'PARSE_XML' | 'INFER_RELATIONS';
  payload: any;
  timestamp: number;
}

class WorkerManager {
  createWorker(type: WorkerType): Worker;
  sendTask(worker: Worker, task: Task): Promise<Result>;
  handleWorkerMessage(message: WorkerMessage): void;
}
```

#### 1.4 文件扫描和监听系统 (2天)
**任务列表**:
- [ ] 实现工作空间文件扫描
- [ ] 创建文件类型过滤器
- [ ] 实现文件变更监听
- [ ] 设计增量更新机制

### 阶段二：智能解析引擎 (第3-4周)

#### 2.1 Java实体解析器 (SmartJavaParser) (4天)
**任务列表**:
- [ ] 实现基础Java文件解析
- [ ] MyBatis-Plus注解识别
  - [ ] @TableName 解析
  - [ ] @TableId 主键识别
  - [ ] @TableField 字段解析
- [ ] 字段类型推断和转换
- [ ] 混合解析策略实现

**核心代码结构**:
```typescript
class SmartJavaParser {
  parseEntity(content: string): EntityInfo;
  extractAnnotations(content: string): AnnotationInfo[];
  inferFieldTypes(content: string): FieldInfo[];
  
  // 混合解析策略
  autoSelectStrategy(fileContent: string): 'regex' | 'ast' | 'hybrid';
}
```

#### 2.2 XML映射解析器 (OptimizedXMLParser) (5天)
**任务列表**:
- [ ] 实现智能解析策略选择
- [ ] DOM解析器优化
- [ ] SAX流式解析器
- [ ] ResultMap关系提取
- [ ] Association/Collection解析
- [ ] SQL语句中的JOIN分析

**解析目标**:
- 解析`<resultMap>`中的关联关系
- 提取`<association>`和`<collection>`标签
- 分析SQL中的JOIN语句
- 处理动态SQL条件

#### 2.3 流式处理管道 (2天)
**任务列表**:
- [ ] 实现文件流式读取
- [ ] 设计数据管道处理
- [ ] 实现背压控制
- [ ] 错误恢复机制

### 阶段三：智能关系推断引擎 (第5周)

#### 3.1 四策略推断系统 (4天)

**3.1.1 命名约定推断策略 (1天)**
```typescript
class NamingInferenceStrategy {
  private patterns = [
    { pattern: /^(.+)_id$/i, relation: 'belongs_to', confidence: 0.8 },
    { pattern: /^(.+)_key$/i, relation: 'belongs_to', confidence: 0.7 },
    { pattern: /^fk_(.+)$/i, relation: 'belongs_to', confidence: 0.9 }
  ];
  
  async infer(entities: Entity[]): Promise<InferenceResult[]>;
}
```

**3.1.2 XML语义推断策略 (1天)**
- 解析`<association>`标签关系
- 分析JOIN语句模式
- 提取外键约束信息

**3.1.3 注解推断策略 (1天)**
- 处理`@One`、`@Many`注解
- 解析`@Result`映射关系
- 分析级联关系

**3.1.4 语义分析策略 (1天)**
- 业务领域模式识别
- 常见实体关系模板
- 上下文语义推断

#### 3.2 智能融合引擎 (2天)
**任务列表**:
- [ ] 实现置信度加权算法
- [ ] 设计冲突解决机制
- [ ] 创建关系验证器
- [ ] 实现结果排序和过滤

**融合算法**:
```typescript
class IntelligentFusionEngine {
  async fuse(strategyResults: InferenceResult[][]): Promise<Relationship[]> {
    // 1. 按关系分组
    const relationGroups = this.groupByRelation(strategyResults.flat());
    
    // 2. 置信度加权计算
    const fusedResults = await this.calculateWeightedConfidence(relationGroups);
    
    // 3. 冲突解决
    return this.resolveConflicts(fusedResults);
  }
}
```

#### 3.3 缓存和增量更新 (1天)
**任务列表**:
- [ ] 实现LRU缓存策略
- [ ] 设计缓存失效机制
- [ ] 实现增量推断算法
- [ ] 性能监控和优化

### 阶段四：WebView用户界面 (第6-7周)

#### 4.1 基础WebView框架 (3天)
**任务列表**:
- [ ] 创建WebView Provider
- [ ] 实现VS Code通信桥接
- [ ] 设计HTML模板系统
- [ ] 配置资源安全策略

#### 4.2 四层界面架构实现 (5天)

**4.2.1 数据管理层 (1天)**
```typescript
class ERDataManager {
  private entities: Map<string, EntityInfo>;
  private relations: Map<string, RelationInfo>;
  
  updateData(newData: ERDiagramData): void;
  getFilteredData(filter: FilterOptions): ERDiagramData;
}
```

**4.2.2 图表渲染层 (2天)**
- Mermaid.js集成和配置
- 叠加层渲染系统
- 动画控制器
- 主题管理器

**4.2.3 可视化控制层 (1天)**
- 缩放和平移控制
- 选择管理器
- 高亮控制器
- 交互状态管理

**4.2.4 用户交互层 (1天)**
- 智能工具栏组件
- 右键菜单系统
- 快捷键处理
- 搜索功能

#### 4.3 高级UI功能 (4天)

**4.3.1 智能搜索和过滤 (1天)**
```typescript
class IntelligentSearch {
  private searchIndex: SearchIndex;
  
  search(query: string): SearchResult[];
  highlightSearchResults(query: string): void;
  createSearchIndex(data: ERDiagramData): SearchIndex;
}
```

**4.3.2 导出功能 (1天)**
- PNG/SVG/PDF导出
- 自定义导出选项
- 批量导出功能

**4.3.3 主题系统 (1天)**
- VS Code主题集成
- 自定义主题支持
- 动态主题切换

**4.3.4 响应式布局 (1天)**
- 移动端适配
- 不同屏幕尺寸支持
- 可折叠面板

### 阶段五：性能优化和测试 (第8周)

#### 5.1 性能优化 (3天)
**任务列表**:
- [ ] 虚拟化大型图表渲染
- [ ] 内存使用优化
- [ ] 并行处理优化
- [ ] 缓存策略调优

#### 5.2 测试和质量保证 (3天)
**任务列表**:
- [ ] 单元测试覆盖
- [ ] 集成测试套件
- [ ] 性能基准测试
- [ ] 用户体验测试

#### 5.3 文档和发布准备 (1天)
**任务列表**:
- [ ] 用户文档编写
- [ ] API文档生成
- [ ] VS Code Marketplace准备
- [ ] 发布流程测试

## 🔧 技术实现要点

### 核心依赖包
```json
{
  "dependencies": {
    "vscode": "^1.74.0",
    "mermaid": "^9.4.0",
    "fast-xml-parser": "^4.0.0",
    "typescript": "^4.9.0"
  },
  "devDependencies": {
    "webpack": "^5.75.0",
    "esbuild-loader": "^2.20.0",
    "@types/vscode": "^1.74.0"
  }
}
```

### 项目配置文件

#### package.json (VS Code扩展配置)
```json
{
  "name": "mybatis-er-generator",
  "displayName": "MyBatis ER Generator",
  "description": "Generate ER diagrams for MyBatis projects",
  "version": "1.0.0",
  "engines": {
    "vscode": "^1.74.0"
  },
  "categories": ["Other"],
  "activationEvents": [
    "onLanguage:java",
    "onLanguage:xml"
  ],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "mybatis-er.generate",
        "title": "生成 MyBatis ER 图",
        "category": "MyBatis ER"
      }
    ],
    "menus": {
      "explorer/context": [
        {
          "command": "mybatis-er.generate",
          "when": "explorerResourceIsFolder"
        }
      ]
    }
  }
}
```

## 📊 质量指标和验收标准

### 功能指标
- [ ] 支持MyBatis-Plus全部主流注解 (100%)
- [ ] 实体识别准确率 ≥ 90%
- [ ] 关系推断准确率 ≥ 80%
- [ ] Mermaid格式输出正确率 ≥ 95%

### 性能指标
- [ ] 1000+实体项目扫描时间 < 10秒
- [ ] 增量更新响应时间 < 1秒
- [ ] 内存占用 < 100MB
- [ ] VS Code启动时间增加 < 500ms

### 用户体验指标
- [ ] 界面操作响应时间 < 100ms
- [ ] 错误恢复能力 ≥ 95%
- [ ] 跨平台兼容性 (Windows/Mac/Linux)
- [ ] 可访问性支持

## 🎯 里程碑检查点

| 阶段 | 时间点 | 关键输出 | 验收标准 |
|------|--------|----------|----------|
| **MVP** | 第2周结束 | 基础扫描+简单ER图 | 能生成基本的实体关系图 |
| **Alpha** | 第4周结束 | 完整解析引擎 | 支持复杂项目解析 |
| **Beta** | 第6周结束 | 完整UI界面 | 用户体验基本完备 |
| **RC** | 第7周结束 | 性能优化版本 | 达到所有性能指标 |
| **Release** | 第8周结束 | 发布就绪版本 | 通过全部测试 |

## 🚀 下一步行动

1. **立即开始**: 项目初始化和框架搭建
2. **并行开发**: 解析器和UI可以并行开发
3. **迭代优化**: 每个阶段都进行用户反馈收集
4. **持续集成**: 建立自动化测试和构建流程

---

**状态**: 📋 等待实现开始
**预计完成时间**: 8周 (基于详细任务分解)
**风险等级**: 🟡 中等 (已通过创意设计验证可行性) 