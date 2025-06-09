/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/commands/command-handler.ts":
/*!*****************************************!*\
  !*** ./src/commands/command-handler.ts ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CommandHandler: () => (/* binding */ CommandHandler)
/* harmony export */ });
/* harmony import */ var vscode__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! vscode */ "vscode");
/* harmony import */ var vscode__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(vscode__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _utils_logger__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../utils/logger */ "./src/utils/logger.ts");
/* harmony import */ var _workers_worker_manager__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../workers/worker-manager */ "./src/workers/worker-manager.ts");
/* harmony import */ var _utils_file_scanner__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../utils/file-scanner */ "./src/utils/file-scanner.ts");
/* harmony import */ var _types_worker_types__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../types/worker-types */ "./src/types/worker-types.ts");
/* harmony import */ var _ui_mermaid_generator__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../ui/mermaid-generator */ "./src/ui/mermaid-generator.ts");
/* harmony import */ var _ui_test_data__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../ui/test-data */ "./src/ui/test-data.ts");
/* harmony import */ var _utils_performance_tester__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../utils/performance-tester */ "./src/utils/performance-tester.ts");









class CommandHandler {
  constructor(stateManager, configManager, webviewProvider) {
    this.isProcessing = false;
    this.stateManager = stateManager;
    this.configManager = configManager;
    this.webviewProvider = webviewProvider;
    this.workerManager = new _workers_worker_manager__WEBPACK_IMPORTED_MODULE_2__.WorkerManager();
    this.fileScanner = new _utils_file_scanner__WEBPACK_IMPORTED_MODULE_3__.FileScanner();
    this.mermaidGenerator = new _ui_mermaid_generator__WEBPACK_IMPORTED_MODULE_5__.MermaidERGenerator();
  }
  /**
   * 初始化Worker管理器
   */
  async initialize() {
    try {
      await this.workerManager.start();
      _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.info("Worker\u7BA1\u7406\u5668\u521D\u59CB\u5316\u5B8C\u6210");
    } catch (error) {
      _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.error("Worker\u7BA1\u7406\u5668\u521D\u59CB\u5316\u5931\u8D25", error);
      throw error;
    }
  }
  /**
   * 清理资源
   */
  async dispose() {
    try {
      await this.workerManager.shutdown();
      _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.info("Worker\u7BA1\u7406\u5668\u5DF2\u5173\u95ED");
    } catch (error) {
      _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.error("Worker\u7BA1\u7406\u5668\u5173\u95ED\u5931\u8D25", error);
    }
  }
  /**
   * 生成ER图命令处理
   */
  async handleGenerateERDiagram() {
    const workspaceFolders = vscode__WEBPACK_IMPORTED_MODULE_0__.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode__WEBPACK_IMPORTED_MODULE_0__.window.showWarningMessage("\u8BF7\u5148\u6253\u5F00\u4E00\u4E2A\u5DE5\u4F5C\u7A7A\u95F4");
      return;
    }
    try {
      const isMyBatisProject = await this.stateManager.isMyBatisProject();
      if (!isMyBatisProject) {
        const result = await vscode__WEBPACK_IMPORTED_MODULE_0__.window.showWarningMessage(
          "\u5F53\u524D\u5DE5\u4F5C\u7A7A\u95F4\u4F3C\u4E4E\u4E0D\u662FMyBatis\u9879\u76EE\uFF0C\u662F\u5426\u7EE7\u7EED\uFF1F",
          "\u7EE7\u7EED",
          "\u53D6\u6D88"
        );
        if (result !== "\u7EE7\u7EED") {
          return;
        }
      }
      const config = this.configManager.getExtensionConfig();
      _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.info("\u5F00\u59CB\u751F\u6210ER\u56FE", {
        workspace: this.stateManager.getCurrentWorkspacePath(),
        config: this.configManager.getConfigSummary()
      });
      if (config.autoRefresh && this.stateManager.isCacheValid()) {
        const useCache = await vscode__WEBPACK_IMPORTED_MODULE_0__.window.showInformationMessage(
          "\u53D1\u73B0\u6709\u6548\u7F13\u5B58\uFF0C\u662F\u5426\u4F7F\u7528\u7F13\u5B58\u6570\u636E\uFF1F",
          "\u4F7F\u7528\u7F13\u5B58",
          "\u91CD\u65B0\u751F\u6210"
        );
        if (useCache === "\u4F7F\u7528\u7F13\u5B58") {
          const cachedData = await this.stateManager.getERDiagramData();
          if (cachedData) {
            _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.info("\u4F7F\u7528\u7F13\u5B58\u6570\u636E\u751F\u6210ER\u56FE");
            vscode__WEBPACK_IMPORTED_MODULE_0__.window.showInformationMessage("ER\u56FE\u751F\u6210\u5B8C\u6210\uFF08\u4F7F\u7528\u7F13\u5B58\uFF09\uFF01");
            return;
          }
        }
      }
      await vscode__WEBPACK_IMPORTED_MODULE_0__.window.withProgress({
        location: vscode__WEBPACK_IMPORTED_MODULE_0__.ProgressLocation.Notification,
        title: "\u6B63\u5728\u751F\u6210ER\u56FE...",
        cancellable: true
      }, async (progress, token) => {
        await this.performERGeneration(progress, token);
      });
      _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.info("ER\u56FE\u751F\u6210\u5B8C\u6210");
      vscode__WEBPACK_IMPORTED_MODULE_0__.window.showInformationMessage("ER\u56FE\u751F\u6210\u5B8C\u6210\uFF01");
    } catch (error) {
      _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.error("\u751F\u6210ER\u56FE\u5931\u8D25", error);
      vscode__WEBPACK_IMPORTED_MODULE_0__.window.showErrorMessage(`\u751F\u6210ER\u56FE\u5931\u8D25: ${error}`);
    }
  }
  /**
   * 执行ER图生成的核心逻辑
   */
  async performERGeneration(progress, token) {
    progress.report({ increment: 0, message: "\u626B\u63CF\u9879\u76EE\u6587\u4EF6..." });
    await this.stateManager.cleanExpiredCache();
    const scanResult = await this.fileScanner.scanWorkspace({
      includeTests: this.configManager.getExtensionConfig().includeTestFiles
    });
    _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.info(`\u6587\u4EF6\u626B\u63CF\u5B8C\u6210: ${scanResult.stats.totalFiles}\u4E2A\u6587\u4EF6`);
    progress.report({ increment: 20, message: `\u53D1\u73B0${scanResult.stats.entityCount}\u4E2A\u5B9E\u4F53\u7C7B...` });
    if (token.isCancellationRequested) {
      throw new Error("\u7528\u6237\u53D6\u6D88\u4E86\u64CD\u4F5C");
    }
    const javaParseResults = await this.batchProcessJavaFiles(scanResult.javaFiles.filter((f) => f.isEntity), progress, token, 20, 25);
    progress.report({ increment: 25, message: "\u89E3\u6790XML\u6620\u5C04\u6587\u4EF6..." });
    const xmlParseResults = await this.batchProcessXmlFiles(scanResult.xmlFiles.filter((f) => f.isMapper), progress, token, 25, 25);
    progress.report({ increment: 25, message: "\u63A8\u65AD\u5B9E\u4F53\u5173\u7CFB..." });
    if (token.isCancellationRequested) {
      throw new Error("\u7528\u6237\u53D6\u6D88\u4E86\u64CD\u4F5C");
    }
    const relationResult = await this.performRelationInference(javaParseResults, xmlParseResults, token);
    progress.report({ increment: 20, message: "\u751F\u6210ER\u56FE..." });
    if (token.isCancellationRequested) {
      throw new Error("\u7528\u6237\u53D6\u6D88\u4E86\u64CD\u4F5C");
    }
    const diagramResult = await this.generateERDiagramData(javaParseResults, xmlParseResults, relationResult);
    const erData = {
      entities: diagramResult.entities,
      relations: diagramResult.relations,
      mermaidCode: diagramResult.mermaidCode,
      metadata: diagramResult.metadata,
      generatedAt: /* @__PURE__ */ new Date(),
      projectPath: this.stateManager.getCurrentWorkspacePath() || ""
    };
    await this.stateManager.saveERDiagramData(erData);
    this.webviewProvider.updateDiagram(erData);
    progress.report({ increment: 10, message: "\u5B8C\u6210" });
    _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.info("ER\u56FE\u751F\u6210\u5B8C\u6210", {
      entityCount: diagramResult.entities.length,
      relationCount: diagramResult.relations.length,
      scanStats: scanResult.stats
    });
  }
  /**
   * 新增：批量处理Java文件
   */
  async batchProcessJavaFiles(javaFiles, progress, token, startProgress, progressRange) {
    if (javaFiles.length === 0) {
      return [];
    }
    const results = [];
    const batchSize = Math.min(3, Math.max(1, Math.floor(javaFiles.length / 4)));
    const batches = this.chunkArray(javaFiles, batchSize);
    _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.info(`\u6279\u91CF\u5904\u7406Java\u6587\u4EF6: ${javaFiles.length}\u4E2A\u6587\u4EF6\uFF0C${batches.length}\u4E2A\u6279\u6B21`);
    for (let i = 0; i < batches.length; i++) {
      if (token.isCancellationRequested) {
        throw new Error("\u7528\u6237\u53D6\u6D88\u4E86\u64CD\u4F5C");
      }
      const batch = batches[i];
      const batchProgress = startProgress + i * progressRange / batches.length;
      progress.report({
        increment: batchProgress,
        message: `\u5904\u7406Java\u6587\u4EF6\u6279\u6B21 ${i + 1}/${batches.length} (${batch.length}\u4E2A\u6587\u4EF6)`
      });
      try {
        const batchData = await Promise.all(
          batch.map(async (file) => ({
            filePath: file.filePath,
            content: await this.fileScanner.getFileContent(file.filePath),
            fileType: "java",
            options: { parseMethodBodies: false }
          }))
        );
        const batchResult = await this.workerManager.submitTask(
          _types_worker_types__WEBPACK_IMPORTED_MODULE_4__.WorkerMessageType.PARSE_BATCH_FILES,
          { files: batchData },
          {
            timeout: Math.min(8e3, 3e3 * batch.length),
            // 减少到8秒最大，每个文件3秒
            maxRetries: 1
          }
        );
        if (Array.isArray(batchResult)) {
          results.push(...batchResult);
        } else {
          results.push(batchResult);
        }
        _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.debug(`\u6279\u6B21 ${i + 1} \u5904\u7406\u5B8C\u6210\uFF0C\u89E3\u6790\u4E86 ${batch.length} \u4E2A\u6587\u4EF6`);
      } catch (error) {
        _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.warn(`\u6279\u91CF\u5904\u7406Java\u6587\u4EF6\u5931\u8D25\uFF0C\u5C1D\u8BD5\u964D\u7EA7\u5904\u7406`, error);
        for (const file of batch) {
          try {
            const content = await this.fileScanner.getFileContent(file.filePath);
            const syncResult = await this.parseJavaFileSync({
              filePath: file.filePath,
              content,
              fileType: "java",
              options: { parseMethodBodies: false }
            });
            results.push(syncResult);
          } catch (syncError) {
            _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.warn(`\u540C\u6B65\u89E3\u6790\u5931\u8D25: ${file.filePath}`, syncError);
          }
        }
      }
      if (i < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    return results;
  }
  /**
   * 新增：批量处理XML文件
   */
  async batchProcessXmlFiles(xmlFiles, progress, token, startProgress, progressRange) {
    if (xmlFiles.length === 0) {
      return [];
    }
    const results = [];
    const batchSize = Math.min(4, Math.max(1, Math.floor(xmlFiles.length / 3)));
    const batches = this.chunkArray(xmlFiles, batchSize);
    _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.info(`\u6279\u91CF\u5904\u7406XML\u6587\u4EF6: ${xmlFiles.length}\u4E2A\u6587\u4EF6\uFF0C${batches.length}\u4E2A\u6279\u6B21`);
    for (let i = 0; i < batches.length; i++) {
      if (token.isCancellationRequested) {
        throw new Error("\u7528\u6237\u53D6\u6D88\u4E86\u64CD\u4F5C");
      }
      const batch = batches[i];
      const batchProgress = startProgress + i * progressRange / batches.length;
      progress.report({
        increment: batchProgress,
        message: `\u5904\u7406XML\u6587\u4EF6\u6279\u6B21 ${i + 1}/${batches.length} (${batch.length}\u4E2A\u6587\u4EF6)`
      });
      try {
        const batchData = await Promise.all(
          batch.map(async (file) => ({
            filePath: file.filePath,
            content: await this.fileScanner.getFileContent(file.filePath),
            fileType: "xml"
          }))
        );
        const batchResult = await this.workerManager.submitTask(
          _types_worker_types__WEBPACK_IMPORTED_MODULE_4__.WorkerMessageType.PARSE_BATCH_FILES,
          { files: batchData },
          {
            timeout: Math.min(6e3, 2e3 * batch.length),
            // 减少到6秒最大，每个文件2秒
            maxRetries: 1
          }
        );
        if (Array.isArray(batchResult)) {
          results.push(...batchResult);
        } else {
          results.push(batchResult);
        }
        _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.debug(`XML\u6279\u6B21 ${i + 1} \u5904\u7406\u5B8C\u6210\uFF0C\u89E3\u6790\u4E86 ${batch.length} \u4E2A\u6587\u4EF6`);
      } catch (error) {
        _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.warn(`\u6279\u91CF\u5904\u7406XML\u6587\u4EF6\u5931\u8D25\uFF0C\u5C1D\u8BD5\u964D\u7EA7\u5904\u7406`, error);
        for (const file of batch) {
          try {
            const content = await this.fileScanner.getFileContent(file.filePath);
            const syncResult = await this.parseXmlFileSync({
              filePath: file.filePath,
              content,
              fileType: "xml"
            });
            results.push(syncResult);
          } catch (syncError) {
            _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.warn(`\u540C\u6B65\u89E3\u6790XML\u5931\u8D25: ${file.filePath}`, syncError);
          }
        }
      }
      if (i < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 80));
      }
    }
    return results;
  }
  /**
   * 新增：执行关系推断
   */
  async performRelationInference(javaResults, xmlResults, token) {
    if (token.isCancellationRequested) {
      throw new Error("\u7528\u6237\u53D6\u6D88\u4E86\u64CD\u4F5C");
    }
    try {
      const configStrategies = this.configManager.getExtensionConfig().inferenceStrategies;
      const strategies = [
        { name: "naming-convention", weight: 0.8, enabled: configStrategies.naming, minConfidence: 0.6 },
        { name: "annotation-based", weight: 0.9, enabled: configStrategies.annotation, minConfidence: 0.7 },
        { name: "xml-mapping", weight: 0.85, enabled: configStrategies.xml, minConfidence: 0.75 },
        { name: "field-type-analysis", weight: 0.7, enabled: configStrategies.semantic, minConfidence: 0.5 }
      ];
      const relationResult = await this.workerManager.submitTask(
        _types_worker_types__WEBPACK_IMPORTED_MODULE_4__.WorkerMessageType.INFER_RELATIONS,
        {
          entities: javaResults.filter((r) => r && r.success !== false),
          mappings: xmlResults.filter((r) => r && r.success !== false),
          strategies
        },
        {
          timeout: 15e3,
          // 关系推断可能需要更长时间
          maxRetries: 1
        }
      );
      return relationResult;
    } catch (error) {
      _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.warn("Worker\u5173\u7CFB\u63A8\u65AD\u5931\u8D25\uFF0C\u5C1D\u8BD5\u540C\u6B65\u63A8\u65AD", error);
      return this.performRelationInferenceSync(javaResults, xmlResults);
    }
  }
  /**
   * 新增：生成ER图数据
   */
  async generateERDiagramData(javaResults, xmlResults, relationResults) {
    const entities = javaResults.filter((r) => r && r.success !== false);
    const mappings = xmlResults.filter((r) => r && r.success !== false);
    const relations = relationResults?.relations || [];
    const mermaidCode = this.mermaidGenerator.generateERDiagram({
      entities,
      relations,
      generatedAt: /* @__PURE__ */ new Date(),
      projectPath: this.stateManager.getCurrentWorkspacePath() || ""
    });
    return {
      entities,
      relations,
      mermaidCode,
      metadata: {
        generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        totalEntities: entities.length,
        totalRelations: relations.length,
        confidence: relationResults?.confidence || 0,
        processingStats: {
          javaFiles: javaResults.length,
          xmlFiles: xmlResults.length,
          workerStats: this.workerManager.getStats()
        }
      }
    };
  }
  /**
   * 新增：同步Java文件解析（降级方案）
   */
  async parseJavaFileSync(fileData) {
    try {
      const { SmartJavaParser } = await __webpack_require__.e(/*! import() */ "src_parsers_java-parser_ts").then(__webpack_require__.bind(__webpack_require__, /*! ../parsers/java-parser */ "./src/parsers/java-parser.ts"));
      const parser = new SmartJavaParser();
      return await parser.parseJavaFile(fileData.filePath, fileData.content);
    } catch (error) {
      _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.warn(`\u540C\u6B65Java\u89E3\u6790\u5931\u8D25: ${fileData.filePath}`, error);
      return {
        filePath: fileData.filePath,
        error: error.message,
        success: false
      };
    }
  }
  /**
   * 新增：同步XML文件解析（降级方案）
   */
  async parseXmlFileSync(fileData) {
    try {
      const { SmartXmlParser } = await __webpack_require__.e(/*! import() */ "src_parsers_xml-parser_ts").then(__webpack_require__.bind(__webpack_require__, /*! ../parsers/xml-parser */ "./src/parsers/xml-parser.ts"));
      const parser = new SmartXmlParser();
      return await parser.parseXmlFile(fileData.filePath, fileData.content);
    } catch (error) {
      _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.warn(`\u540C\u6B65XML\u89E3\u6790\u5931\u8D25: ${fileData.filePath}`, error);
      return {
        filePath: fileData.filePath,
        error: error.message,
        success: false
      };
    }
  }
  /**
   * 新增：同步关系推断（降级方案）
   */
  async performRelationInferenceSync(javaResults, xmlResults) {
    try {
      const { RelationInferenceEngine } = await __webpack_require__.e(/*! import() */ "src_parsers_relation-inference_ts").then(__webpack_require__.bind(__webpack_require__, /*! ../parsers/relation-inference */ "./src/parsers/relation-inference.ts"));
      const engine = new RelationInferenceEngine();
      const entities = javaResults.filter((r) => r && r.success !== false);
      const mappings = xmlResults.filter((r) => r && r.success !== false);
      const configStrategies = this.configManager.getExtensionConfig().inferenceStrategies;
      const strategies = [
        { name: "naming-convention", weight: 0.8, enabled: configStrategies.naming, minConfidence: 0.6 },
        { name: "annotation-based", weight: 0.9, enabled: configStrategies.annotation, minConfidence: 0.7 },
        { name: "xml-mapping", weight: 0.85, enabled: configStrategies.xml, minConfidence: 0.75 },
        { name: "field-type-analysis", weight: 0.7, enabled: configStrategies.semantic, minConfidence: 0.5 }
      ];
      return await engine.inferRelations(entities, mappings, {
        strategies
      });
    } catch (error) {
      _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.warn("\u540C\u6B65\u5173\u7CFB\u63A8\u65AD\u5931\u8D25", error);
      return {
        relations: [],
        confidence: 0,
        error: error.message
      };
    }
  }
  /**
   * 新增：数组分块工具方法
   */
  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
  /**
   * 刷新ER图命令处理 - 优化版本
   */
  async handleRefreshERDiagram() {
    if (this.isProcessing) {
      vscode__WEBPACK_IMPORTED_MODULE_0__.window.showWarningMessage("ER\u56FE\u751F\u6210\u6B63\u5728\u8FDB\u884C\u4E2D\uFF0C\u8BF7\u7A0D\u5019...");
      return;
    }
    try {
      await this.stateManager.clearERDiagramData();
      await this.stateManager.cleanExpiredCache();
      await this.handleGenerateERDiagram();
    } catch (error) {
      _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.error("\u5237\u65B0ER\u56FE\u5931\u8D25", error);
      vscode__WEBPACK_IMPORTED_MODULE_0__.window.showErrorMessage(`\u5237\u65B0ER\u56FE\u5931\u8D25: ${error}`);
    }
  }
  /**
   * 显示状态命令处理 - 增强版本
   */
  async handleShowStatus() {
    try {
      const workerStats = this.workerManager.getStats();
      const healthStatus = this.workerManager.getHealthStatus();
      const stateStats = this.stateManager.getStateStats();
      const configSummary = this.configManager.getConfigSummary();
      const memUsage = process.memoryUsage();
      const statusInfo = {
        "\u{1F527} Worker\u72B6\u6001": {
          "\u6D3B\u8DC3Worker": `${workerStats.activeWorkers}/${workerStats.activeWorkers + workerStats.idleWorkers}`,
          "\u961F\u5217\u4EFB\u52A1": workerStats.queuedTasks,
          "\u5904\u7406\u4E2D\u4EFB\u52A1": workerStats.processingTasks,
          "\u5DF2\u5B8C\u6210\u4EFB\u52A1": workerStats.totalProcessedTasks,
          "\u5E73\u5747\u961F\u5217\u65F6\u95F4": `${workerStats.averageQueueTime}ms`
        },
        "\u{1F4BE} \u5185\u5B58\u4F7F\u7528": {
          "\u5806\u5185\u5B58": `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
          "\u603B\u5185\u5B58": `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
          "\u5916\u90E8\u5185\u5B58": `${Math.round(memUsage.external / 1024 / 1024)}MB`
        },
        "\u{1F3E5} \u5065\u5EB7\u72B6\u6001": {
          "\u72B6\u6001": healthStatus.healthy ? "\u2705 \u5065\u5EB7" : "\u26A0\uFE0F \u5F02\u5E38",
          "\u95EE\u9898": healthStatus.issues.length > 0 ? healthStatus.issues.join(", ") : "\u65E0",
          "\u5EFA\u8BAE": healthStatus.recommendations.length > 0 ? healthStatus.recommendations.join(", ") : "\u65E0"
        },
        "\u{1F4CA} \u7F13\u5B58\u72B6\u6001": stateStats,
        "\u2699\uFE0F \u914D\u7F6E": configSummary
      };
      const statusText = Object.entries(statusInfo).map(([category, data]) => {
        const items = Object.entries(data).map(([key, value]) => `  ${key}: ${value}`).join("\n");
        return `${category}
${items}`;
      }).join("\n\n");
      const action = await vscode__WEBPACK_IMPORTED_MODULE_0__.window.showInformationMessage(
        "MyBatis ER Generator \u72B6\u6001\u4FE1\u606F",
        { modal: true, detail: statusText },
        "\u590D\u5236\u5230\u526A\u8D34\u677F",
        "\u6E05\u7406\u7F13\u5B58",
        "\u91CD\u542FWorker"
      );
      if (action === "\u590D\u5236\u5230\u526A\u8D34\u677F") {
        await vscode__WEBPACK_IMPORTED_MODULE_0__.env.clipboard.writeText(statusText);
        vscode__WEBPACK_IMPORTED_MODULE_0__.window.showInformationMessage("\u72B6\u6001\u4FE1\u606F\u5DF2\u590D\u5236\u5230\u526A\u8D34\u677F");
      } else if (action === "\u6E05\u7406\u7F13\u5B58") {
        await this.handleClearCache();
      } else if (action === "\u91CD\u542FWorker") {
        await this.restartWorkerManager();
      }
    } catch (error) {
      _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.error("\u83B7\u53D6\u72B6\u6001\u4FE1\u606F\u5931\u8D25", error);
      vscode__WEBPACK_IMPORTED_MODULE_0__.window.showErrorMessage(`\u83B7\u53D6\u72B6\u6001\u4FE1\u606F\u5931\u8D25: ${error}`);
    }
  }
  /**
   * 新增：重启Worker管理器
   */
  async restartWorkerManager() {
    try {
      vscode__WEBPACK_IMPORTED_MODULE_0__.window.showInformationMessage("\u6B63\u5728\u91CD\u542FWorker\u7BA1\u7406\u5668...");
      await this.workerManager.shutdown();
      const workerConfig = this.getOptimizedWorkerConfig();
      this.workerManager = new _workers_worker_manager__WEBPACK_IMPORTED_MODULE_2__.WorkerManager(workerConfig);
      await this.workerManager.start();
      vscode__WEBPACK_IMPORTED_MODULE_0__.window.showInformationMessage("Worker\u7BA1\u7406\u5668\u91CD\u542F\u5B8C\u6210");
      _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.info("Worker\u7BA1\u7406\u5668\u91CD\u542F\u5B8C\u6210");
    } catch (error) {
      _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.error("\u91CD\u542FWorker\u7BA1\u7406\u5668\u5931\u8D25", error);
      vscode__WEBPACK_IMPORTED_MODULE_0__.window.showErrorMessage(`\u91CD\u542FWorker\u7BA1\u7406\u5668\u5931\u8D25: ${error}`);
    }
  }
  /**
   * 获取优化的Worker配置
   */
  getOptimizedWorkerConfig() {
    const cpuCount = (__webpack_require__(/*! os */ "os").cpus)().length;
    return {
      maxWorkers: Math.min(cpuCount, 6),
      // 进一步减少到最多6个Worker
      workerTimeout: 1e4,
      // 进一步减少到10秒
      maxQueueSize: 30,
      // 进一步减少队列大小
      heartbeatInterval: 2e3,
      // 更频繁的心跳检测
      maxRetries: 1,
      // 只重试1次
      enableProfiling: false
    };
  }
  /**
   * 清除缓存命令处理 - 增强版本
   */
  async handleClearCache() {
    try {
      const result = await vscode__WEBPACK_IMPORTED_MODULE_0__.window.showWarningMessage(
        "\u786E\u5B9A\u8981\u6E05\u9664\u6240\u6709\u7F13\u5B58\u5417\uFF1F\u8FD9\u5C06\u5220\u9664\u5DF2\u89E3\u6790\u7684\u6570\u636E\u3002",
        "\u786E\u5B9A",
        "\u53D6\u6D88"
      );
      if (result === "\u786E\u5B9A") {
        await this.stateManager.clearERDiagramData();
        await this.stateManager.cleanExpiredCache();
        const workerStats = this.workerManager.getStats();
        if (workerStats.activeWorkers > 0) {
          _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.info("\u6E05\u7406Worker\u72B6\u6001");
        }
        vscode__WEBPACK_IMPORTED_MODULE_0__.window.showInformationMessage("\u7F13\u5B58\u5DF2\u6E05\u9664");
        _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.info("\u7528\u6237\u624B\u52A8\u6E05\u9664\u7F13\u5B58");
      }
    } catch (error) {
      _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.error("\u6E05\u9664\u7F13\u5B58\u5931\u8D25", error);
      vscode__WEBPACK_IMPORTED_MODULE_0__.window.showErrorMessage(`\u6E05\u9664\u7F13\u5B58\u5931\u8D25: ${error}`);
    }
  }
  /**
   * 测试WebView界面 - 加载示例数据
   */
  async handleTestWebView() {
    try {
      _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.info("\u52A0\u8F7D\u6D4B\u8BD5\u6570\u636E\u5230WebView");
      const mermaidCode = this.mermaidGenerator.generateERDiagram(_ui_test_data__WEBPACK_IMPORTED_MODULE_6__.testERData);
      this.webviewProvider.updateDiagram(_ui_test_data__WEBPACK_IMPORTED_MODULE_6__.testERData);
      vscode__WEBPACK_IMPORTED_MODULE_0__.window.showInformationMessage("\u6D4B\u8BD5\u6570\u636E\u5DF2\u52A0\u8F7D\u5230ER\u56FE\u89C6\u56FE\uFF01");
    } catch (error) {
      _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.error("\u52A0\u8F7D\u6D4B\u8BD5\u6570\u636E\u5931\u8D25", error);
      vscode__WEBPACK_IMPORTED_MODULE_0__.window.showErrorMessage(`\u52A0\u8F7D\u6D4B\u8BD5\u6570\u636E\u5931\u8D25: ${error}`);
    }
  }
  /**
   * 运行性能基准测试
   */
  async handlePerformanceBenchmark() {
    try {
      _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.info("\u5F00\u59CB\u8FD0\u884C\u6027\u80FD\u57FA\u51C6\u6D4B\u8BD5");
      await vscode__WEBPACK_IMPORTED_MODULE_0__.window.withProgress({
        location: vscode__WEBPACK_IMPORTED_MODULE_0__.ProgressLocation.Notification,
        title: "\u6B63\u5728\u8FD0\u884C\u6027\u80FD\u57FA\u51C6\u6D4B\u8BD5...",
        cancellable: false
      }, async (progress) => {
        progress.report({ increment: 0, message: "\u521D\u59CB\u5316\u6D4B\u8BD5\u73AF\u5883..." });
        const tester = _utils_performance_tester__WEBPACK_IMPORTED_MODULE_7__.PerformanceTester.getInstance();
        progress.report({ increment: 30, message: "\u8FD0\u884C\u57FA\u51C6\u6D4B\u8BD5\u5957\u4EF6..." });
        const report = await tester.runBenchmarkSuite();
        progress.report({ increment: 100, message: "\u6D4B\u8BD5\u5B8C\u6210" });
        await tester.showPerformanceReport();
      });
      _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.info("\u6027\u80FD\u57FA\u51C6\u6D4B\u8BD5\u5B8C\u6210");
    } catch (error) {
      _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.error("\u6027\u80FD\u57FA\u51C6\u6D4B\u8BD5\u5931\u8D25", error);
      vscode__WEBPACK_IMPORTED_MODULE_0__.window.showErrorMessage(`\u6027\u80FD\u57FA\u51C6\u6D4B\u8BD5\u5931\u8D25: ${error}`);
    }
  }
  /**
   * 简单的扩展功能测试
   */
  async handleSimpleTest() {
    try {
      _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.info("\u5F00\u59CB\u7B80\u5355\u529F\u80FD\u6D4B\u8BD5");
      const workerStats = this.workerManager.getStats();
      _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.info("Worker\u72B6\u6001", workerStats);
      const stateStats = this.stateManager.getStateStats();
      _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.info("\u72B6\u6001\u7BA1\u7406\u5668", stateStats);
      const configSummary = this.configManager.getConfigSummary();
      _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.info("\u914D\u7F6E\u7BA1\u7406\u5668", configSummary);
      vscode__WEBPACK_IMPORTED_MODULE_0__.window.showInformationMessage(
        `\u6269\u5C55\u529F\u80FD\u6D4B\u8BD5\u5B8C\u6210\uFF01
Worker\u72B6\u6001: ${workerStats.activeWorkers + workerStats.idleWorkers}\u4E2AWorker
\u914D\u7F6E\u72B6\u6001: \u6B63\u5E38
\u72B6\u6001\u7BA1\u7406: \u6B63\u5E38`
      );
      _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.info("\u7B80\u5355\u529F\u80FD\u6D4B\u8BD5\u5B8C\u6210");
    } catch (error) {
      _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.error("\u7B80\u5355\u529F\u80FD\u6D4B\u8BD5\u5931\u8D25", error);
      vscode__WEBPACK_IMPORTED_MODULE_0__.window.showErrorMessage(`\u529F\u80FD\u6D4B\u8BD5\u5931\u8D25: ${error}`);
    }
  }
}


/***/ }),

/***/ "./src/types/worker-types.ts":
/*!***********************************!*\
  !*** ./src/types/worker-types.ts ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   WorkerErrorType: () => (/* binding */ WorkerErrorType),
/* harmony export */   WorkerEventType: () => (/* binding */ WorkerEventType),
/* harmony export */   WorkerMessageType: () => (/* binding */ WorkerMessageType),
/* harmony export */   WorkerStatus: () => (/* binding */ WorkerStatus)
/* harmony export */ });

var WorkerMessageType = /* @__PURE__ */ ((WorkerMessageType2) => {
  WorkerMessageType2["PARSE_JAVA_FILE"] = "PARSE_JAVA_FILE";
  WorkerMessageType2["PARSE_XML_FILE"] = "PARSE_XML_FILE";
  WorkerMessageType2["PARSE_BATCH_FILES"] = "PARSE_BATCH_FILES";
  WorkerMessageType2["INFER_RELATIONS"] = "INFER_RELATIONS";
  WorkerMessageType2["VALIDATE_RELATIONS"] = "VALIDATE_RELATIONS";
  WorkerMessageType2["GENERATE_DIAGRAM"] = "GENERATE_DIAGRAM";
  WorkerMessageType2["EXPORT_DIAGRAM"] = "EXPORT_DIAGRAM";
  WorkerMessageType2["PING"] = "PING";
  WorkerMessageType2["PONG"] = "PONG";
  WorkerMessageType2["TERMINATE"] = "TERMINATE";
  WorkerMessageType2["ERROR"] = "ERROR";
  WorkerMessageType2["PROGRESS"] = "PROGRESS";
  return WorkerMessageType2;
})(WorkerMessageType || {});
var WorkerStatus = /* @__PURE__ */ ((WorkerStatus2) => {
  WorkerStatus2["IDLE"] = "idle";
  WorkerStatus2["BUSY"] = "busy";
  WorkerStatus2["ERROR"] = "error";
  WorkerStatus2["TERMINATED"] = "terminated";
  return WorkerStatus2;
})(WorkerStatus || {});
var WorkerErrorType = /* @__PURE__ */ ((WorkerErrorType2) => {
  WorkerErrorType2["TIMEOUT"] = "timeout";
  WorkerErrorType2["PARSE_ERROR"] = "parse_error";
  WorkerErrorType2["MEMORY_ERROR"] = "memory_error";
  WorkerErrorType2["NETWORK_ERROR"] = "network_error";
  WorkerErrorType2["VALIDATION_ERROR"] = "validation_error";
  WorkerErrorType2["UNKNOWN_ERROR"] = "unknown_error";
  return WorkerErrorType2;
})(WorkerErrorType || {});
var WorkerEventType = /* @__PURE__ */ ((WorkerEventType2) => {
  WorkerEventType2["WORKER_CREATED"] = "worker_created";
  WorkerEventType2["WORKER_TERMINATED"] = "worker_terminated";
  WorkerEventType2["TASK_STARTED"] = "task_started";
  WorkerEventType2["TASK_COMPLETED"] = "task_completed";
  WorkerEventType2["TASK_FAILED"] = "task_failed";
  WorkerEventType2["QUEUE_FULL"] = "queue_full";
  WorkerEventType2["PERFORMANCE_WARNING"] = "performance_warning";
  return WorkerEventType2;
})(WorkerEventType || {});


/***/ }),

/***/ "./src/ui/mermaid-generator.ts":
/*!*************************************!*\
  !*** ./src/ui/mermaid-generator.ts ***!
  \*************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   MermaidERGenerator: () => (/* binding */ MermaidERGenerator)
/* harmony export */ });

class MermaidERGenerator {
  /**
   * 生成完整的Mermaid ER图代码
   */
  generateERDiagram(data) {
    const { entities, relations } = data;
    if (!entities || entities.length === 0) {
      return this.generateEmptyDiagram();
    }
    let mermaidCode = "erDiagram\n";
    mermaidCode += this.generateEntities(entities);
    if (relations && relations.length > 0) {
      mermaidCode += "\n";
      mermaidCode += this.generateRelations(relations);
    }
    return mermaidCode;
  }
  /**
   * 生成空图表提示
   */
  generateEmptyDiagram() {
    return `erDiagram
    NO_ENTITIES {
        string message "\u672A\u627E\u5230MyBatis\u5B9E\u4F53\u7C7B"
        string suggestion "\u8BF7\u786E\u4FDD\u9879\u76EE\u5305\u542B@TableName\u7B49\u6CE8\u89E3\u7684\u5B9E\u4F53\u7C7B"
    }`;
  }
  /**
   * 生成实体定义
   */
  generateEntities(entities) {
    return entities.map((entity) => this.generateEntity(entity)).join("\n\n");
  }
  /**
   * 生成单个实体定义
   */
  generateEntity(entity) {
    const tableName = this.sanitizeTableName(entity.tableName);
    let entityCode = `    ${tableName} {
`;
    if (entity.fields && entity.fields.length > 0) {
      const fieldDefinitions = entity.fields.map(
        (field) => this.generateField(field)
      ).join("\n");
      entityCode += fieldDefinitions;
    } else {
      entityCode += '        string placeholder "\u6682\u65E0\u5B57\u6BB5\u4FE1\u606F"\n';
    }
    entityCode += "    }";
    const comment = this.generateEntityComment(entity);
    if (comment) {
      entityCode += ` %% ${comment}`;
    }
    return entityCode;
  }
  /**
   * 生成字段定义
   */
  generateField(field) {
    const columnType = this.mapJavaTypeToDBType(field.javaType);
    const columnName = this.sanitizeColumnName(field.columnName);
    const constraints = this.generateFieldConstraints(field);
    return `        ${columnType} ${columnName}${constraints}`;
  }
  /**
   * 生成字段约束
   */
  generateFieldConstraints(field) {
    const constraints = [];
    if (field.isPrimaryKey) {
      constraints.push("PK");
    }
    if (field.isNotNull) {
      constraints.push("NOT NULL");
    }
    if (field.isUnique) {
      constraints.push("UNIQUE");
    }
    if (field.defaultValue) {
      constraints.push(`DEFAULT "${field.defaultValue}"`);
    }
    if (field.comment) {
      constraints.push(`"${field.comment}"`);
    }
    return constraints.length > 0 ? ` ${constraints.join(" ")}` : "";
  }
  /**
   * 生成实体注释
   */
  generateEntityComment(entity) {
    const comments = [];
    if (entity.className) {
      comments.push(`Java\u7C7B: ${entity.className}`);
    }
    if (entity.comment) {
      comments.push(entity.comment);
    }
    const tableAnnotation = entity.annotations.find(
      (ann) => ann.name === "TableName" || ann.name === "Table"
    );
    if (tableAnnotation) {
      comments.push(`\u6CE8\u89E3: @${tableAnnotation.name}`);
    }
    return comments.join(", ");
  }
  /**
   * 生成关系定义
   */
  generateRelations(relations) {
    return relations.map((relation) => this.generateRelation(relation)).join("\n");
  }
  /**
   * 生成单个关系定义
   */
  generateRelation(relation) {
    const fromTable = this.sanitizeTableName(relation.fromTable);
    const toTable = this.sanitizeTableName(relation.toTable);
    const relationshipSymbol = this.getRelationshipSymbol(relation.type);
    let relationCode = `    ${fromTable} ${relationshipSymbol} ${toTable}`;
    if (relation.fromField || relation.toField) {
      const label = this.generateRelationLabel(relation);
      relationCode += ` : ${label}`;
    }
    const comment = this.generateRelationComment(relation);
    if (comment) {
      relationCode += ` %% ${comment}`;
    }
    return relationCode;
  }
  /**
   * 获取关系符号
   */
  getRelationshipSymbol(relationType) {
    switch (relationType.toLowerCase()) {
      case "one-to-one":
        return "||--||";
      case "one-to-many":
        return "||--o{";
      case "many-to-one":
        return "}o--||";
      case "many-to-many":
        return "}o--o{";
      default:
        return "||--||";
    }
  }
  /**
   * 生成关系标签
   */
  generateRelationLabel(relation) {
    const labels = [];
    if (relation.fromField) {
      labels.push(relation.fromField);
    }
    if (relation.toField && relation.toField !== relation.fromField) {
      labels.push(relation.toField);
    }
    return labels.join("-");
  }
  /**
   * 生成关系注释
   */
  generateRelationComment(relation) {
    const comments = [];
    if (relation.confidence !== void 0) {
      comments.push(`\u7F6E\u4FE1\u5EA6: ${(relation.confidence * 100).toFixed(1)}%`);
    }
    if (relation.source) {
      comments.push(`\u6765\u6E90: ${relation.source}`);
    }
    if (relation.description) {
      comments.push(relation.description);
    }
    return comments.join(", ");
  }
  /**
   * Java类型到数据库类型的映射
   */
  mapJavaTypeToDBType(javaType) {
    const typeMapping = {
      "String": "varchar",
      "Integer": "int",
      "int": "int",
      "Long": "bigint",
      "long": "bigint",
      "Double": "double",
      "double": "double",
      "Float": "float",
      "float": "float",
      "Boolean": "boolean",
      "boolean": "boolean",
      "Date": "datetime",
      "LocalDate": "date",
      "LocalDateTime": "datetime",
      "LocalTime": "time",
      "Timestamp": "timestamp",
      "BigDecimal": "decimal",
      "byte[]": "blob",
      "Byte[]": "blob"
    };
    const baseType = javaType.split("<")[0];
    return typeMapping[baseType] || "varchar";
  }
  /**
   * 清理表名，确保符合Mermaid语法
   */
  sanitizeTableName(tableName) {
    if (!tableName) {
      return "UNKNOWN_TABLE";
    }
    return tableName.replace(/[^a-zA-Z0-9_]/g, "_").toUpperCase();
  }
  /**
   * 清理列名，确保符合Mermaid语法
   */
  sanitizeColumnName(columnName) {
    if (!columnName) {
      return "unknown_column";
    }
    return columnName.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
  }
  /**
   * 生成带主题的Mermaid图表
   */
  generateThemedDiagram(data, theme = "default") {
    const diagram = this.generateERDiagram(data);
    const themeConfig = this.getThemeConfig(theme);
    return `%%{init: ${themeConfig}}%%
${diagram}`;
  }
  /**
   * 获取主题配置
   */
  getThemeConfig(theme) {
    const themeConfigs = {
      default: '{"theme": "default"}',
      dark: '{"theme": "dark"}',
      forest: '{"theme": "forest"}',
      neutral: '{"theme": "neutral"}'
    };
    return themeConfigs[theme] || themeConfigs.default;
  }
  /**
   * 生成统计信息
   */
  generateStatistics(data) {
    const { entities, relations } = data;
    const stats = {
      entityCount: entities.length,
      relationCount: relations.length,
      fieldCount: entities.reduce((total, entity) => total + entity.fields.length, 0),
      relationTypes: {}
    };
    relations.forEach((relation) => {
      const type = relation.type;
      stats.relationTypes[type] = (stats.relationTypes[type] || 0) + 1;
    });
    return stats;
  }
  /**
   * 验证生成的Mermaid代码
   */
  validateMermaidCode(mermaidCode) {
    const errors = [];
    const warnings = [];
    if (!mermaidCode.trim().startsWith("erDiagram")) {
      errors.push('Mermaid\u4EE3\u7801\u5FC5\u987B\u4EE5"erDiagram"\u5F00\u5934');
    }
    const entityMatches = mermaidCode.match(/\s+\w+\s*\{[^}]*\}/g);
    if (!entityMatches || entityMatches.length === 0) {
      warnings.push("\u672A\u627E\u5230\u5B9E\u4F53\u5B9A\u4E49");
    }
    const relationMatches = mermaidCode.match(/\s+\w+\s+\|\|--[o\|]\{?\s+\w+/g);
    if (!relationMatches || relationMatches.length === 0) {
      warnings.push("\u672A\u627E\u5230\u5173\u7CFB\u5B9A\u4E49");
    }
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}


/***/ }),

/***/ "./src/ui/test-data.ts":
/*!*****************************!*\
  !*** ./src/ui/test-data.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   generateTestMermaidCode: () => (/* binding */ generateTestMermaidCode),
/* harmony export */   testERData: () => (/* binding */ testERData)
/* harmony export */ });

const testERData = {
  entities: [
    {
      className: "User",
      tableName: "user",
      comment: "\u7528\u6237\u8868",
      filePath: "/src/main/java/com/example/entity/User.java",
      annotations: [
        {
          name: "TableName",
          attributes: { value: "user" }
        }
      ],
      fields: [
        {
          fieldName: "id",
          columnName: "id",
          javaType: "Long",
          isPrimaryKey: true,
          isNotNull: true,
          isUnique: true,
          comment: "\u7528\u6237ID"
        },
        {
          fieldName: "username",
          columnName: "username",
          javaType: "String",
          isPrimaryKey: false,
          isNotNull: true,
          isUnique: true,
          comment: "\u7528\u6237\u540D"
        },
        {
          fieldName: "email",
          columnName: "email",
          javaType: "String",
          isPrimaryKey: false,
          isNotNull: true,
          isUnique: true,
          comment: "\u90AE\u7BB1"
        },
        {
          fieldName: "createTime",
          columnName: "create_time",
          javaType: "LocalDateTime",
          isPrimaryKey: false,
          isNotNull: true,
          isUnique: false,
          comment: "\u521B\u5EFA\u65F6\u95F4"
        }
      ]
    },
    {
      className: "Order",
      tableName: "order",
      comment: "\u8BA2\u5355\u8868",
      filePath: "/src/main/java/com/example/entity/Order.java",
      annotations: [
        {
          name: "TableName",
          attributes: { value: "order" }
        }
      ],
      fields: [
        {
          fieldName: "id",
          columnName: "id",
          javaType: "Long",
          isPrimaryKey: true,
          isNotNull: true,
          isUnique: true,
          comment: "\u8BA2\u5355ID"
        },
        {
          fieldName: "userId",
          columnName: "user_id",
          javaType: "Long",
          isPrimaryKey: false,
          isNotNull: true,
          isUnique: false,
          comment: "\u7528\u6237ID"
        },
        {
          fieldName: "orderNo",
          columnName: "order_no",
          javaType: "String",
          isPrimaryKey: false,
          isNotNull: true,
          isUnique: true,
          comment: "\u8BA2\u5355\u53F7"
        },
        {
          fieldName: "totalAmount",
          columnName: "total_amount",
          javaType: "BigDecimal",
          isPrimaryKey: false,
          isNotNull: true,
          isUnique: false,
          comment: "\u603B\u91D1\u989D"
        },
        {
          fieldName: "status",
          columnName: "status",
          javaType: "Integer",
          isPrimaryKey: false,
          isNotNull: true,
          isUnique: false,
          comment: "\u8BA2\u5355\u72B6\u6001"
        },
        {
          fieldName: "createTime",
          columnName: "create_time",
          javaType: "LocalDateTime",
          isPrimaryKey: false,
          isNotNull: true,
          isUnique: false,
          comment: "\u521B\u5EFA\u65F6\u95F4"
        }
      ]
    },
    {
      className: "OrderItem",
      tableName: "order_item",
      comment: "\u8BA2\u5355\u9879\u8868",
      filePath: "/src/main/java/com/example/entity/OrderItem.java",
      annotations: [
        {
          name: "TableName",
          attributes: { value: "order_item" }
        }
      ],
      fields: [
        {
          fieldName: "id",
          columnName: "id",
          javaType: "Long",
          isPrimaryKey: true,
          isNotNull: true,
          isUnique: true,
          comment: "\u8BA2\u5355\u9879ID"
        },
        {
          fieldName: "orderId",
          columnName: "order_id",
          javaType: "Long",
          isPrimaryKey: false,
          isNotNull: true,
          isUnique: false,
          comment: "\u8BA2\u5355ID"
        },
        {
          fieldName: "productId",
          columnName: "product_id",
          javaType: "Long",
          isPrimaryKey: false,
          isNotNull: true,
          isUnique: false,
          comment: "\u4EA7\u54C1ID"
        },
        {
          fieldName: "quantity",
          columnName: "quantity",
          javaType: "Integer",
          isPrimaryKey: false,
          isNotNull: true,
          isUnique: false,
          comment: "\u6570\u91CF"
        },
        {
          fieldName: "price",
          columnName: "price",
          javaType: "BigDecimal",
          isPrimaryKey: false,
          isNotNull: true,
          isUnique: false,
          comment: "\u5355\u4EF7"
        }
      ]
    },
    {
      className: "Product",
      tableName: "product",
      comment: "\u4EA7\u54C1\u8868",
      filePath: "/src/main/java/com/example/entity/Product.java",
      annotations: [
        {
          name: "TableName",
          attributes: { value: "product" }
        }
      ],
      fields: [
        {
          fieldName: "id",
          columnName: "id",
          javaType: "Long",
          isPrimaryKey: true,
          isNotNull: true,
          isUnique: true,
          comment: "\u4EA7\u54C1ID"
        },
        {
          fieldName: "name",
          columnName: "name",
          javaType: "String",
          isPrimaryKey: false,
          isNotNull: true,
          isUnique: false,
          comment: "\u4EA7\u54C1\u540D\u79F0"
        },
        {
          fieldName: "description",
          columnName: "description",
          javaType: "String",
          isPrimaryKey: false,
          isNotNull: false,
          isUnique: false,
          comment: "\u4EA7\u54C1\u63CF\u8FF0"
        },
        {
          fieldName: "price",
          columnName: "price",
          javaType: "BigDecimal",
          isPrimaryKey: false,
          isNotNull: true,
          isUnique: false,
          comment: "\u4EF7\u683C"
        },
        {
          fieldName: "stock",
          columnName: "stock",
          javaType: "Integer",
          isPrimaryKey: false,
          isNotNull: true,
          isUnique: false,
          comment: "\u5E93\u5B58"
        }
      ]
    }
  ],
  relations: [
    {
      fromTable: "user",
      toTable: "order",
      fromField: "id",
      toField: "user_id",
      type: "one-to-many",
      confidence: 0.95,
      source: "naming-convention",
      description: "\u7528\u6237\u4E0E\u8BA2\u5355\u7684\u4E00\u5BF9\u591A\u5173\u7CFB"
    },
    {
      fromTable: "order",
      toTable: "order_item",
      fromField: "id",
      toField: "order_id",
      type: "one-to-many",
      confidence: 0.95,
      source: "naming-convention",
      description: "\u8BA2\u5355\u4E0E\u8BA2\u5355\u9879\u7684\u4E00\u5BF9\u591A\u5173\u7CFB"
    },
    {
      fromTable: "product",
      toTable: "order_item",
      fromField: "id",
      toField: "product_id",
      type: "one-to-many",
      confidence: 0.95,
      source: "naming-convention",
      description: "\u4EA7\u54C1\u4E0E\u8BA2\u5355\u9879\u7684\u4E00\u5BF9\u591A\u5173\u7CFB"
    }
  ]
};
function generateTestMermaidCode() {
  return `erDiagram
    USER {
        bigint id PK NOT NULL "\u7528\u6237ID"
        varchar username NOT NULL UNIQUE "\u7528\u6237\u540D"
        varchar email NOT NULL UNIQUE "\u90AE\u7BB1"
        datetime create_time NOT NULL "\u521B\u5EFA\u65F6\u95F4"
    }

    ORDER {
        bigint id PK NOT NULL "\u8BA2\u5355ID"
        bigint user_id NOT NULL "\u7528\u6237ID"
        varchar order_no NOT NULL UNIQUE "\u8BA2\u5355\u53F7"
        decimal total_amount NOT NULL "\u603B\u91D1\u989D"
        int status NOT NULL "\u8BA2\u5355\u72B6\u6001"
        datetime create_time NOT NULL "\u521B\u5EFA\u65F6\u95F4"
    }

    ORDER_ITEM {
        bigint id PK NOT NULL "\u8BA2\u5355\u9879ID"
        bigint order_id NOT NULL "\u8BA2\u5355ID"
        bigint product_id NOT NULL "\u4EA7\u54C1ID"
        int quantity NOT NULL "\u6570\u91CF"
        decimal price NOT NULL "\u5355\u4EF7"
    }

    PRODUCT {
        bigint id PK NOT NULL "\u4EA7\u54C1ID"
        varchar name NOT NULL "\u4EA7\u54C1\u540D\u79F0"
        varchar description "\u4EA7\u54C1\u63CF\u8FF0"
        decimal price NOT NULL "\u4EF7\u683C"
        int stock NOT NULL "\u5E93\u5B58"
    }

    USER ||--o{ ORDER : "id-user_id"
    ORDER ||--o{ ORDER_ITEM : "id-order_id"
    PRODUCT ||--o{ ORDER_ITEM : "id-product_id"`;
}


/***/ }),

/***/ "./src/ui/webview-provider.ts":
/*!************************************!*\
  !*** ./src/ui/webview-provider.ts ***!
  \************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ERDiagramWebViewProvider: () => (/* binding */ ERDiagramWebViewProvider)
/* harmony export */ });
/* harmony import */ var vscode__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! vscode */ "vscode");
/* harmony import */ var vscode__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(vscode__WEBPACK_IMPORTED_MODULE_0__);


class ERDiagramWebViewProvider {
  constructor(_extensionUri, _context) {
    this._extensionUri = _extensionUri;
    this._context = _context;
  }
  resolveWebviewView(webviewView, context, _token) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        this._extensionUri
      ]
    };
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    webviewView.webview.onDidReceiveMessage(
      (message) => {
        switch (message.type) {
          case "exportDiagram":
            this._exportDiagram(message.format);
            break;
          case "refreshDiagram":
            this._refreshDiagram();
            break;
          case "searchEntities":
            this._searchEntities(message.query);
            break;
          case "filterRelations":
            this._filterRelations(message.filter);
            break;
        }
      },
      void 0,
      this._context.subscriptions
    );
  }
  /**
   * 更新ER图数据
   */
  updateDiagram(data) {
    this._data = data;
    if (this._view) {
      this._view.webview.postMessage({
        type: "updateDiagram",
        data
      });
    }
  }
  /**
   * 显示加载状态
   */
  showLoading(message = "\u6B63\u5728\u751F\u6210ER\u56FE...") {
    if (this._view) {
      this._view.webview.postMessage({
        type: "showLoading",
        message
      });
    }
  }
  /**
   * 显示错误信息
   */
  showError(error) {
    if (this._view) {
      this._view.webview.postMessage({
        type: "showError",
        error
      });
    }
  }
  /**
   * 导出ER图
   */
  async _exportDiagram(format) {
    if (!this._data) {
      vscode__WEBPACK_IMPORTED_MODULE_0__.window.showWarningMessage("\u6CA1\u6709\u53EF\u5BFC\u51FA\u7684ER\u56FE\u6570\u636E");
      return;
    }
    try {
      const uri = await vscode__WEBPACK_IMPORTED_MODULE_0__.window.showSaveDialog({
        defaultUri: vscode__WEBPACK_IMPORTED_MODULE_0__.Uri.file(`er-diagram.${format}`),
        filters: {
          [format.toUpperCase()]: [format]
        }
      });
      if (uri) {
        this._view?.webview.postMessage({
          type: "exportToFile",
          format,
          path: uri.fsPath
        });
      }
    } catch (error) {
      vscode__WEBPACK_IMPORTED_MODULE_0__.window.showErrorMessage(`\u5BFC\u51FA\u5931\u8D25: ${error}`);
    }
  }
  /**
   * 刷新ER图
   */
  async _refreshDiagram() {
    try {
      this.showLoading("\u6B63\u5728\u5237\u65B0ER\u56FE...");
      await vscode__WEBPACK_IMPORTED_MODULE_0__.commands.executeCommand("mybatis-er.generate");
    } catch (error) {
      this.showError(`\u5237\u65B0\u5931\u8D25: ${error}`);
    }
  }
  /**
   * 搜索实体
   */
  _searchEntities(query) {
    if (this._view) {
      this._view.webview.postMessage({
        type: "searchResults",
        query,
        results: this._performSearch(query)
      });
    }
  }
  /**
   * 过滤关系
   */
  _filterRelations(filter) {
    if (this._view) {
      this._view.webview.postMessage({
        type: "filterResults",
        filter,
        data: this._applyFilter(filter)
      });
    }
  }
  /**
   * 执行搜索
   */
  _performSearch(query) {
    if (!this._data || !query.trim()) {
      return [];
    }
    const lowerQuery = query.toLowerCase();
    return this._data.entities.filter(
      (entity) => entity.tableName.toLowerCase().includes(lowerQuery) || entity.className.toLowerCase().includes(lowerQuery) || entity.fields.some(
        (field) => field.fieldName.toLowerCase().includes(lowerQuery) || field.columnName.toLowerCase().includes(lowerQuery)
      )
    );
  }
  /**
   * 应用过滤器
   */
  _applyFilter(filter) {
    if (!this._data) {
      return { entities: [], relations: [] };
    }
    let filteredEntities = this._data.entities;
    let filteredRelations = this._data.relations;
    if (filter.entityType) {
      filteredEntities = filteredEntities.filter(
        (entity) => entity.annotations.some((ann) => ann.name === filter.entityType)
      );
    }
    if (filter.relationType) {
      filteredRelations = filteredRelations.filter(
        (relation) => relation.type === filter.relationType
      );
    }
    return {
      entities: filteredEntities,
      relations: filteredRelations
    };
  }
  /**
   * 生成WebView的HTML内容
   */
  _getHtmlForWebview(webview) {
    const scriptUri = webview.asWebviewUri(vscode__WEBPACK_IMPORTED_MODULE_0__.Uri.joinPath(this._extensionUri, "media", "main.js"));
    const mermaidLoaderUri = webview.asWebviewUri(vscode__WEBPACK_IMPORTED_MODULE_0__.Uri.joinPath(this._extensionUri, "media", "mermaid-loader.js"));
    const styleResetUri = webview.asWebviewUri(vscode__WEBPACK_IMPORTED_MODULE_0__.Uri.joinPath(this._extensionUri, "media", "reset.css"));
    const styleVSCodeUri = webview.asWebviewUri(vscode__WEBPACK_IMPORTED_MODULE_0__.Uri.joinPath(this._extensionUri, "media", "vscode.css"));
    const styleMainUri = webview.asWebviewUri(vscode__WEBPACK_IMPORTED_MODULE_0__.Uri.joinPath(this._extensionUri, "media", "main.css"));
    const nonce = getNonce();
    return `<!DOCTYPE html>
            <html lang="zh-CN">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}' 'unsafe-eval' https://cdn.jsdelivr.net; img-src ${webview.cspSource} https:; connect-src https:;">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                
                <link href="${styleResetUri}" rel="stylesheet">
                <link href="${styleVSCodeUri}" rel="stylesheet">
                <link href="${styleMainUri}" rel="stylesheet">
                
                <title>MyBatis ER \u56FE</title>
            </head>
            <body>
                <!-- \u5DE5\u5177\u680F -->
                <div class="toolbar">
                    <div class="toolbar-group">
                        <button id="refreshBtn" class="toolbar-btn" title="\u5237\u65B0ER\u56FE">
                            <span class="codicon codicon-refresh"></span>
                            \u5237\u65B0
                        </button>
                        <button id="exportBtn" class="toolbar-btn" title="\u5BFC\u51FAER\u56FE">
                            <span class="codicon codicon-export"></span>
                            \u5BFC\u51FA
                        </button>
                    </div>
                    
                    <div class="toolbar-group">
                        <input type="text" id="searchInput" placeholder="\u641C\u7D22\u5B9E\u4F53\u6216\u5B57\u6BB5..." class="search-input">
                        <button id="searchBtn" class="toolbar-btn" title="\u641C\u7D22">
                            <span class="codicon codicon-search"></span>
                        </button>
                    </div>
                    
                    <div class="toolbar-group">
                        <select id="filterSelect" class="filter-select">
                            <option value="">\u5168\u90E8\u5173\u7CFB</option>
                            <option value="one-to-one">\u4E00\u5BF9\u4E00</option>
                            <option value="one-to-many">\u4E00\u5BF9\u591A</option>
                            <option value="many-to-one">\u591A\u5BF9\u4E00</option>
                            <option value="many-to-many">\u591A\u5BF9\u591A</option>
                        </select>
                    </div>
                </div>
                
                <!-- \u4E3B\u8981\u5185\u5BB9\u533A\u57DF -->
                <div class="main-content">
                    <!-- \u4FA7\u8FB9\u680F -->
                    <div class="sidebar">
                        <div class="sidebar-section">
                            <h3>\u5B9E\u4F53\u5217\u8868</h3>
                            <div id="entityList" class="entity-list"></div>
                        </div>
                        
                        <div class="sidebar-section">
                            <h3>\u5173\u7CFB\u7EDF\u8BA1</h3>
                            <div id="relationStats" class="relation-stats"></div>
                        </div>
                    </div>
                    
                    <!-- ER\u56FE\u753B\u5E03 -->
                    <div class="diagram-container">
                        <div id="loadingIndicator" class="loading-indicator" style="display: none;">
                            <div class="loading-spinner"></div>
                            <div class="loading-text">\u6B63\u5728\u751F\u6210ER\u56FE...</div>
                        </div>
                        
                        <div id="errorIndicator" class="error-indicator" style="display: none;">
                            <div class="error-icon">\u26A0\uFE0F</div>
                            <div class="error-text"></div>
                        </div>
                        
                        <div id="diagramCanvas" class="diagram-canvas"></div>
                    </div>
                </div>
                
                <!-- \u5BFC\u51FA\u5BF9\u8BDD\u6846 -->
                <div id="exportModal" class="modal" style="display: none;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>\u5BFC\u51FAER\u56FE</h3>
                            <button id="closeModal" class="close-btn">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="export-options">
                                <label>
                                    <input type="radio" name="exportFormat" value="png" checked>
                                    PNG \u56FE\u7247
                                </label>
                                <label>
                                    <input type="radio" name="exportFormat" value="svg">
                                    SVG \u77E2\u91CF\u56FE
                                </label>
                                <label>
                                    <input type="radio" name="exportFormat" value="pdf">
                                    PDF \u6587\u6863
                                </label>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button id="confirmExport" class="btn btn-primary">\u5BFC\u51FA</button>
                            <button id="cancelExport" class="btn btn-secondary">\u53D6\u6D88</button>
                        </div>
                    </div>
                </div>
                
                <script nonce="${nonce}" src="${mermaidLoaderUri}"><\/script>
                <script nonce="${nonce}" src="${scriptUri}"><\/script>
            </body>
            </html>`;
  }
}
ERDiagramWebViewProvider.viewType = "mybatis-er.erDiagramView";
function getNonce() {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}


/***/ }),

/***/ "./src/utils/config-manager.ts":
/*!*************************************!*\
  !*** ./src/utils/config-manager.ts ***!
  \*************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ConfigManager: () => (/* binding */ ConfigManager)
/* harmony export */ });
/* harmony import */ var vscode__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! vscode */ "vscode");
/* harmony import */ var vscode__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(vscode__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _logger__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./logger */ "./src/utils/logger.ts");



class ConfigManager {
  constructor() {
    this.configChangeListeners = [];
    vscode__WEBPACK_IMPORTED_MODULE_0__.workspace.onDidChangeConfiguration(this.onConfigurationChanged.bind(this));
    _logger__WEBPACK_IMPORTED_MODULE_1__.Logger.info("\u914D\u7F6E\u7BA1\u7406\u5668\u5DF2\u521D\u59CB\u5316");
  }
  /**
   * 获取配置管理器实例
   */
  static getInstance() {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }
  /**
   * 获取扩展配置
   */
  getExtensionConfig() {
    const config = vscode__WEBPACK_IMPORTED_MODULE_0__.workspace.getConfiguration("mybatis-er");
    return {
      autoRefresh: config.get("autoRefresh", true),
      inferenceStrategies: config.get("inferenceStrategies", {
        naming: true,
        xml: true,
        annotation: true,
        semantic: true
      }),
      theme: config.get("theme", "auto"),
      exportFormat: config.get("exportFormat", "png")
    };
  }
  /**
   * 更新扩展配置
   */
  async updateExtensionConfig(key, value, target) {
    try {
      const config = vscode__WEBPACK_IMPORTED_MODULE_0__.workspace.getConfiguration("mybatis-er");
      await config.update(key, value, target || vscode__WEBPACK_IMPORTED_MODULE_0__.ConfigurationTarget.Workspace);
      _logger__WEBPACK_IMPORTED_MODULE_1__.Logger.info(`\u914D\u7F6E\u5DF2\u66F4\u65B0: ${key} = ${JSON.stringify(value)}`);
    } catch (error) {
      _logger__WEBPACK_IMPORTED_MODULE_1__.Logger.error(`\u66F4\u65B0\u914D\u7F6E\u5931\u8D25: ${key}`, error);
      throw error;
    }
  }
  /**
   * 获取工作空间配置
   */
  getWorkspaceConfig() {
    return {
      // Java相关配置
      javaHome: this.getJavaConfig("home"),
      javaSourcePaths: this.getJavaConfig("sourcePaths", []),
      // 文件扫描配置
      includePatterns: this.getFileConfig("include", ["**/*.java", "**/*.xml"]),
      excludePatterns: this.getFileConfig("exclude", [
        "**/node_modules/**",
        "**/target/**",
        "**/build/**",
        "**/.git/**"
      ]),
      // 编辑器配置
      tabSize: this.getEditorConfig("tabSize", 4),
      insertSpaces: this.getEditorConfig("insertSpaces", true),
      // 搜索配置
      searchMaxResults: this.getSearchConfig("maxResults", 1e3),
      searchTimeout: this.getSearchConfig("timeout", 1e4)
    };
  }
  /**
   * 获取Java相关配置
   */
  getJavaConfig(key, defaultValue) {
    const config = vscode__WEBPACK_IMPORTED_MODULE_0__.workspace.getConfiguration("java");
    return config.get(key, defaultValue);
  }
  /**
   * 获取文件相关配置
   */
  getFileConfig(key, defaultValue) {
    const config = vscode__WEBPACK_IMPORTED_MODULE_0__.workspace.getConfiguration("files");
    return config.get(key, defaultValue);
  }
  /**
   * 获取编辑器配置
   */
  getEditorConfig(key, defaultValue) {
    const config = vscode__WEBPACK_IMPORTED_MODULE_0__.workspace.getConfiguration("editor");
    return config.get(key, defaultValue);
  }
  /**
   * 获取搜索配置
   */
  getSearchConfig(key, defaultValue) {
    const config = vscode__WEBPACK_IMPORTED_MODULE_0__.workspace.getConfiguration("search");
    return config.get(key, defaultValue);
  }
  /**
   * 获取MyBatis特定配置
   */
  getMyBatisConfig() {
    const config = vscode__WEBPACK_IMPORTED_MODULE_0__.workspace.getConfiguration("mybatis-er");
    return {
      // 解析配置
      parseTimeout: config.get("parseTimeout", 3e4),
      maxFileSize: config.get("maxFileSize", 10 * 1024 * 1024),
      // 10MB
      // 推断配置
      inferenceTimeout: config.get("inferenceTimeout", 1e4),
      minConfidence: config.get("minConfidence", 0.6),
      // 缓存配置
      cacheEnabled: config.get("cacheEnabled", true),
      cacheMaxAge: config.get("cacheMaxAge", 5 * 60 * 1e3),
      // 5分钟
      // UI配置
      maxEntitiesInView: config.get("maxEntitiesInView", 500),
      animationEnabled: config.get("animationEnabled", true),
      // 导出配置
      exportPath: config.get("exportPath", ""),
      exportQuality: config.get("exportQuality", 1)
    };
  }
  /**
   * 获取性能相关配置
   */
  getPerformanceConfig() {
    const config = vscode__WEBPACK_IMPORTED_MODULE_0__.workspace.getConfiguration("mybatis-er");
    return {
      // Worker配置
      maxWorkers: config.get("maxWorkers", Math.max(2, Math.floor((__webpack_require__(/*! os */ "os").cpus)().length / 2))),
      workerTimeout: config.get("workerTimeout", 3e4),
      // 内存配置
      maxMemoryUsage: config.get("maxMemoryUsage", 100 * 1024 * 1024),
      // 100MB
      gcThreshold: config.get("gcThreshold", 0.8),
      // 并发配置
      maxConcurrentParsing: config.get("maxConcurrentParsing", 4),
      batchSize: config.get("batchSize", 50),
      // 调试配置
      enableProfiling: config.get("enableProfiling", false),
      logLevel: config.get("logLevel", "info")
    };
  }
  /**
   * 检查配置有效性
   */
  validateConfig() {
    const errors = [];
    const config = this.getExtensionConfig();
    const myBatisConfig = this.getMyBatisConfig();
    const performanceConfig = this.getPerformanceConfig();
    if (typeof config.autoRefresh !== "boolean") {
      errors.push("autoRefresh\u5FC5\u987B\u662F\u5E03\u5C14\u503C");
    }
    if (!["auto", "light", "dark"].includes(config.theme)) {
      errors.push("theme\u5FC5\u987B\u662Fauto\u3001light\u6216dark\u4E4B\u4E00");
    }
    if (!["png", "svg", "pdf", "mermaid"].includes(config.exportFormat)) {
      errors.push("exportFormat\u5FC5\u987B\u662Fpng\u3001svg\u3001pdf\u6216mermaid\u4E4B\u4E00");
    }
    const strategies = config.inferenceStrategies;
    if (typeof strategies !== "object" || strategies === null) {
      errors.push("inferenceStrategies\u5FC5\u987B\u662F\u5BF9\u8C61");
    } else {
      const requiredKeys = ["naming", "xml", "annotation", "semantic"];
      for (const key of requiredKeys) {
        if (typeof strategies[key] !== "boolean") {
          errors.push(`inferenceStrategies.${key}\u5FC5\u987B\u662F\u5E03\u5C14\u503C`);
        }
      }
    }
    if (performanceConfig.maxWorkers < 1 || performanceConfig.maxWorkers > 16) {
      errors.push("maxWorkers\u5FC5\u987B\u57281-16\u4E4B\u95F4");
    }
    if (myBatisConfig.minConfidence < 0 || myBatisConfig.minConfidence > 1) {
      errors.push("minConfidence\u5FC5\u987B\u57280-1\u4E4B\u95F4");
    }
    return {
      valid: errors.length === 0,
      errors
    };
  }
  /**
   * 重置配置为默认值
   */
  async resetToDefaults() {
    try {
      const config = vscode__WEBPACK_IMPORTED_MODULE_0__.workspace.getConfiguration("mybatis-er");
      const keys = [
        "autoRefresh",
        "inferenceStrategies",
        "theme",
        "exportFormat",
        "parseTimeout",
        "maxFileSize",
        "inferenceTimeout",
        "minConfidence",
        "cacheEnabled",
        "cacheMaxAge",
        "maxEntitiesInView",
        "animationEnabled"
      ];
      for (const key of keys) {
        await config.update(key, void 0, vscode__WEBPACK_IMPORTED_MODULE_0__.ConfigurationTarget.Workspace);
      }
      _logger__WEBPACK_IMPORTED_MODULE_1__.Logger.info("\u914D\u7F6E\u5DF2\u91CD\u7F6E\u4E3A\u9ED8\u8BA4\u503C");
    } catch (error) {
      _logger__WEBPACK_IMPORTED_MODULE_1__.Logger.error("\u91CD\u7F6E\u914D\u7F6E\u5931\u8D25", error);
      throw error;
    }
  }
  /**
   * 导出配置
   */
  exportConfig() {
    return {
      extension: this.getExtensionConfig(),
      workspace: this.getWorkspaceConfig(),
      mybatis: this.getMyBatisConfig(),
      performance: this.getPerformanceConfig(),
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  /**
   * 导入配置
   */
  async importConfig(configData) {
    try {
      if (!configData.extension) {
        throw new Error("\u65E0\u6548\u7684\u914D\u7F6E\u6570\u636E");
      }
      const extensionConfig = configData.extension;
      const config = vscode__WEBPACK_IMPORTED_MODULE_0__.workspace.getConfiguration("mybatis-er");
      for (const [key, value] of Object.entries(extensionConfig)) {
        await config.update(key, value, vscode__WEBPACK_IMPORTED_MODULE_0__.ConfigurationTarget.Workspace);
      }
      _logger__WEBPACK_IMPORTED_MODULE_1__.Logger.info("\u914D\u7F6E\u5BFC\u5165\u6210\u529F");
    } catch (error) {
      _logger__WEBPACK_IMPORTED_MODULE_1__.Logger.error("\u5BFC\u5165\u914D\u7F6E\u5931\u8D25", error);
      throw error;
    }
  }
  /**
   * 添加配置变更监听器
   */
  onConfigChanged(listener) {
    this.configChangeListeners.push(listener);
    return new vscode__WEBPACK_IMPORTED_MODULE_0__.Disposable(() => {
      const index = this.configChangeListeners.indexOf(listener);
      if (index >= 0) {
        this.configChangeListeners.splice(index, 1);
      }
    });
  }
  /**
   * 配置变更事件处理
   */
  onConfigurationChanged(event) {
    if (event.affectsConfiguration("mybatis-er")) {
      const newConfig = this.getExtensionConfig();
      _logger__WEBPACK_IMPORTED_MODULE_1__.Logger.info("\u914D\u7F6E\u5DF2\u53D8\u66F4", newConfig);
      this.configChangeListeners.forEach((listener) => {
        try {
          listener(newConfig);
        } catch (error) {
          _logger__WEBPACK_IMPORTED_MODULE_1__.Logger.error("\u914D\u7F6E\u53D8\u66F4\u76D1\u542C\u5668\u6267\u884C\u5931\u8D25", error);
        }
      });
    }
  }
  /**
   * 获取配置摘要信息
   */
  getConfigSummary() {
    const validation = this.validateConfig();
    const extensionConfig = this.getExtensionConfig();
    const performanceConfig = this.getPerformanceConfig();
    return {
      valid: validation.valid,
      errors: validation.errors,
      autoRefresh: extensionConfig.autoRefresh,
      enabledStrategies: Object.entries(extensionConfig.inferenceStrategies).filter(([_, enabled]) => enabled).map(([strategy, _]) => strategy),
      theme: extensionConfig.theme,
      maxWorkers: performanceConfig.maxWorkers,
      cacheEnabled: this.getMyBatisConfig().cacheEnabled
    };
  }
}


/***/ }),

/***/ "./src/utils/file-scanner.ts":
/*!***********************************!*\
  !*** ./src/utils/file-scanner.ts ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   FileScanner: () => (/* binding */ FileScanner)
/* harmony export */ });
/* harmony import */ var vscode__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! vscode */ "vscode");
/* harmony import */ var vscode__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(vscode__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! path */ "path");
/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(path__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var fs_promises__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! fs/promises */ "fs/promises");
/* harmony import */ var fs_promises__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(fs_promises__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _logger__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./logger */ "./src/utils/logger.ts");





class FileScanner {
  constructor(workspaceRoot) {
    this.workspaceRoot = workspaceRoot || this.getWorkspaceRoot();
    this.defaultOptions = {
      includePatterns: ["**/*.java", "**/*.xml"],
      excludePatterns: [
        "**/node_modules/**",
        "**/target/**",
        "**/build/**",
        "**/out/**",
        "**/bin/**",
        "**/.git/**",
        "**/.vscode/**",
        "**/.idea/**"
      ],
      maxFileSize: 10 * 1024 * 1024,
      // 10MB
      recursive: true,
      includeTests: false,
      parseContent: true,
      maxDepth: 10
    };
  }
  /**
   * 扫描工作空间文件
   */
  async scanWorkspace(options) {
    const startTime = Date.now();
    const scanOptions = { ...this.defaultOptions, ...options };
    _logger__WEBPACK_IMPORTED_MODULE_3__.Logger.info("\u5F00\u59CB\u626B\u63CF\u5DE5\u4F5C\u7A7A\u95F4\u6587\u4EF6...");
    try {
      const stats = {
        totalFiles: 0,
        javaFileCount: 0,
        xmlFileCount: 0,
        entityCount: 0,
        mapperCount: 0,
        directoriesScanned: 0,
        skippedFiles: 0,
        errorFiles: 0
      };
      const javaFiles = [];
      const xmlFiles = [];
      await this.scanDirectory(
        this.workspaceRoot,
        scanOptions,
        javaFiles,
        xmlFiles,
        stats,
        0
      );
      if (scanOptions.parseContent) {
        await this.parseFileContents(javaFiles, xmlFiles, stats);
      }
      const scanTime = Date.now() - startTime;
      _logger__WEBPACK_IMPORTED_MODULE_3__.Logger.info(`\u6587\u4EF6\u626B\u63CF\u5B8C\u6210: ${stats.totalFiles}\u4E2A\u6587\u4EF6, \u8017\u65F6${scanTime}ms`);
      return {
        javaFiles,
        xmlFiles,
        stats,
        scanTime
      };
    } catch (error) {
      _logger__WEBPACK_IMPORTED_MODULE_3__.Logger.error(`\u6587\u4EF6\u626B\u63CF\u5931\u8D25: ${error}`);
      throw error;
    }
  }
  /**
   * 扫描指定目录
   */
  async scanDirectory(dirPath, options, javaFiles, xmlFiles, stats, depth) {
    if (depth > options.maxDepth) {
      return;
    }
    try {
      const entries = await fs_promises__WEBPACK_IMPORTED_MODULE_2__.readdir(dirPath, { withFileTypes: true });
      stats.directoriesScanned++;
      for (const entry of entries) {
        const fullPath = path__WEBPACK_IMPORTED_MODULE_1__.join(dirPath, entry.name);
        const relativePath = path__WEBPACK_IMPORTED_MODULE_1__.relative(this.workspaceRoot, fullPath);
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
      _logger__WEBPACK_IMPORTED_MODULE_3__.Logger.warn(`\u626B\u63CF\u76EE\u5F55\u5931\u8D25 ${dirPath}: ${error}`);
      stats.errorFiles++;
    }
  }
  /**
   * 处理单个文件
   */
  async processFile(filePath, relativePath, options, javaFiles, xmlFiles, stats) {
    try {
      const fileName = path__WEBPACK_IMPORTED_MODULE_1__.basename(filePath);
      const ext = path__WEBPACK_IMPORTED_MODULE_1__.extname(fileName).toLowerCase();
      if (ext !== ".java" && ext !== ".xml") {
        return;
      }
      if (!options.includeTests && this.isTestFile(relativePath)) {
        stats.skippedFiles++;
        return;
      }
      const fileStat = await fs_promises__WEBPACK_IMPORTED_MODULE_2__.stat(filePath);
      if (fileStat.size > options.maxFileSize) {
        _logger__WEBPACK_IMPORTED_MODULE_3__.Logger.warn(`\u6587\u4EF6\u8FC7\u5927\uFF0C\u8DF3\u8FC7: ${relativePath} (${fileStat.size} bytes)`);
        stats.skippedFiles++;
        return;
      }
      const fileInfo = {
        filePath,
        relativePath,
        fileName,
        size: fileStat.size,
        lastModified: fileStat.mtime.getTime(),
        fileType: ext === ".java" ? "java" : "xml"
      };
      if (ext === ".java") {
        javaFiles.push(fileInfo);
        stats.javaFileCount++;
      } else if (ext === ".xml") {
        xmlFiles.push(fileInfo);
        stats.xmlFileCount++;
      }
      stats.totalFiles++;
    } catch (error) {
      _logger__WEBPACK_IMPORTED_MODULE_3__.Logger.warn(`\u5904\u7406\u6587\u4EF6\u5931\u8D25 ${filePath}: ${error}`);
      stats.errorFiles++;
    }
  }
  /**
   * 解析文件内容
   */
  async parseFileContents(javaFiles, xmlFiles, stats) {
    _logger__WEBPACK_IMPORTED_MODULE_3__.Logger.info("\u5F00\u59CB\u89E3\u6790\u6587\u4EF6\u5185\u5BB9...");
    for (const fileInfo of javaFiles) {
      try {
        await this.parseJavaFile(fileInfo);
        if (fileInfo.isEntity) {
          stats.entityCount++;
        }
      } catch (error) {
        _logger__WEBPACK_IMPORTED_MODULE_3__.Logger.warn(`\u89E3\u6790Java\u6587\u4EF6\u5931\u8D25 ${fileInfo.relativePath}: ${error}`);
        stats.errorFiles++;
      }
    }
    for (const fileInfo of xmlFiles) {
      try {
        await this.parseXmlFile(fileInfo);
        if (fileInfo.isMapper) {
          stats.mapperCount++;
        }
      } catch (error) {
        _logger__WEBPACK_IMPORTED_MODULE_3__.Logger.warn(`\u89E3\u6790XML\u6587\u4EF6\u5931\u8D25 ${fileInfo.relativePath}: ${error}`);
        stats.errorFiles++;
      }
    }
  }
  /**
   * 解析Java文件
   */
  async parseJavaFile(fileInfo) {
    try {
      const content = await fs_promises__WEBPACK_IMPORTED_MODULE_2__.readFile(fileInfo.filePath, "utf-8");
      const packageMatch = content.match(/package\s+([\w.]+)\s*;/);
      if (packageMatch) {
        fileInfo.packageName = packageMatch[1];
      }
      fileInfo.isEntity = this.isEntityClass(content, fileInfo.fileName);
    } catch (error) {
      throw new Error(`\u8BFB\u53D6Java\u6587\u4EF6\u5931\u8D25: ${error}`);
    }
  }
  /**
   * 解析XML文件
   */
  async parseXmlFile(fileInfo) {
    try {
      const content = await fs_promises__WEBPACK_IMPORTED_MODULE_2__.readFile(fileInfo.filePath, "utf-8");
      const namespaceMatch = content.match(/namespace\s*=\s*["']([^"']+)["']/);
      if (namespaceMatch) {
        fileInfo.namespace = namespaceMatch[1];
      }
      fileInfo.isMapper = this.isMapperFile(content, fileInfo.fileName);
    } catch (error) {
      throw new Error(`\u8BFB\u53D6XML\u6587\u4EF6\u5931\u8D25: ${error}`);
    }
  }
  /**
   * 检查是否为实体类
   */
  isEntityClass(content, fileName) {
    const entityAnnotations = [
      "@Entity",
      "@Table",
      "@TableName",
      "@Data",
      "@Component"
    ];
    for (const annotation of entityAnnotations) {
      if (content.includes(annotation)) {
        return true;
      }
    }
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
    const classMatch = content.match(/public\s+class\s+(\w+)/);
    if (classMatch) {
      const className = classMatch[1];
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
  isMapperFile(content, fileName) {
    if (fileName.toLowerCase().includes("mapper")) {
      return true;
    }
    const mapperElements = [
      "<mapper",
      "<select",
      "<insert",
      "<update",
      "<delete",
      "<resultMap"
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
  isTestFile(filePath) {
    const testPatterns = [
      /\/test\//,
      /\/tests\//,
      /Test\.java$/,
      /Tests\.java$/,
      /TestCase\.java$/,
      /_test\.java$/,
      /_tests\.java$/
    ];
    return testPatterns.some((pattern) => pattern.test(filePath));
  }
  /**
   * 检查是否应该排除文件
   */
  shouldExclude(filePath, excludePatterns) {
    return excludePatterns.some((pattern) => {
      const regex = new RegExp(
        pattern.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*").replace(/\?/g, "[^/]")
      );
      return regex.test(filePath);
    });
  }
  /**
   * 获取工作空间根目录
   */
  getWorkspaceRoot() {
    const workspaceFolders = vscode__WEBPACK_IMPORTED_MODULE_0__.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      throw new Error("\u6CA1\u6709\u6253\u5F00\u7684\u5DE5\u4F5C\u7A7A\u95F4");
    }
    return workspaceFolders[0].uri.fsPath;
  }
  /**
   * 监听文件变化
   */
  createFileWatcher(callback) {
    const watcher = vscode__WEBPACK_IMPORTED_MODULE_0__.workspace.createFileSystemWatcher(
      new vscode__WEBPACK_IMPORTED_MODULE_0__.RelativePattern(this.workspaceRoot, "**/*.{java,xml}")
    );
    const disposables = [
      watcher.onDidCreate((uri) => callback("created", uri.fsPath)),
      watcher.onDidChange((uri) => callback("changed", uri.fsPath)),
      watcher.onDidDelete((uri) => callback("deleted", uri.fsPath)),
      watcher
    ];
    return vscode__WEBPACK_IMPORTED_MODULE_0__.Disposable.from(...disposables);
  }
  /**
   * 获取文件内容
   */
  async getFileContent(filePath) {
    try {
      return await fs_promises__WEBPACK_IMPORTED_MODULE_2__.readFile(filePath, "utf-8");
    } catch (error) {
      throw new Error(`\u8BFB\u53D6\u6587\u4EF6\u5931\u8D25 ${filePath}: ${error}`);
    }
  }
  /**
   * 检查文件是否存在
   */
  async fileExists(filePath) {
    try {
      await fs_promises__WEBPACK_IMPORTED_MODULE_2__.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  /**
   * 获取文件统计信息
   */
  async getFileStats(filePath) {
    return await fs_promises__WEBPACK_IMPORTED_MODULE_2__.stat(filePath);
  }
  /**
   * 批量获取文件内容
   */
  async getFileContents(filePaths) {
    const contents = /* @__PURE__ */ new Map();
    const promises = filePaths.map(async (filePath) => {
      try {
        const content = await this.getFileContent(filePath);
        contents.set(filePath, content);
      } catch (error) {
        _logger__WEBPACK_IMPORTED_MODULE_3__.Logger.warn(`\u8BFB\u53D6\u6587\u4EF6\u5931\u8D25 ${filePath}: ${error}`);
      }
    });
    await Promise.all(promises);
    return contents;
  }
  /**
   * 过滤文件列表
   */
  filterFiles(files, filter) {
    return files.filter((file) => {
      if (filter.fileType && file.fileType !== filter.fileType) {
        return false;
      }
      if (filter.isEntity !== void 0 && file.isEntity !== filter.isEntity) {
        return false;
      }
      if (filter.isMapper !== void 0 && file.isMapper !== filter.isMapper) {
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


/***/ }),

/***/ "./src/utils/logger.ts":
/*!*****************************!*\
  !*** ./src/utils/logger.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Logger: () => (/* binding */ Logger)
/* harmony export */ });
/* harmony import */ var vscode__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! vscode */ "vscode");
/* harmony import */ var vscode__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(vscode__WEBPACK_IMPORTED_MODULE_0__);


class Logger {
  /**
   * 初始化日志管理器
   */
  static initialize() {
    this.outputChannel = vscode__WEBPACK_IMPORTED_MODULE_0__.window.createOutputChannel("MyBatis ER Generator");
  }
  /**
   * 信息日志
   */
  static info(message, ...args) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const logMessage = `[${timestamp}] INFO: ${message}`;
    console.log(logMessage, ...args);
    this.outputChannel?.appendLine(logMessage);
  }
  /**
   * 警告日志
   */
  static warn(message, ...args) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const logMessage = `[${timestamp}] WARN: ${message}`;
    console.warn(logMessage, ...args);
    this.outputChannel?.appendLine(logMessage);
  }
  /**
   * 错误日志
   */
  static error(message, error, ...args) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const logMessage = `[${timestamp}] ERROR: ${message}`;
    const errorDetails = error ? `
${error.stack}` : "";
    console.error(logMessage, error, ...args);
    this.outputChannel?.appendLine(logMessage + errorDetails);
  }
  /**
   * 调试日志
   */
  static debug(message, ...args) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const logMessage = `[${timestamp}] DEBUG: ${message}`;
    console.debug(logMessage, ...args);
    this.outputChannel?.appendLine(logMessage);
  }
  /**
   * 显示输出面板
   */
  static show() {
    this.outputChannel?.show();
  }
  /**
   * 清空日志
   */
  static clear() {
    this.outputChannel?.clear();
  }
  /**
   * 销毁日志管理器
   */
  static dispose() {
    this.outputChannel?.dispose();
  }
}


/***/ }),

/***/ "./src/utils/performance-tester.ts":
/*!*****************************************!*\
  !*** ./src/utils/performance-tester.ts ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   PerformanceTest: () => (/* binding */ PerformanceTest),
/* harmony export */   PerformanceTester: () => (/* binding */ PerformanceTester)
/* harmony export */ });
/* harmony import */ var vscode__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! vscode */ "vscode");
/* harmony import */ var vscode__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(vscode__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _logger__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./logger */ "./src/utils/logger.ts");



class PerformanceTester {
  constructor() {
    this.testResults = /* @__PURE__ */ new Map();
  }
  static getInstance() {
    if (!PerformanceTester.instance) {
      PerformanceTester.instance = new PerformanceTester();
    }
    return PerformanceTester.instance;
  }
  /**
   * 开始性能测试
   */
  startTest(testName) {
    const test = new PerformanceTest(testName);
    _logger__WEBPACK_IMPORTED_MODULE_1__.Logger.info(`\u5F00\u59CB\u6027\u80FD\u6D4B\u8BD5: ${testName}`);
    return test;
  }
  /**
   * 记录测试结果
   */
  recordResult(result) {
    this.testResults.set(result.testName, result);
    _logger__WEBPACK_IMPORTED_MODULE_1__.Logger.info(`\u6027\u80FD\u6D4B\u8BD5\u5B8C\u6210: ${result.testName}`, {
      duration: result.duration,
      memoryUsed: result.memoryUsed,
      itemsProcessed: result.itemsProcessed
    });
  }
  /**
   * 获取测试报告
   */
  getTestReport() {
    const results = Array.from(this.testResults.values());
    return {
      totalTests: results.length,
      results,
      summary: {
        totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
        averageDuration: results.length > 0 ? results.reduce((sum, r) => sum + r.duration, 0) / results.length : 0,
        maxMemoryUsed: Math.max(...results.map((r) => r.memoryUsed)),
        totalItemsProcessed: results.reduce((sum, r) => sum + r.itemsProcessed, 0)
      }
    };
  }
  /**
   * 显示性能报告
   */
  async showPerformanceReport() {
    const report = this.getTestReport();
    const message = `
\u6027\u80FD\u6D4B\u8BD5\u62A5\u544A\uFF1A

\u603B\u6D4B\u8BD5\u6570: ${report.totalTests}
\u603B\u8017\u65F6: ${report.summary.totalDuration.toFixed(2)}ms
\u5E73\u5747\u8017\u65F6: ${report.summary.averageDuration.toFixed(2)}ms
\u6700\u5927\u5185\u5B58\u4F7F\u7528: ${(report.summary.maxMemoryUsed / 1024 / 1024).toFixed(2)}MB
\u603B\u5904\u7406\u9879\u76EE: ${report.summary.totalItemsProcessed}

\u8BE6\u7EC6\u7ED3\u679C:
${report.results.map(
      (r) => `- ${r.testName}: ${r.duration.toFixed(2)}ms, ${(r.memoryUsed / 1024 / 1024).toFixed(2)}MB, ${r.itemsProcessed}\u9879`
    ).join("\n")}
        `.trim();
    await vscode__WEBPACK_IMPORTED_MODULE_0__.window.showInformationMessage(message, { modal: true });
  }
  /**
   * 清除测试结果
   */
  clearResults() {
    this.testResults.clear();
    _logger__WEBPACK_IMPORTED_MODULE_1__.Logger.info("\u6027\u80FD\u6D4B\u8BD5\u7ED3\u679C\u5DF2\u6E05\u9664");
  }
  /**
   * 运行基准测试套件
   */
  async runBenchmarkSuite() {
    _logger__WEBPACK_IMPORTED_MODULE_1__.Logger.info("\u5F00\u59CB\u8FD0\u884C\u57FA\u51C6\u6D4B\u8BD5\u5957\u4EF6");
    this.clearResults();
    const memoryTest = this.startTest("\u5185\u5B58\u4F7F\u7528\u57FA\u51C6");
    await this.simulateMemoryUsage();
    memoryTest.finish(100);
    const parseTest = this.startTest("\u89E3\u6790\u901F\u5EA6\u57FA\u51C6");
    await this.simulateParsingLoad();
    parseTest.finish(500);
    const inferenceTest = this.startTest("\u5173\u7CFB\u63A8\u65AD\u57FA\u51C6");
    await this.simulateInferenceLoad();
    inferenceTest.finish(200);
    const report = this.getTestReport();
    _logger__WEBPACK_IMPORTED_MODULE_1__.Logger.info("\u57FA\u51C6\u6D4B\u8BD5\u5957\u4EF6\u5B8C\u6210", report.summary);
    return report;
  }
  /**
   * 模拟内存使用测试
   */
  async simulateMemoryUsage() {
    const objects = [];
    for (let i = 0; i < 1e4; i++) {
      objects.push({
        id: i,
        name: `Entity_${i}`,
        fields: Array.from({ length: 10 }, (_, j) => ({
          name: `field_${j}`,
          type: "String",
          value: `value_${i}_${j}`
        }))
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
    objects.length = 0;
  }
  /**
   * 模拟解析负载测试
   */
  async simulateParsingLoad() {
    for (let i = 0; i < 500; i++) {
      const content = `
                @Entity
                @Table(name = "entity_${i}")
                public class Entity${i} {
                    @Id
                    private Long id;
                    
                    @Column(name = "name")
                    private String name;
                    
                    // \u6A21\u62DF\u590D\u6742\u89E3\u6790
                    ${Array.from(
        { length: 10 },
        (_, j) => `@Column(name = "field_${j}") private String field${j};`
      ).join("\n")}
                }
            `;
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
  }
  /**
   * 模拟关系推断负载测试
   */
  async simulateInferenceLoad() {
    for (let i = 0; i < 200; i++) {
      const entities = Array.from({ length: 50 }, (_, j) => ({
        name: `Entity${j}`,
        fields: [`id`, `name`, `entity${i}_id`]
      }));
      for (const entity of entities) {
        for (const field of entity.fields) {
          if (field.endsWith("_id")) {
            const confidence = Math.random();
            if (confidence > 0.8) {
            }
          }
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
  }
}
class PerformanceTest {
  constructor(testName) {
    this.testName = testName;
    this.startTime = performance.now();
    this.startMemory = this.getMemoryUsage();
  }
  /**
   * 完成测试并记录结果
   */
  finish(itemsProcessed = 0) {
    const endTime = performance.now();
    const endMemory = this.getMemoryUsage();
    const result = {
      testName: this.testName,
      duration: endTime - this.startTime,
      memoryUsed: endMemory - this.startMemory,
      itemsProcessed,
      timestamp: /* @__PURE__ */ new Date()
    };
    PerformanceTester.getInstance().recordResult(result);
    return result;
  }
  /**
   * 获取当前内存使用量
   */
  getMemoryUsage() {
    if (process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return 0;
  }
}


/***/ }),

/***/ "./src/utils/state-manager.ts":
/*!************************************!*\
  !*** ./src/utils/state-manager.ts ***!
  \************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   StateManager: () => (/* binding */ StateManager)
/* harmony export */ });
/* harmony import */ var vscode__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! vscode */ "vscode");
/* harmony import */ var vscode__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(vscode__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _logger__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./logger */ "./src/utils/logger.ts");



const _StateManager = class _StateManager {
  constructor(context) {
    this.context = context;
    this.workspaceState = context.workspaceState;
    this.globalState = context.globalState;
    _logger__WEBPACK_IMPORTED_MODULE_1__.Logger.info("\u72B6\u6001\u7BA1\u7406\u5668\u5DF2\u521D\u59CB\u5316");
  }
  /**
   * 初始化状态管理器
   */
  static initialize(context) {
    if (!_StateManager.instance) {
      _StateManager.instance = new _StateManager(context);
    }
    return _StateManager.instance;
  }
  /**
   * 获取状态管理器实例
   */
  static getInstance() {
    if (!_StateManager.instance) {
      throw new Error("StateManager\u672A\u521D\u59CB\u5316\uFF0C\u8BF7\u5148\u8C03\u7528initialize()");
    }
    return _StateManager.instance;
  }
  // ==================== ER图数据管理 ====================
  /**
   * 保存ER图数据
   */
  async saveERDiagramData(data) {
    try {
      await this.workspaceState.update(_StateManager.KEYS.ER_DIAGRAM_DATA, {
        ...data,
        generatedAt: data.generatedAt.toISOString()
      });
      await this.workspaceState.update(_StateManager.KEYS.LAST_SCAN_TIME, Date.now());
      _logger__WEBPACK_IMPORTED_MODULE_1__.Logger.info(`ER\u56FE\u6570\u636E\u5DF2\u4FDD\u5B58\uFF0C\u5305\u542B${data.entities.length}\u4E2A\u5B9E\u4F53\uFF0C${data.relations.length}\u4E2A\u5173\u7CFB`);
    } catch (error) {
      _logger__WEBPACK_IMPORTED_MODULE_1__.Logger.error("\u4FDD\u5B58ER\u56FE\u6570\u636E\u5931\u8D25", error);
      throw error;
    }
  }
  /**
   * 获取ER图数据
   */
  async getERDiagramData() {
    try {
      const data = this.workspaceState.get(_StateManager.KEYS.ER_DIAGRAM_DATA);
      if (!data) {
        return void 0;
      }
      return {
        ...data,
        generatedAt: new Date(data.generatedAt)
      };
    } catch (error) {
      _logger__WEBPACK_IMPORTED_MODULE_1__.Logger.error("\u83B7\u53D6ER\u56FE\u6570\u636E\u5931\u8D25", error);
      return void 0;
    }
  }
  /**
   * 清除ER图数据
   */
  async clearERDiagramData() {
    try {
      await this.workspaceState.update(_StateManager.KEYS.ER_DIAGRAM_DATA, void 0);
      await this.workspaceState.update(_StateManager.KEYS.LAST_SCAN_TIME, void 0);
      _logger__WEBPACK_IMPORTED_MODULE_1__.Logger.info("ER\u56FE\u6570\u636E\u5DF2\u6E05\u9664");
    } catch (error) {
      _logger__WEBPACK_IMPORTED_MODULE_1__.Logger.error("\u6E05\u9664ER\u56FE\u6570\u636E\u5931\u8D25", error);
      throw error;
    }
  }
  // ==================== 项目配置管理 ====================
  /**
   * 保存项目配置
   */
  async saveProjectConfig(config) {
    try {
      const currentConfig = await this.getProjectConfig();
      const newConfig = { ...currentConfig, ...config };
      await this.workspaceState.update(_StateManager.KEYS.PROJECT_CONFIG, newConfig);
      _logger__WEBPACK_IMPORTED_MODULE_1__.Logger.info("\u9879\u76EE\u914D\u7F6E\u5DF2\u4FDD\u5B58", newConfig);
    } catch (error) {
      _logger__WEBPACK_IMPORTED_MODULE_1__.Logger.error("\u4FDD\u5B58\u9879\u76EE\u914D\u7F6E\u5931\u8D25", error);
      throw error;
    }
  }
  /**
   * 获取项目配置
   */
  async getProjectConfig() {
    try {
      const config = this.workspaceState.get(_StateManager.KEYS.PROJECT_CONFIG);
      return {
        autoRefresh: true,
        includeTestFiles: false,
        inferenceStrategies: {
          naming: true,
          xml: true,
          annotation: true,
          semantic: true
        },
        theme: "auto",
        exportFormat: "png",
        ...config
      };
    } catch (error) {
      _logger__WEBPACK_IMPORTED_MODULE_1__.Logger.error("\u83B7\u53D6\u9879\u76EE\u914D\u7F6E\u5931\u8D25", error);
      return {
        autoRefresh: true,
        includeTestFiles: false,
        inferenceStrategies: {
          naming: true,
          xml: true,
          annotation: true,
          semantic: true
        },
        theme: "auto",
        exportFormat: "png"
      };
    }
  }
  // ==================== 缓存管理 ====================
  /**
   * 获取最后扫描时间
   */
  getLastScanTime() {
    return this.workspaceState.get(_StateManager.KEYS.LAST_SCAN_TIME);
  }
  /**
   * 检查缓存是否有效
   */
  isCacheValid(maxAge = 5 * 60 * 1e3) {
    const lastScanTime = this.getLastScanTime();
    if (!lastScanTime) {
      return false;
    }
    return Date.now() - lastScanTime < maxAge;
  }
  /**
   * 保存实体缓存
   */
  async saveEntityCache(filePath, entityData) {
    try {
      const cache = this.workspaceState.get(_StateManager.KEYS.WORKSPACE_ENTITIES) || {};
      cache[filePath] = {
        data: entityData,
        timestamp: Date.now()
      };
      await this.workspaceState.update(_StateManager.KEYS.WORKSPACE_ENTITIES, cache);
    } catch (error) {
      _logger__WEBPACK_IMPORTED_MODULE_1__.Logger.error("\u4FDD\u5B58\u5B9E\u4F53\u7F13\u5B58\u5931\u8D25", error);
    }
  }
  /**
   * 获取实体缓存
   */
  getEntityCache(filePath) {
    try {
      const cache = this.workspaceState.get(_StateManager.KEYS.WORKSPACE_ENTITIES) || {};
      const entityCache = cache[filePath];
      if (!entityCache) {
        return void 0;
      }
      if (Date.now() - entityCache.timestamp > 5 * 60 * 1e3) {
        return void 0;
      }
      return entityCache.data;
    } catch (error) {
      _logger__WEBPACK_IMPORTED_MODULE_1__.Logger.error("\u83B7\u53D6\u5B9E\u4F53\u7F13\u5B58\u5931\u8D25", error);
      return void 0;
    }
  }
  /**
   * 清除过期缓存
   */
  async cleanExpiredCache() {
    try {
      const cache = this.workspaceState.get(_StateManager.KEYS.WORKSPACE_ENTITIES) || {};
      const now = Date.now();
      const maxAge = 5 * 60 * 1e3;
      const cleanedCache = {};
      let removedCount = 0;
      for (const [filePath, entityCache] of Object.entries(cache)) {
        if (now - entityCache.timestamp <= maxAge) {
          cleanedCache[filePath] = entityCache;
        } else {
          removedCount++;
        }
      }
      if (removedCount > 0) {
        await this.workspaceState.update(_StateManager.KEYS.WORKSPACE_ENTITIES, cleanedCache);
        _logger__WEBPACK_IMPORTED_MODULE_1__.Logger.info(`\u6E05\u9664\u4E86${removedCount}\u4E2A\u8FC7\u671F\u7F13\u5B58\u9879`);
      }
    } catch (error) {
      _logger__WEBPACK_IMPORTED_MODULE_1__.Logger.error("\u6E05\u9664\u8FC7\u671F\u7F13\u5B58\u5931\u8D25", error);
    }
  }
  // ==================== 工作空间状态 ====================
  /**
   * 获取当前工作空间路径
   */
  getCurrentWorkspacePath() {
    const workspaceFolders = vscode__WEBPACK_IMPORTED_MODULE_0__.workspace.workspaceFolders;
    return workspaceFolders?.[0]?.uri.fsPath;
  }
  /**
   * 检查是否为MyBatis项目
   */
  async isMyBatisProject() {
    const workspacePath = this.getCurrentWorkspacePath();
    if (!workspacePath) {
      return false;
    }
    try {
      const files = await vscode__WEBPACK_IMPORTED_MODULE_0__.workspace.findFiles(
        "**/{*.xml,pom.xml,build.gradle,application.yml,application.properties}",
        "**/node_modules/**",
        10
      );
      const gitignoreFile = await vscode__WEBPACK_IMPORTED_MODULE_0__.workspace.findFiles(".gitignore");
      if (gitignoreFile.length > 0) {
        const gitignoreContent = await vscode__WEBPACK_IMPORTED_MODULE_0__.workspace.fs.readFile(gitignoreFile[0]);
        const gitignoreText = Buffer.from(gitignoreContent).toString("utf8");
        const gitignorePatterns = gitignoreText.split("\n").map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
        const filteredFiles = files.filter((file) => {
          const relativePath = vscode__WEBPACK_IMPORTED_MODULE_0__.workspace.asRelativePath(file);
          return !gitignorePatterns.some((pattern) => {
            if (pattern.includes("*")) {
              const regex = new RegExp(pattern.replace(/\*/g, ".*"));
              return regex.test(relativePath);
            }
            return relativePath.includes(pattern);
          });
        });
        files.splice(0, files.length, ...filteredFiles);
      }
      for (const file of files) {
        const content = await vscode__WEBPACK_IMPORTED_MODULE_0__.workspace.fs.readFile(file);
        const text = Buffer.from(content).toString("utf8");
        if (text.includes("mybatis") || text.includes("MyBatis") || text.includes("mybatis-plus") || text.includes("com.baomidou")) {
          return true;
        }
      }
      return false;
    } catch (error) {
      _logger__WEBPACK_IMPORTED_MODULE_1__.Logger.error("\u68C0\u67E5MyBatis\u9879\u76EE\u5931\u8D25", error);
      return false;
    }
  }
  // ==================== 全局设置 ====================
  /**
   * 保存全局设置
   */
  async saveGlobalSetting(key, value) {
    try {
      await this.globalState.update(key, value);
      _logger__WEBPACK_IMPORTED_MODULE_1__.Logger.debug(`\u5168\u5C40\u8BBE\u7F6E\u5DF2\u4FDD\u5B58: ${key}`);
    } catch (error) {
      _logger__WEBPACK_IMPORTED_MODULE_1__.Logger.error("\u4FDD\u5B58\u5168\u5C40\u8BBE\u7F6E\u5931\u8D25", error);
      throw error;
    }
  }
  getGlobalSetting(key, defaultValue) {
    if (defaultValue !== void 0) {
      return this.globalState.get(key, defaultValue);
    }
    return this.globalState.get(key);
  }
  // ==================== 状态重置 ====================
  /**
   * 重置工作空间状态
   */
  async resetWorkspaceState() {
    try {
      const keys = Object.values(_StateManager.KEYS);
      for (const key of keys) {
        await this.workspaceState.update(key, void 0);
      }
      _logger__WEBPACK_IMPORTED_MODULE_1__.Logger.info("\u5DE5\u4F5C\u7A7A\u95F4\u72B6\u6001\u5DF2\u91CD\u7F6E");
    } catch (error) {
      _logger__WEBPACK_IMPORTED_MODULE_1__.Logger.error("\u91CD\u7F6E\u5DE5\u4F5C\u7A7A\u95F4\u72B6\u6001\u5931\u8D25", error);
      throw error;
    }
  }
  /**
   * 获取状态统计信息
   */
  getStateStats() {
    const lastScanTime = this.getLastScanTime();
    const workspacePath = this.getCurrentWorkspacePath();
    return {
      workspacePath,
      lastScanTime: lastScanTime ? new Date(lastScanTime).toISOString() : null,
      cacheValid: this.isCacheValid(),
      hasERData: !!this.workspaceState.get(_StateManager.KEYS.ER_DIAGRAM_DATA)
    };
  }
};
// 状态键常量
_StateManager.KEYS = {
  ER_DIAGRAM_DATA: "erDiagramData",
  LAST_SCAN_TIME: "lastScanTime",
  PROJECT_CONFIG: "projectConfig",
  CACHE_VERSION: "cacheVersion",
  WORKSPACE_ENTITIES: "workspaceEntities",
  INFERENCE_CACHE: "inferenceCache"
};
let StateManager = _StateManager;


/***/ }),

/***/ "./src/workers/worker-manager.ts":
/*!***************************************!*\
  !*** ./src/workers/worker-manager.ts ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   WorkerManager: () => (/* binding */ WorkerManager)
/* harmony export */ });
/* harmony import */ var worker_threads__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! worker_threads */ "worker_threads");
/* harmony import */ var worker_threads__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(worker_threads__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! path */ "path");
/* harmony import */ var path__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(path__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var events__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! events */ "events");
/* harmony import */ var events__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(events__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _utils_logger__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../utils/logger */ "./src/utils/logger.ts");
/* harmony import */ var _types_worker_types__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../types/worker-types */ "./src/types/worker-types.ts");






class WorkerManager extends events__WEBPACK_IMPORTED_MODULE_2__.EventEmitter {
  constructor(config = {}) {
    super();
    this.workers = /* @__PURE__ */ new Map();
    this.workerInfos = /* @__PURE__ */ new Map();
    this.taskQueue = [];
    this.activeTasks = /* @__PURE__ */ new Map();
    this.pendingResponses = /* @__PURE__ */ new Map();
    this.isShuttingDown = false;
    const cpuCount = (__webpack_require__(/*! os */ "os").cpus)().length;
    this.config = {
      maxWorkers: Math.min(cpuCount * 2, 16),
      // 最多CPU的两倍，但不超过16个
      workerTimeout: 3e4,
      // 30秒超时
      maxQueueSize: 100,
      // 队列最多100个任务
      heartbeatInterval: 5e3,
      // 5秒心跳
      maxRetries: 3,
      // 重试3次
      enableProfiling: false,
      ...config
    };
    this.stats = {
      activeWorkers: 0,
      idleWorkers: 0,
      queuedTasks: 0,
      processingTasks: 0,
      totalProcessedTasks: 0,
      averageQueueTime: 0,
      systemLoad: 0
    };
    this.startHeartbeat();
    this.startResourceMonitoring();
    _utils_logger__WEBPACK_IMPORTED_MODULE_3__.Logger.info(`WorkerManager initialized with optimized config`, {
      maxWorkers: this.config.maxWorkers,
      timeout: this.config.workerTimeout,
      queueSize: this.config.maxQueueSize
    });
  }
  /**
   * 启动Worker管理器
   */
  async start() {
    if (this.isShuttingDown) {
      throw new Error("WorkerManager is shutting down");
    }
    try {
      await this.createWorker();
      _utils_logger__WEBPACK_IMPORTED_MODULE_3__.Logger.info(`WorkerManager started with 1 initial worker`);
    } catch (error) {
      _utils_logger__WEBPACK_IMPORTED_MODULE_3__.Logger.error("Failed to create initial worker", error);
      throw error;
    }
  }
  /**
   * 停止Worker管理器
   */
  async shutdown() {
    this.isShuttingDown = true;
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.resourceMonitorInterval) {
      clearInterval(this.resourceMonitorInterval);
    }
    this.taskQueue = [];
    for (const [id, pending] of this.pendingResponses) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("WorkerManager is shutting down"));
    }
    this.pendingResponses.clear();
    const terminationPromises = Array.from(this.workers.values()).map(
      (worker) => this.terminateWorker(worker)
    );
    await Promise.all(terminationPromises);
    this.workers.clear();
    this.workerInfos.clear();
    this.activeTasks.clear();
    _utils_logger__WEBPACK_IMPORTED_MODULE_3__.Logger.info("WorkerManager shutdown completed");
  }
  /**
   * 提交任务 - 优化版本，支持批量处理
   */
  async submitTask(type, data, options = {}) {
    if (this.isShuttingDown) {
      throw new Error("WorkerManager is shutting down");
    }
    if (this.taskQueue.length >= this.config.maxQueueSize) {
      throw new Error("Task queue is full");
    }
    const task = {
      id: this.generateTaskId(),
      type,
      data,
      priority: options.priority || 5,
      timeout: options.timeout || this.config.workerTimeout,
      retryCount: 0,
      maxRetries: options.maxRetries || this.config.maxRetries,
      createdAt: Date.now()
    };
    return new Promise((resolve, reject) => {
      this.addTaskToQueue(task);
      const timeout = setTimeout(() => {
        this.pendingResponses.delete(task.id);
        reject(new Error(`Task ${task.id} timed out after ${task.timeout}ms`));
      }, task.timeout);
      this.pendingResponses.set(task.id, {
        resolve,
        reject,
        timeout
      });
      this.processQueue();
    });
  }
  /**
   * 新增：批量提交任务
   */
  async submitBatchTasks(tasks) {
    if (tasks.length === 0) {
      return [];
    }
    if (tasks.length <= 10) {
      return Promise.all(tasks.map(
        (task) => this.submitTask(task.type, task.data, task.options)
      ));
    }
    const batchSize = 5;
    const results = [];
    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((task) => this.submitTask(task.type, task.data, task.options))
      );
      results.push(...batchResults);
      if (i + batchSize < tasks.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    return results;
  }
  /**
   * 获取管理器统计信息
   */
  getStats() {
    this.updateStats();
    return { ...this.stats };
  }
  /**
   * 获取Worker信息
   */
  getWorkerInfos() {
    return Array.from(this.workerInfos.values());
  }
  /**
   * 获取Worker处理状态详情 - 新增功能
   */
  getWorkerProcessingDetails() {
    const details = [];
    for (const [workerId, workerInfo] of this.workerInfos) {
      const detail = {
        workerId,
        status: workerInfo.status,
        processedTasks: workerInfo.processedTasks,
        errorCount: workerInfo.errorCount
      };
      if (workerInfo.currentTaskId) {
        const task = this.activeTasks.get(workerInfo.currentTaskId);
        if (task) {
          detail.currentTask = {
            id: task.id,
            type: task.type,
            startedAt: task.startedAt || task.createdAt,
            duration: Date.now() - (task.startedAt || task.createdAt),
            description: this.getTaskDescription(task)
          };
        }
      }
      details.push(detail);
    }
    return details;
  }
  /**
   * 获取任务描述 - 辅助方法
   */
  getTaskDescription(task) {
    switch (task.type) {
      case _types_worker_types__WEBPACK_IMPORTED_MODULE_4__.WorkerMessageType.PARSE_JAVA_FILE:
        return `\u89E3\u6790Java\u6587\u4EF6: ${task.data?.filePath || "\u672A\u77E5\u6587\u4EF6"}`;
      case _types_worker_types__WEBPACK_IMPORTED_MODULE_4__.WorkerMessageType.PARSE_XML_FILE:
        return `\u89E3\u6790XML\u6587\u4EF6: ${task.data?.filePath || "\u672A\u77E5\u6587\u4EF6"}`;
      case _types_worker_types__WEBPACK_IMPORTED_MODULE_4__.WorkerMessageType.PARSE_BATCH_FILES:
        return `\u6279\u91CF\u89E3\u6790\u6587\u4EF6: ${task.data?.files?.length || 0}\u4E2A\u6587\u4EF6`;
      case _types_worker_types__WEBPACK_IMPORTED_MODULE_4__.WorkerMessageType.INFER_RELATIONS:
        return `\u63A8\u65AD\u5173\u7CFB: ${task.data?.entities?.length || 0}\u4E2A\u5B9E\u4F53`;
      case _types_worker_types__WEBPACK_IMPORTED_MODULE_4__.WorkerMessageType.VALIDATE_RELATIONS:
        return `\u9A8C\u8BC1\u5173\u7CFB: ${task.data?.relations?.length || 0}\u4E2A\u5173\u7CFB`;
      case _types_worker_types__WEBPACK_IMPORTED_MODULE_4__.WorkerMessageType.GENERATE_DIAGRAM:
        return `\u751F\u6210\u56FE\u8868: ${task.data?.entities?.length || 0}\u4E2A\u5B9E\u4F53`;
      case _types_worker_types__WEBPACK_IMPORTED_MODULE_4__.WorkerMessageType.EXPORT_DIAGRAM:
        return `\u5BFC\u51FA\u56FE\u8868: ${task.data?.format || "\u672A\u77E5\u683C\u5F0F"}`;
      default:
        return `\u6267\u884C\u4EFB\u52A1: ${task.type}`;
    }
  }
  /**
   * 输出Worker处理状态 - 新增功能
   */
  logWorkerProcessingStatus() {
    const details = this.getWorkerProcessingDetails();
    const stats = this.getStats();
    _utils_logger__WEBPACK_IMPORTED_MODULE_3__.Logger.info("=== Worker\u5904\u7406\u72B6\u6001\u62A5\u544A ===");
    _utils_logger__WEBPACK_IMPORTED_MODULE_3__.Logger.info(`\u603BWorker\u6570: ${this.workers.size}/${this.config.maxWorkers}`);
    _utils_logger__WEBPACK_IMPORTED_MODULE_3__.Logger.info(`\u6D3B\u8DC3Worker: ${stats.activeWorkers}, \u7A7A\u95F2Worker: ${stats.idleWorkers}`);
    _utils_logger__WEBPACK_IMPORTED_MODULE_3__.Logger.info(`\u961F\u5217\u4EFB\u52A1: ${stats.queuedTasks}, \u5904\u7406\u4E2D\u4EFB\u52A1: ${stats.processingTasks}`);
    details.forEach((detail) => {
      if (detail.status === _types_worker_types__WEBPACK_IMPORTED_MODULE_4__.WorkerStatus.BUSY && detail.currentTask) {
        const task = detail.currentTask;
        const durationSec = Math.round(task.duration / 1e3);
        _utils_logger__WEBPACK_IMPORTED_MODULE_3__.Logger.info(`\u{1F504} Worker ${detail.workerId}: ${task.description} (${durationSec}\u79D2)`);
      } else {
        _utils_logger__WEBPACK_IMPORTED_MODULE_3__.Logger.info(`\u{1F4A4} Worker ${detail.workerId}: ${detail.status} (\u5DF2\u5904\u7406${detail.processedTasks}\u4E2A\u4EFB\u52A1)`);
      }
    });
    _utils_logger__WEBPACK_IMPORTED_MODULE_3__.Logger.info("========================");
  }
  /**
   * 新增：获取系统健康状态
   */
  getHealthStatus() {
    const issues = [];
    const recommendations = [];
    const stats = this.getStats();
    const memUsage = process.memoryUsage();
    if (memUsage.heapUsed > 50 * 1024 * 1024) {
      issues.push("\u5185\u5B58\u4F7F\u7528\u8FC7\u9AD8");
      recommendations.push("\u8003\u8651\u6E05\u7406\u7F13\u5B58\u6216\u51CF\u5C11\u5E76\u53D1\u4EFB\u52A1");
    }
    if (stats.activeWorkers > this.config.maxWorkers) {
      issues.push("Worker\u6570\u91CF\u8D85\u9650");
      recommendations.push("\u7B49\u5F85\u5F53\u524D\u4EFB\u52A1\u5B8C\u6210\u6216\u91CD\u542F\u6269\u5C55");
    }
    if (stats.queuedTasks > this.config.maxQueueSize * 0.8) {
      issues.push("\u4EFB\u52A1\u961F\u5217\u63A5\u8FD1\u6EE1\u8F7D");
      recommendations.push("\u51CF\u5C11\u5E76\u53D1\u64CD\u4F5C\u6216\u589E\u52A0\u5904\u7406\u80FD\u529B");
    }
    return {
      healthy: issues.length === 0,
      issues,
      recommendations
    };
  }
  /**
   * 创建Worker - 优化版本
   */
  async createWorker() {
    const workerId = this.generateWorkerId();
    const workerPath = path__WEBPACK_IMPORTED_MODULE_1__.join(__dirname, "workers", "worker-thread.js");
    try {
      const worker = new worker_threads__WEBPACK_IMPORTED_MODULE_0__.Worker(workerPath, {
        workerData: {
          workerId,
          config: this.config
        }
      });
      this.workers.set(workerId, worker);
      this.workerInfos.set(workerId, {
        id: workerId,
        status: _types_worker_types__WEBPACK_IMPORTED_MODULE_4__.WorkerStatus.IDLE,
        processedTasks: 0,
        errorCount: 0,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        averageProcessingTime: 0
      });
      this.setupWorkerListeners(worker, workerId);
      _utils_logger__WEBPACK_IMPORTED_MODULE_3__.Logger.info(`Worker created: ${workerId}`);
      return workerId;
    } catch (error) {
      _utils_logger__WEBPACK_IMPORTED_MODULE_3__.Logger.error(`Failed to create worker: ${workerId}`, error);
      this.workerInfos.delete(workerId);
      throw error;
    }
  }
  /**
   * 设置Worker事件监听
   */
  setupWorkerListeners(worker, workerId) {
    worker.on("message", (message) => {
      this.handleWorkerMessage(workerId, message);
    });
    worker.on("error", (error) => {
      this.handleWorkerError(workerId, error);
    });
    worker.on("exit", (code) => {
      this.handleWorkerExit(workerId, code);
    });
  }
  /**
   * 处理Worker消息
   */
  handleWorkerMessage(workerId, message) {
    const workerInfo = this.workerInfos.get(workerId);
    if (!workerInfo) return;
    workerInfo.lastActiveAt = Date.now();
    switch (message.type) {
      case _types_worker_types__WEBPACK_IMPORTED_MODULE_4__.WorkerMessageType.PONG:
        break;
      case _types_worker_types__WEBPACK_IMPORTED_MODULE_4__.WorkerMessageType.PROGRESS:
        this.emit("progress", message.payload);
        break;
      case _types_worker_types__WEBPACK_IMPORTED_MODULE_4__.WorkerMessageType.ERROR:
        this.handleTaskError(workerId, message);
        break;
      default:
        if (message.isResponse && message.responseToId) {
          this.handleTaskResponse(workerId, message);
        }
        break;
    }
  }
  /**
   * 处理任务响应
   */
  handleTaskResponse(workerId, message) {
    const taskId = message.responseToId;
    const pending = this.pendingResponses.get(taskId);
    const task = this.activeTasks.get(taskId);
    const workerInfo = this.workerInfos.get(workerId);
    if (!pending || !task || !workerInfo) return;
    clearTimeout(pending.timeout);
    this.pendingResponses.delete(taskId);
    this.activeTasks.delete(taskId);
    workerInfo.status = _types_worker_types__WEBPACK_IMPORTED_MODULE_4__.WorkerStatus.IDLE;
    workerInfo.currentTaskId = void 0;
    workerInfo.processedTasks++;
    const processingTime = Date.now() - (task.startedAt || task.createdAt);
    workerInfo.averageProcessingTime = (workerInfo.averageProcessingTime * (workerInfo.processedTasks - 1) + processingTime) / workerInfo.processedTasks;
    task.completedAt = Date.now();
    this.stats.totalProcessedTasks++;
    const response = message.payload;
    if (response.success) {
      pending.resolve(response.data);
      this.emit("taskCompleted", { taskId, workerId, result: response.data });
    } else {
      pending.reject(new Error(response.error || "Task failed"));
      this.emit("taskFailed", { taskId, workerId, error: response.error });
    }
    this.processQueue();
  }
  /**
   * 处理任务错误
   */
  handleTaskError(workerId, message) {
    const error = message.payload;
    const workerInfo = this.workerInfos.get(workerId);
    if (workerInfo) {
      workerInfo.errorCount++;
      workerInfo.status = _types_worker_types__WEBPACK_IMPORTED_MODULE_4__.WorkerStatus.ERROR;
    }
    if (error.taskId) {
      const pending = this.pendingResponses.get(error.taskId);
      const task = this.activeTasks.get(error.taskId);
      if (pending && task) {
        if (task.retryCount < task.maxRetries) {
          task.retryCount++;
          this.addTaskToQueue(task);
          _utils_logger__WEBPACK_IMPORTED_MODULE_3__.Logger.warn(`Retrying task ${task.id}, attempt ${task.retryCount}/${task.maxRetries}`);
        } else {
          clearTimeout(pending.timeout);
          this.pendingResponses.delete(error.taskId);
          this.activeTasks.delete(error.taskId);
          pending.reject(new Error(error.message));
        }
      }
    }
    _utils_logger__WEBPACK_IMPORTED_MODULE_3__.Logger.error(`Worker ${workerId} error: ${error.message}`);
    this.emit("workerError", { workerId, error });
  }
  /**
   * 处理Worker错误
   */
  handleWorkerError(workerId, error) {
    _utils_logger__WEBPACK_IMPORTED_MODULE_3__.Logger.error(`Worker ${workerId} encountered error: ${error.message}`);
    const workerInfo = this.workerInfos.get(workerId);
    if (workerInfo) {
      workerInfo.status = _types_worker_types__WEBPACK_IMPORTED_MODULE_4__.WorkerStatus.ERROR;
      workerInfo.errorCount++;
    }
    this.recreateWorker(workerId);
  }
  /**
   * 处理Worker退出
   */
  handleWorkerExit(workerId, code) {
    _utils_logger__WEBPACK_IMPORTED_MODULE_3__.Logger.warn(`Worker ${workerId} exited with code ${code}`);
    this.workers.delete(workerId);
    const workerInfo = this.workerInfos.get(workerId);
    if (workerInfo) {
      workerInfo.status = _types_worker_types__WEBPACK_IMPORTED_MODULE_4__.WorkerStatus.TERMINATED;
    }
    if (!this.isShuttingDown) {
      this.recreateWorker(workerId);
    }
  }
  /**
   * 重新创建Worker - 优化版本
   */
  async recreateWorker(oldWorkerId) {
    try {
      const currentWorkerCount = this.workers.size;
      const cpuCount = (__webpack_require__(/*! os */ "os").cpus)().length;
      const maxAllowedWorkers = Math.min(cpuCount * 2, 16);
      if (currentWorkerCount >= maxAllowedWorkers) {
        _utils_logger__WEBPACK_IMPORTED_MODULE_3__.Logger.warn(`\u5DF2\u8FBE\u5230\u6700\u5927Worker\u6570\u91CF\u9650\u5236 (${maxAllowedWorkers})\uFF0C\u4E0D\u518D\u91CD\u5EFAWorker ${oldWorkerId}`);
        return;
      }
      this.workers.delete(oldWorkerId);
      this.workerInfos.delete(oldWorkerId);
      await this.createWorker();
      _utils_logger__WEBPACK_IMPORTED_MODULE_3__.Logger.info(`Worker ${oldWorkerId} recreated (${this.workers.size}/${maxAllowedWorkers})`);
    } catch (error) {
      _utils_logger__WEBPACK_IMPORTED_MODULE_3__.Logger.error(`Failed to recreate worker: ${error}`);
    }
  }
  /**
   * 添加任务到队列
   */
  addTaskToQueue(task) {
    let insertIndex = this.taskQueue.length;
    for (let i = 0; i < this.taskQueue.length; i++) {
      if (this.taskQueue[i].priority < task.priority) {
        insertIndex = i;
        break;
      }
    }
    this.taskQueue.splice(insertIndex, 0, task);
    this.stats.queuedTasks = this.taskQueue.length;
  }
  /**
   * 处理任务队列
   */
  processQueue() {
    if (this.taskQueue.length === 0) return;
    const idleWorker = this.findIdleWorker();
    if (!idleWorker) {
      if (this.workers.size < this.config.maxWorkers) {
        this.createWorker().then(() => this.processQueue());
      }
      return;
    }
    const task = this.taskQueue.shift();
    if (!task) return;
    this.stats.queuedTasks = this.taskQueue.length;
    this.assignTaskToWorker(idleWorker, task);
  }
  /**
   * 查找空闲Worker
   */
  findIdleWorker() {
    for (const [workerId, workerInfo] of this.workerInfos) {
      if (workerInfo.status === _types_worker_types__WEBPACK_IMPORTED_MODULE_4__.WorkerStatus.IDLE) {
        return workerId;
      }
    }
    return null;
  }
  /**
   * 分配任务给Worker
   */
  assignTaskToWorker(workerId, task) {
    const worker = this.workers.get(workerId);
    const workerInfo = this.workerInfos.get(workerId);
    if (!worker || !workerInfo) return;
    workerInfo.status = _types_worker_types__WEBPACK_IMPORTED_MODULE_4__.WorkerStatus.BUSY;
    workerInfo.currentTaskId = task.id;
    task.startedAt = Date.now();
    this.activeTasks.set(task.id, task);
    this.stats.processingTasks = this.activeTasks.size;
    const message = {
      id: this.generateMessageId(),
      type: task.type,
      payload: task.data,
      timestamp: Date.now()
    };
    this.sendMessage(workerId, message);
    this.emit("taskStarted", { taskId: task.id, workerId });
    _utils_logger__WEBPACK_IMPORTED_MODULE_3__.Logger.debug(`Task ${task.id} assigned to worker ${workerId}`);
  }
  /**
   * 发送消息给Worker
   */
  async sendMessage(workerId, message) {
    const worker = this.workers.get(workerId);
    if (!worker) {
      throw new Error(`Worker ${workerId} not found`);
    }
    worker.postMessage(message);
  }
  /**
   * 终止Worker
   */
  async terminateWorker(worker) {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        worker.terminate();
        resolve();
      }, 5e3);
      worker.once("exit", () => {
        clearTimeout(timeout);
        resolve();
      });
      worker.postMessage({
        id: this.generateMessageId(),
        type: _types_worker_types__WEBPACK_IMPORTED_MODULE_4__.WorkerMessageType.TERMINATE,
        payload: {},
        timestamp: Date.now()
      });
    });
  }
  /**
   * 启动心跳检测
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.performHeartbeat();
    }, this.config.heartbeatInterval);
  }
  /**
   * 执行心跳检测
   */
  performHeartbeat() {
    const now = Date.now();
    for (const [workerId, workerInfo] of this.workerInfos) {
      if (now - workerInfo.lastActiveAt > this.config.workerTimeout) {
        _utils_logger__WEBPACK_IMPORTED_MODULE_3__.Logger.warn(`Worker ${workerId} appears to be unresponsive`);
        this.recreateWorker(workerId);
        continue;
      }
      const worker = this.workers.get(workerId);
      if (worker && workerInfo.status === _types_worker_types__WEBPACK_IMPORTED_MODULE_4__.WorkerStatus.IDLE) {
        worker.postMessage({
          id: this.generateMessageId(),
          type: _types_worker_types__WEBPACK_IMPORTED_MODULE_4__.WorkerMessageType.PING,
          payload: {},
          timestamp: now
        });
      }
    }
  }
  /**
   * 更新统计信息
   */
  updateStats() {
    let activeWorkers = 0;
    let idleWorkers = 0;
    for (const workerInfo of this.workerInfos.values()) {
      if (workerInfo.status === _types_worker_types__WEBPACK_IMPORTED_MODULE_4__.WorkerStatus.BUSY) {
        activeWorkers++;
      } else if (workerInfo.status === _types_worker_types__WEBPACK_IMPORTED_MODULE_4__.WorkerStatus.IDLE) {
        idleWorkers++;
      }
    }
    this.stats.activeWorkers = activeWorkers;
    this.stats.idleWorkers = idleWorkers;
    this.stats.queuedTasks = this.taskQueue.length;
    this.stats.processingTasks = this.activeTasks.size;
    this.stats.systemLoad = activeWorkers / Math.max(1, this.workers.size) * 100;
  }
  /**
   * 生成Worker ID
   */
  generateWorkerId() {
    return `worker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  /**
   * 生成任务ID
   */
  generateTaskId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  /**
   * 生成消息ID
   */
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  /**
   * 新增：启动资源监控
   */
  startResourceMonitoring() {
    this.resourceMonitorInterval = setInterval(() => {
      this.performResourceCheck();
    }, 3e4);
  }
  /**
   * 新增：执行资源检查
   */
  performResourceCheck() {
    const memUsage = process.memoryUsage();
    const stats = this.getStats();
    _utils_logger__WEBPACK_IMPORTED_MODULE_3__.Logger.debug("Resource check", {
      memory: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      workers: `${stats.activeWorkers}/${this.config.maxWorkers}`,
      queue: stats.queuedTasks
    });
    if (stats.activeWorkers > 0 || stats.queuedTasks > 0) {
      this.logWorkerProcessingStatus();
    }
    if (memUsage.heapUsed > 50 * 1024 * 1024) {
      _utils_logger__WEBPACK_IMPORTED_MODULE_3__.Logger.warn("High memory usage detected, cleaning up idle workers");
      this.cleanupIdleWorkers();
    }
    if (stats.activeWorkers > this.config.maxWorkers) {
      _utils_logger__WEBPACK_IMPORTED_MODULE_3__.Logger.warn("Too many active workers, forcing cleanup");
      this.forceCleanupWorkers();
    }
  }
  /**
   * 新增：清理空闲Worker
   */
  cleanupIdleWorkers() {
    const now = Date.now();
    const idleThreshold = 6e4;
    for (const [workerId, info] of this.workerInfos) {
      if (info.status === _types_worker_types__WEBPACK_IMPORTED_MODULE_4__.WorkerStatus.IDLE && now - info.lastActiveAt > idleThreshold) {
        _utils_logger__WEBPACK_IMPORTED_MODULE_3__.Logger.info(`Cleaning up idle worker: ${workerId}`);
        const worker = this.workers.get(workerId);
        if (worker) {
          this.terminateWorker(worker);
        }
      }
    }
  }
  /**
   * 新增：强制清理Worker
   */
  forceCleanupWorkers() {
    const workerIds = Array.from(this.workerInfos.keys());
    const excessCount = workerIds.length - this.config.maxWorkers;
    if (excessCount > 0) {
      const sortedWorkers = workerIds.map((id) => ({ id, info: this.workerInfos.get(id) })).sort((a, b) => {
        if (a.info.status === _types_worker_types__WEBPACK_IMPORTED_MODULE_4__.WorkerStatus.IDLE && b.info.status !== _types_worker_types__WEBPACK_IMPORTED_MODULE_4__.WorkerStatus.IDLE) {
          return -1;
        }
        if (b.info.status === _types_worker_types__WEBPACK_IMPORTED_MODULE_4__.WorkerStatus.IDLE && a.info.status !== _types_worker_types__WEBPACK_IMPORTED_MODULE_4__.WorkerStatus.IDLE) {
          return 1;
        }
        return a.info.createdAt - b.info.createdAt;
      });
      for (let i = 0; i < excessCount && i < sortedWorkers.length; i++) {
        const workerId = sortedWorkers[i].id;
        const worker = this.workers.get(workerId);
        if (worker) {
          _utils_logger__WEBPACK_IMPORTED_MODULE_3__.Logger.warn(`Force terminating worker: ${workerId}`);
          this.terminateWorker(worker);
        }
      }
    }
  }
}


/***/ }),

/***/ "events":
/*!*************************!*\
  !*** external "events" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("events");

/***/ }),

/***/ "fs/promises":
/*!******************************!*\
  !*** external "fs/promises" ***!
  \******************************/
/***/ ((module) => {

module.exports = require("fs/promises");

/***/ }),

/***/ "os":
/*!*********************!*\
  !*** external "os" ***!
  \*********************/
/***/ ((module) => {

module.exports = require("os");

/***/ }),

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("path");

/***/ }),

/***/ "vscode":
/*!*************************!*\
  !*** external "vscode" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("vscode");

/***/ }),

/***/ "worker_threads":
/*!*********************************!*\
  !*** external "worker_threads" ***!
  \*********************************/
/***/ ((module) => {

module.exports = require("worker_threads");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/ensure chunk */
/******/ 	(() => {
/******/ 		__webpack_require__.f = {};
/******/ 		// This file contains only the entry chunk.
/******/ 		// The chunk loading function for additional chunks
/******/ 		__webpack_require__.e = (chunkId) => {
/******/ 			return Promise.all(Object.keys(__webpack_require__.f).reduce((promises, key) => {
/******/ 				__webpack_require__.f[key](chunkId, promises);
/******/ 				return promises;
/******/ 			}, []));
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks
/******/ 		__webpack_require__.u = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return "" + chunkId + ".extension.js";
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/require chunk loading */
/******/ 	(() => {
/******/ 		// no baseURI
/******/ 		
/******/ 		// object to store loaded chunks
/******/ 		// "1" means "loaded", otherwise not loaded yet
/******/ 		var installedChunks = {
/******/ 			"main": 1
/******/ 		};
/******/ 		
/******/ 		// no on chunks loaded
/******/ 		
/******/ 		var installChunk = (chunk) => {
/******/ 			var moreModules = chunk.modules, chunkIds = chunk.ids, runtime = chunk.runtime;
/******/ 			for(var moduleId in moreModules) {
/******/ 				if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 					__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 				}
/******/ 			}
/******/ 			if(runtime) runtime(__webpack_require__);
/******/ 			for(var i = 0; i < chunkIds.length; i++)
/******/ 				installedChunks[chunkIds[i]] = 1;
/******/ 		
/******/ 		};
/******/ 		
/******/ 		// require() chunk loading for javascript
/******/ 		__webpack_require__.f.require = (chunkId, promises) => {
/******/ 			// "1" is the signal for "already loaded"
/******/ 			if(!installedChunks[chunkId]) {
/******/ 				if(true) { // all chunks have JS
/******/ 					installChunk(require("./" + __webpack_require__.u(chunkId)));
/******/ 				} else installedChunks[chunkId] = 1;
/******/ 			}
/******/ 		};
/******/ 		
/******/ 		// no external install chunk
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!**************************!*\
  !*** ./src/extension.ts ***!
  \**************************/
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   activate: () => (/* binding */ activate),
/* harmony export */   deactivate: () => (/* binding */ deactivate)
/* harmony export */ });
/* harmony import */ var vscode__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! vscode */ "vscode");
/* harmony import */ var vscode__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(vscode__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _utils_logger__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./utils/logger */ "./src/utils/logger.ts");
/* harmony import */ var _utils_state_manager__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./utils/state-manager */ "./src/utils/state-manager.ts");
/* harmony import */ var _utils_config_manager__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./utils/config-manager */ "./src/utils/config-manager.ts");
/* harmony import */ var _commands_command_handler__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./commands/command-handler */ "./src/commands/command-handler.ts");
/* harmony import */ var _ui_webview_provider__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./ui/webview-provider */ "./src/ui/webview-provider.ts");







let stateManager;
let configManager;
let commandHandler;
let webviewProvider;
async function activate(context) {
  _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.initialize();
  stateManager = _utils_state_manager__WEBPACK_IMPORTED_MODULE_2__.StateManager.initialize(context);
  configManager = _utils_config_manager__WEBPACK_IMPORTED_MODULE_3__.ConfigManager.getInstance();
  webviewProvider = new _ui_webview_provider__WEBPACK_IMPORTED_MODULE_5__.ERDiagramWebViewProvider(context.extensionUri, context);
  context.subscriptions.push(
    vscode__WEBPACK_IMPORTED_MODULE_0__.window.registerWebviewViewProvider(
      _ui_webview_provider__WEBPACK_IMPORTED_MODULE_5__.ERDiagramWebViewProvider.viewType,
      webviewProvider
    )
  );
  commandHandler = new _commands_command_handler__WEBPACK_IMPORTED_MODULE_4__.CommandHandler(stateManager, configManager, webviewProvider);
  try {
    await commandHandler.initialize();
    _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.info("Worker\u7BA1\u7406\u5668\u521D\u59CB\u5316\u5B8C\u6210");
  } catch (error) {
    _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.error("Worker\u7BA1\u7406\u5668\u521D\u59CB\u5316\u5931\u8D25", error);
    vscode__WEBPACK_IMPORTED_MODULE_0__.window.showErrorMessage(`Worker\u7BA1\u7406\u5668\u521D\u59CB\u5316\u5931\u8D25: ${error}`);
    return;
  }
  _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.info("MyBatis ER Generator \u6269\u5C55\u5DF2\u6FC0\u6D3B");
  const configValidation = configManager.validateConfig();
  if (!configValidation.valid) {
    _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.warn("\u914D\u7F6E\u9A8C\u8BC1\u5931\u8D25", configValidation.errors);
    vscode__WEBPACK_IMPORTED_MODULE_0__.window.showWarningMessage(
      `\u914D\u7F6E\u5B58\u5728\u95EE\u9898: ${configValidation.errors.join(", ")}`
    );
  }
  const generateCommand = vscode__WEBPACK_IMPORTED_MODULE_0__.commands.registerCommand(
    "mybatis-er.generate",
    () => commandHandler.handleGenerateERDiagram()
  );
  const refreshCommand = vscode__WEBPACK_IMPORTED_MODULE_0__.commands.registerCommand(
    "mybatis-er.refresh",
    () => commandHandler.handleRefreshERDiagram()
  );
  const exportCommand = vscode__WEBPACK_IMPORTED_MODULE_0__.commands.registerCommand(
    "mybatis-er.export",
    () => commandHandler.handleExportERDiagram()
  );
  const settingsCommand = vscode__WEBPACK_IMPORTED_MODULE_0__.commands.registerCommand(
    "mybatis-er.settings",
    () => commandHandler.handleOpenSettings()
  );
  const statusCommand = vscode__WEBPACK_IMPORTED_MODULE_0__.commands.registerCommand(
    "mybatis-er.status",
    () => commandHandler.handleShowStatus()
  );
  const clearCacheCommand = vscode__WEBPACK_IMPORTED_MODULE_0__.commands.registerCommand(
    "mybatis-er.clearCache",
    () => commandHandler.handleClearCache()
  );
  const testWebViewCommand = vscode__WEBPACK_IMPORTED_MODULE_0__.commands.registerCommand(
    "mybatis-er.testWebView",
    () => commandHandler.handleTestWebView()
  );
  const performanceBenchmarkCommand = vscode__WEBPACK_IMPORTED_MODULE_0__.commands.registerCommand(
    "mybatis-er.performanceBenchmark",
    () => commandHandler.handlePerformanceBenchmark()
  );
  const simpleTestCommand = vscode__WEBPACK_IMPORTED_MODULE_0__.commands.registerCommand(
    "mybatis-er.simpleTest",
    () => commandHandler.handleSimpleTest()
  );
  const configChangeDisposable = configManager.onConfigChanged((newConfig) => {
    _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.info("\u914D\u7F6E\u5DF2\u53D8\u66F4\uFF0C\u91CD\u65B0\u5E94\u7528\u8BBE\u7F6E", newConfig);
  });
  const workspaceChangeDisposable = vscode__WEBPACK_IMPORTED_MODULE_0__.workspace.onDidChangeWorkspaceFolders(async (event) => {
    _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.info("\u5DE5\u4F5C\u7A7A\u95F4\u5DF2\u53D8\u66F4", {
      added: event.added.length,
      removed: event.removed.length
    });
    if (event.removed.length > 0) {
      await stateManager.resetWorkspaceState();
    }
  });
  context.subscriptions.push(
    generateCommand,
    refreshCommand,
    exportCommand,
    settingsCommand,
    statusCommand,
    clearCacheCommand,
    testWebViewCommand,
    performanceBenchmarkCommand,
    simpleTestCommand,
    configChangeDisposable,
    workspaceChangeDisposable,
    // 添加清理函数
    { dispose: () => commandHandler.dispose() }
  );
  const configSummary = configManager.getConfigSummary();
  const stateStats = stateManager.getStateStats();
  vscode__WEBPACK_IMPORTED_MODULE_0__.window.showInformationMessage("MyBatis ER Generator \u5DF2\u5C31\u7EEA\uFF01");
  _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.info("\u6269\u5C55\u6FC0\u6D3B\u5B8C\u6210\uFF0C\u6240\u6709\u547D\u4EE4\u5DF2\u6CE8\u518C", {
    config: configSummary,
    state: stateStats
  });
}
async function deactivate() {
  _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.info("MyBatis ER Generator \u6269\u5C55\u6B63\u5728\u505C\u7528...");
  if (commandHandler) {
    await commandHandler.dispose();
  }
  _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.info("MyBatis ER Generator \u6269\u5C55\u5DF2\u505C\u7528");
  _utils_logger__WEBPACK_IMPORTED_MODULE_1__.Logger.dispose();
}

})();

module.exports = __webpack_exports__;
/******/ })()
;
//# sourceMappingURL=extension.js.map