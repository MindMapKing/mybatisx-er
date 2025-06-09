# MyBatis ER Generator 测试指南

## 快速功能测试

### 1. 基本功能测试
使用VS Code命令面板 (`Ctrl+Shift+P`) 运行以下命令：

```
MyBatis ER: Test Extension
```

这个命令会执行基本的功能测试，包括：
- Worker管理器初始化
- 基本配置验证
- 简单任务执行测试

### 2. 扩展状态检查
```
MyBatis ER: Show Extension Status
```

显示扩展的当前状态，包括：
- Worker数量和状态
- 内存使用情况
- 处理的任务统计

## 常见问题诊断

### 问题1: 点击运行没反应

**症状**: 在Java实体类或MyBatis XML文件上右键选择"生成ER图"后没有任何反应

**诊断步骤**:

1. **检查扩展是否正确加载**
   - 打开VS Code命令面板 (`Ctrl+Shift+P`)
   - 输入 "MyBatis ER: Test Extension"
   - 如果命令不存在，说明扩展未正确安装或激活

2. **检查文件类型支持**
   - 确保文件是 `.java` 或 `.xml` 格式
   - 确保Java文件包含实体类注解（如 `@Entity`, `@Table` 等）
   - 确保XML文件是MyBatis映射文件

3. **查看开发者控制台**
   - 按 `F12` 打开开发者工具
   - 查看Console标签页是否有错误信息
   - 查看Network标签页是否有请求失败

4. **检查Worker线程状态**
   - 运行 "MyBatis ER: Show Extension Status" 命令
   - 检查Worker是否正常运行

**可能的解决方案**:

1. **重新加载扩展**
   ```
   Developer: Reload Window
   ```

2. **重新安装扩展**
   - 卸载当前扩展
   - 重新安装 `mybatis-er-generator-0.1.0.vsix`

3. **检查依赖**
   - 确保Node.js版本 >= 16
   - 确保VS Code版本 >= 1.74.0

### 问题2: 解析错误

**症状**: 扩展运行但解析Java/XML文件失败

**诊断步骤**:

1. **检查文件编码**
   - 确保文件使用UTF-8编码
   - 检查文件是否包含特殊字符

2. **检查文件语法**
   - 确保Java文件语法正确
   - 确保XML文件格式正确

3. **查看详细错误信息**
   - 打开VS Code输出面板
   - 选择"MyBatis ER Generator"输出通道

### 问题3: 性能问题

**症状**: 处理大量文件时响应缓慢

**解决方案**:

1. **调整Worker配置**
   - Worker数量会自动根据CPU核心数调整
   - 最大Worker数量限制为16个

2. **分批处理**
   - 避免一次性处理过多文件
   - 建议单次处理文件数量不超过100个

## 开发调试

### 启用调试模式

1. 打开VS Code设置
2. 搜索 "mybatis-er"
3. 启用调试选项

### 查看日志

扩展日志会输出到VS Code的输出面板：
1. 打开输出面板 (`Ctrl+Shift+U`)
2. 选择 "MyBatis ER Generator" 通道

### 性能监控

扩展包含内置的性能监控功能：
- Worker处理状态实时显示
- 内存使用情况监控
- 任务执行时间统计

## 版本信息

- 扩展版本: 0.1.0
- 支持的VS Code版本: >= 1.74.0
- Node.js要求: >= 16.0.0

## 联系支持

如果遇到问题，请提供以下信息：
1. VS Code版本
2. 扩展版本
3. 操作系统信息
4. 错误日志
5. 重现步骤

---

## Worker线程性能优化 (2024-12-19)

### 优化内容

我们对Worker线程进行了重要的性能优化，移除了不必要的模拟延迟：

#### 1. **移除的不必要延迟**
- `handleParseJavaFile`: 移除了100ms的模拟延迟
- `handleParseXmlFile`: 移除了100ms的模拟延迟  
- `handleValidateRelations`: 移除了150ms的模拟延迟
- `handleGenerateDiagram`: 移除了300ms的模拟延迟
- `handleExportDiagram`: 移除了200ms的模拟延迟
- 占位符实现方法中的所有模拟延迟

#### 2. **保留的合理延迟**
- 批量处理中每3个文件后的5ms延迟（用于CPU资源管理）

#### 3. **性能提升**
- **单文件解析**: 提升100-300ms（根据操作类型）
- **批量处理**: 显著提升，特别是小文件处理
- **用户体验**: 操作响应更加迅速

#### 4. **优化原理**

**之前的问题**:
```typescript
// 不必要的延迟
await this.sleep(100);  // 模拟解析过程
const result = await this.parseJavaFileContent(data);  // 真实解析
```

**优化后**:
```typescript
// 直接进行真实解析
const result = await this.parseJavaFileContent(data);
```

#### 5. **测试建议**

在使用优化后的版本时，你会注意到：
- 文件解析速度明显提升
- 进度条可能跳跃更快（因为真实解析通常很快）
- 整体操作更加流畅

#### 6. **技术细节**

这次优化解决了一个常见的开发问题：**在真实功能已经实现的情况下，仍然保留模拟延迟代码**。

- **真实解析器**: `SmartJavaParser` 和 `SmartXmlParser` 已经实现了完整的解析功能
- **不必要的延迟**: 之前的代码在真实解析前添加了人为延迟
- **性能损失**: 每次操作都会额外等待100-300ms

现在所有操作都直接调用真实的解析逻辑，无需等待不必要的延迟时间。 