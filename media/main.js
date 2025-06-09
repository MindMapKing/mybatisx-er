// VS Code WebView API
const vscode = acquireVsCodeApi();

// 全局状态
let currentData = null;
let mermaidInstance = null;
let searchResults = [];

// DOM元素
const elements = {
    refreshBtn: null,
    exportBtn: null,
    searchInput: null,
    searchBtn: null,
    filterSelect: null,
    entityList: null,
    relationStats: null,
    loadingIndicator: null,
    errorIndicator: null,
    diagramCanvas: null,
    exportModal: null,
    closeModal: null,
    confirmExport: null,
    cancelExport: null
};

/**
 * 初始化WebView
 */
function initialize() {
    // 获取DOM元素
    initializeElements();
    
    // 绑定事件监听器
    bindEventListeners();
    
    // 初始化Mermaid
    initializeMermaid();
    
    // 监听来自扩展的消息
    window.addEventListener('message', handleExtensionMessage);
    
    console.log('MyBatis ER WebView initialized');
}

/**
 * 初始化DOM元素引用
 */
function initializeElements() {
    elements.refreshBtn = document.getElementById('refreshBtn');
    elements.exportBtn = document.getElementById('exportBtn');
    elements.searchInput = document.getElementById('searchInput');
    elements.searchBtn = document.getElementById('searchBtn');
    elements.filterSelect = document.getElementById('filterSelect');
    elements.entityList = document.getElementById('entityList');
    elements.relationStats = document.getElementById('relationStats');
    elements.loadingIndicator = document.getElementById('loadingIndicator');
    elements.errorIndicator = document.getElementById('errorIndicator');
    elements.diagramCanvas = document.getElementById('diagramCanvas');
    elements.exportModal = document.getElementById('exportModal');
    elements.closeModal = document.getElementById('closeModal');
    elements.confirmExport = document.getElementById('confirmExport');
    elements.cancelExport = document.getElementById('cancelExport');
}

/**
 * 绑定事件监听器
 */
function bindEventListeners() {
    // 工具栏按钮
    elements.refreshBtn?.addEventListener('click', handleRefresh);
    elements.exportBtn?.addEventListener('click', handleExport);
    
    // 搜索功能
    elements.searchBtn?.addEventListener('click', handleSearch);
    elements.searchInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    elements.searchInput?.addEventListener('input', handleSearchInput);
    
    // 过滤功能
    elements.filterSelect?.addEventListener('change', handleFilter);
    
    // 导出模态框
    elements.closeModal?.addEventListener('click', hideExportModal);
    elements.cancelExport?.addEventListener('click', hideExportModal);
    elements.confirmExport?.addEventListener('click', handleConfirmExport);
    
    // 点击模态框外部关闭
    elements.exportModal?.addEventListener('click', (e) => {
        if (e.target === elements.exportModal) {
            hideExportModal();
        }
    });
}

/**
 * 初始化Mermaid
 */
function initializeMermaid() {
    // 监听Mermaid加载成功事件
    window.addEventListener('mermaidLoaded', function() {
        try {
            mermaidInstance = window.mermaid;
            console.log('Mermaid initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Mermaid:', error);
            showError('Mermaid初始化失败: ' + error.message);
        }
    });
    
    // 监听Mermaid加载失败事件
    window.addEventListener('mermaidLoadFailed', function() {
        console.warn('Mermaid library failed to load, using fallback rendering');
        mermaidInstance = null;
    });
    
    // 如果Mermaid已经加载，直接初始化
    if (window.mermaid) {
        mermaidInstance = window.mermaid;
        console.log('Mermaid already available');
    }
}

/**
 * 处理来自扩展的消息
 */
function handleExtensionMessage(event) {
    const message = event.data;
    
    switch (message.type) {
        case 'updateDiagram':
            updateDiagram(message.data);
            break;
        case 'showLoading':
            showLoading(message.message);
            break;
        case 'showError':
            showError(message.error);
            break;
        case 'searchResults':
            displaySearchResults(message.results);
            break;
        case 'filterResults':
            updateDiagram(message.data);
            break;
        case 'exportToFile':
            performExport(message.format, message.path);
            break;
        default:
            console.warn('Unknown message type:', message.type);
    }
}

/**
 * 更新ER图
 */
function updateDiagram(data) {
    currentData = data;
    hideLoading();
    hideError();
    
    if (!data || !data.entities || data.entities.length === 0) {
        showEmptyState();
        return;
    }
    
    try {
        // 生成Mermaid代码
        const mermaidCode = generateMermaidCode(data);
        
        // 渲染图表
        renderDiagram(mermaidCode);
        
        // 更新侧边栏
        updateSidebar(data);
        
        console.log('Diagram updated successfully');
    } catch (error) {
        console.error('Failed to update diagram:', error);
        showError('更新ER图失败: ' + error.message);
    }
}

/**
 * 生成Mermaid代码
 */
function generateMermaidCode(data) {
    let mermaidCode = 'erDiagram\n';
    
    // 生成实体
    data.entities.forEach(entity => {
        const tableName = sanitizeTableName(entity.tableName);
        mermaidCode += `    ${tableName} {\n`;
        
        if (entity.fields && entity.fields.length > 0) {
            entity.fields.forEach(field => {
                const type = mapJavaTypeToDBType(field.javaType);
                const name = sanitizeColumnName(field.columnName);
                const constraints = generateFieldConstraints(field);
                mermaidCode += `        ${type} ${name}${constraints}\n`;
            });
        } else {
            mermaidCode += '        string placeholder "暂无字段信息"\n';
        }
        
        mermaidCode += '    }\n\n';
    });
    
    // 生成关系
    if (data.relations && data.relations.length > 0) {
        data.relations.forEach(relation => {
            const fromTable = sanitizeTableName(relation.fromTable);
            const toTable = sanitizeTableName(relation.toTable);
            const symbol = getRelationshipSymbol(relation.type);
            
            mermaidCode += `    ${fromTable} ${symbol} ${toTable}`;
            
            if (relation.fromField || relation.toField) {
                const label = [relation.fromField, relation.toField].filter(Boolean).join('-');
                mermaidCode += ` : ${label}`;
            }
            
            mermaidCode += '\n';
        });
    }
    
    return mermaidCode;
}

/**
 * 渲染图表
 */
async function renderDiagram(mermaidCode) {
    if (!elements.diagramCanvas) {
        throw new Error('Diagram canvas not found');
    }
    
    try {
        if (mermaidInstance) {
            // 使用Mermaid渲染
            elements.diagramCanvas.innerHTML = '';
            const element = document.createElement('div');
            element.className = 'mermaid';
            element.textContent = mermaidCode;
            elements.diagramCanvas.appendChild(element);
            
            await mermaidInstance.init();
        } else {
            // 降级到文本显示
            elements.diagramCanvas.innerHTML = `
                <div class="fallback-diagram">
                    <h3>ER图代码 (Mermaid格式)</h3>
                    <pre><code>${escapeHtml(mermaidCode)}</code></pre>
                    <p class="fallback-note">
                        注意: Mermaid库未加载，显示为代码格式。
                        您可以将此代码复制到支持Mermaid的编辑器中查看图表。
                    </p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Failed to render diagram:', error);
        throw error;
    }
}

/**
 * 更新侧边栏
 */
function updateSidebar(data) {
    updateEntityList(data.entities);
    updateRelationStats(data);
}

/**
 * 更新实体列表
 */
function updateEntityList(entities) {
    if (!elements.entityList) return;
    
    elements.entityList.innerHTML = '';
    
    entities.forEach(entity => {
        const entityItem = document.createElement('div');
        entityItem.className = 'entity-item';
        entityItem.innerHTML = `
            <div class="entity-name">${entity.tableName}</div>
            <div class="entity-details">
                <span class="field-count">${entity.fields.length} 字段</span>
                <span class="class-name">${entity.className}</span>
            </div>
        `;
        
        // 点击高亮实体
        entityItem.addEventListener('click', () => {
            highlightEntity(entity.tableName);
        });
        
        elements.entityList.appendChild(entityItem);
    });
}

/**
 * 更新关系统计
 */
function updateRelationStats(data) {
    if (!elements.relationStats) return;
    
    const stats = {
        entityCount: data.entities.length,
        relationCount: data.relations.length,
        fieldCount: data.entities.reduce((total, entity) => total + entity.fields.length, 0),
        relationTypes: {}
    };
    
    // 统计关系类型
    data.relations.forEach(relation => {
        const type = relation.type;
        stats.relationTypes[type] = (stats.relationTypes[type] || 0) + 1;
    });
    
    let statsHtml = `
        <div class="stat-item">
            <span class="stat-label">实体数量:</span>
            <span class="stat-value">${stats.entityCount}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">关系数量:</span>
            <span class="stat-value">${stats.relationCount}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">字段总数:</span>
            <span class="stat-value">${stats.fieldCount}</span>
        </div>
    `;
    
    // 关系类型统计
    if (Object.keys(stats.relationTypes).length > 0) {
        statsHtml += '<div class="relation-types">';
        Object.entries(stats.relationTypes).forEach(([type, count]) => {
            statsHtml += `
                <div class="relation-type-item">
                    <span class="relation-type">${getRelationTypeDisplayName(type)}:</span>
                    <span class="relation-count">${count}</span>
                </div>
            `;
        });
        statsHtml += '</div>';
    }
    
    elements.relationStats.innerHTML = statsHtml;
}

/**
 * 处理刷新按钮点击
 */
function handleRefresh() {
    vscode.postMessage({
        type: 'refreshDiagram'
    });
}

/**
 * 处理导出按钮点击
 */
function handleExport() {
    showExportModal();
}

/**
 * 处理搜索
 */
function handleSearch() {
    const query = elements.searchInput?.value?.trim();
    if (!query) {
        clearSearch();
        return;
    }
    
    vscode.postMessage({
        type: 'searchEntities',
        query: query
    });
}

/**
 * 处理搜索输入
 */
function handleSearchInput() {
    const query = elements.searchInput?.value?.trim();
    if (!query) {
        clearSearch();
    }
}

/**
 * 处理过滤
 */
function handleFilter() {
    const filterValue = elements.filterSelect?.value;
    
    vscode.postMessage({
        type: 'filterRelations',
        filter: {
            relationType: filterValue
        }
    });
}

/**
 * 显示导出模态框
 */
function showExportModal() {
    if (elements.exportModal) {
        elements.exportModal.style.display = 'block';
    }
}

/**
 * 隐藏导出模态框
 */
function hideExportModal() {
    if (elements.exportModal) {
        elements.exportModal.style.display = 'none';
    }
}

/**
 * 处理确认导出
 */
function handleConfirmExport() {
    const selectedFormat = document.querySelector('input[name="exportFormat"]:checked')?.value;
    if (!selectedFormat) {
        return;
    }
    
    vscode.postMessage({
        type: 'exportDiagram',
        format: selectedFormat
    });
    
    hideExportModal();
}

/**
 * 显示加载状态
 */
function showLoading(message = '正在生成ER图...') {
    if (elements.loadingIndicator) {
        elements.loadingIndicator.style.display = 'flex';
        const loadingText = elements.loadingIndicator.querySelector('.loading-text');
        if (loadingText) {
            loadingText.textContent = message;
        }
    }
    hideError();
    hideEmptyState();
}

/**
 * 隐藏加载状态
 */
function hideLoading() {
    if (elements.loadingIndicator) {
        elements.loadingIndicator.style.display = 'none';
    }
}

/**
 * 显示错误信息
 */
function showError(error) {
    if (elements.errorIndicator) {
        elements.errorIndicator.style.display = 'flex';
        const errorText = elements.errorIndicator.querySelector('.error-text');
        if (errorText) {
            errorText.textContent = error;
        }
    }
    hideLoading();
    hideEmptyState();
}

/**
 * 隐藏错误信息
 */
function hideError() {
    if (elements.errorIndicator) {
        elements.errorIndicator.style.display = 'none';
    }
}

/**
 * 显示空状态
 */
function showEmptyState() {
    if (elements.diagramCanvas) {
        elements.diagramCanvas.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📊</div>
                <div class="empty-title">暂无ER图数据</div>
                <div class="empty-description">
                    请确保项目包含MyBatis实体类，并点击"刷新"按钮重新扫描
                </div>
                <button class="empty-action" onclick="handleRefresh()">
                    刷新扫描
                </button>
            </div>
        `;
    }
}

/**
 * 隐藏空状态
 */
function hideEmptyState() {
    // 空状态通过更新图表内容自动隐藏
}

// 工具函数

/**
 * 清理表名
 */
function sanitizeTableName(tableName) {
    if (!tableName) return 'UNKNOWN_TABLE';
    return tableName.replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase();
}

/**
 * 清理列名
 */
function sanitizeColumnName(columnName) {
    if (!columnName) return 'unknown_column';
    return columnName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
}

/**
 * Java类型到数据库类型映射
 */
function mapJavaTypeToDBType(javaType) {
    const typeMapping = {
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
    
    const baseType = javaType.split('<')[0];
    return typeMapping[baseType] || 'varchar';
}

/**
 * 生成字段约束
 */
function generateFieldConstraints(field) {
    const constraints = [];
    
    if (field.isPrimaryKey) constraints.push('PK');
    if (field.isNotNull) constraints.push('NOT NULL');
    if (field.isUnique) constraints.push('UNIQUE');
    
    return constraints.length > 0 ? ` ${constraints.join(' ')}` : '';
}

/**
 * 获取关系符号
 */
function getRelationshipSymbol(relationType) {
    switch (relationType.toLowerCase()) {
        case 'one-to-one': return '||--||';
        case 'one-to-many': return '||--o{';
        case 'many-to-one': return '}o--||';
        case 'many-to-many': return '}o--o{';
        default: return '||--||';
    }
}

/**
 * 获取关系类型显示名称
 */
function getRelationTypeDisplayName(type) {
    const displayNames = {
        'one-to-one': '一对一',
        'one-to-many': '一对多',
        'many-to-one': '多对一',
        'many-to-many': '多对多'
    };
    return displayNames[type] || type;
}

/**
 * 转义HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 高亮实体
 */
function highlightEntity(tableName) {
    // 实现实体高亮逻辑
    console.log('Highlighting entity:', tableName);
}

/**
 * 清除搜索
 */
function clearSearch() {
    searchResults = [];
    // 清除搜索高亮
}

/**
 * 显示搜索结果
 */
function displaySearchResults(results) {
    searchResults = results;
    // 实现搜索结果显示逻辑
    console.log('Search results:', results);
}

/**
 * 执行导出
 */
function performExport(format, path) {
    // 实现导出逻辑
    console.log('Exporting to:', format, path);
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
} 