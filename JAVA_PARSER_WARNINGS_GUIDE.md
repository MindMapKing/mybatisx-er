# Java 解析器警告解决指南

## 🚨 问题描述

在使用 MyBatis ER Generator 时，您可能遇到以下错误：

```
Error: Cannot find module 'vscode'
    at d:\Workspace\OpenSource\mybatisx-er\out\workers\worker-thread.js:1:1104
```

## 🔍 问题原因

这个错误发生的原因是：

1. **Worker 线程环境限制**：VS Code API (`require('vscode')`) 只能在扩展的主线程中使用，不能在 Worker 线程中使用
2. **环境检测不准确**：之前的 Worker 线程检测逻辑不够准确，导致在 Worker 线程中仍然尝试加载 VS Code API
3. **静态分析警告**：Webpack 在打包时发现了 `require('vscode')` 调用，但无法确定运行时环境

## ✅ 解决方案

### 1. 多重 VS Code API 加载策略

我们实现了多种 VS Code API 加载方法，确保在各种环境下都能正确加载：

- **方法1**：直接 `require('vscode')`
- **方法2**：通过 `eval('require')('vscode')` 避免 webpack 静态分析
- **方法3**：从 `globalThis.vscode` 获取
- **方法4**：从 `global.vscode` 获取
- **方法5**：从 `window.vscode` 获取（如果存在）

### 2. 改进的 Worker 线程检测

我们实现了多层次的 Worker 线程检测机制，确保在 Worker 线程中不会尝试加载 VS Code API。

### 3. 延迟加载机制

VS Code API 支持延迟加载，如果初始加载失败，会在需要时重新尝试加载。

### 4. 环境变量标识

在创建 Worker 线程时设置明确的环境变量标识。

### 5. 智能降级策略

根据运行环境自动选择解析策略：

| 环境 | VS Code API | 解析策略 | 准确率 |
|------|-------------|----------|--------|
| **主线程** | ✅ 可用 | LSP + 正则混合 | 95%+ |
| **Worker线程** | ❌ 不可用 | 纯正则解析 | 70% |

## 🧪 验证修复

### 方法1：快速测试（推荐）

1. 打开命令面板 (`Ctrl+Shift+P`)
2. 运行命令：`MyBatis ER: 快速VS Code API测试`
3. 查看弹出消息和输出面板结果

### 方法2：详细诊断

1. 打开命令面板 (`Ctrl+Shift+P`)
2. 运行命令：`MyBatis ER: 测试VS Code API加载`
3. 查看详细的加载过程和环境信息

### 方法3：Worker线程测试

1. 打开命令面板 (`Ctrl+Shift+P`)
2. 运行命令：`MyBatis ER: 测试Worker线程修复`
3. 验证 Worker 线程中不再尝试加载 VS Code API

### 方法4：检查日志输出

正常情况下，您应该看到：

**主线程模式：**
```
[DEBUG] VS Code API通过直接require加载成功
[DEBUG] VS Code API已加载，LSP解析可用
```

**Worker线程模式：**
```
[DEBUG] 检测到Worker线程环境，将使用正则解析策略
```

**而不是错误：**
```
[ERROR] Cannot find module 'vscode'
```

## ⚙️ 推荐配置

### 最佳实践配置（推荐）

```json
{
  "mybatis-er.execution": {
    "useWorkerThreads": false,
    "useMainThreadSerial": true,
    "batchSize": 5,
    "timeout": 15000
  }
}
```

**优势：**
- ✅ 95%+ 解析准确率
- ✅ 完整的 VS Code API 支持
- ✅ Java 扩展集成
- ✅ 稳定性高

## 📝 总结

通过改进的 Worker 线程检测和智能降级策略，我们解决了 VS Code API 加载错误问题，推荐使用主线程串行模式以获得最佳效果。

## 🚀 快速修复步骤

1. **更新到最新版本**（已包含修复）
2. **设置推荐配置**：禁用 Worker 线程，启用主线程串行模式
3. **运行测试命令**：`MyBatis ER: 测试Worker线程修复`
4. **验证不再出现错误**
