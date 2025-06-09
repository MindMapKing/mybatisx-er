import * as vscode from 'vscode';
import { ERDiagramData, EntityInfo, RelationInfo } from '../types';

/**
 * WebView Provider for ER Diagram Display
 * 实现交互式ER图展示的WebView提供器
 */
export class ERDiagramWebViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'mybatis-er.erDiagramView';
    
    private _view?: vscode.WebviewView;
    private _data?: ERDiagramData;
    
    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _context: vscode.ExtensionContext
    ) {}
    
    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;
        
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri
            ]
        };
        
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        
        // 监听来自WebView的消息
        webviewView.webview.onDidReceiveMessage(
            message => {
                switch (message.type) {
                    case 'exportDiagram':
                        this._exportDiagram(message.format);
                        break;
                    case 'refreshDiagram':
                        this._refreshDiagram();
                        break;
                    case 'searchEntities':
                        this._searchEntities(message.query);
                        break;
                    case 'filterRelations':
                        this._filterRelations(message.filter);
                        break;
                }
            },
            undefined,
            this._context.subscriptions
        );
    }
    
    /**
     * 更新ER图数据
     */
    public updateDiagram(data: ERDiagramData) {
        this._data = data;
        if (this._view) {
            this._view.webview.postMessage({
                type: 'updateDiagram',
                data: data
            });
        }
    }
    
    /**
     * 显示加载状态
     */
    public showLoading(message: string = '正在生成ER图...') {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'showLoading',
                message: message
            });
        }
    }
    
    /**
     * 显示错误信息
     */
    public showError(error: string) {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'showError',
                error: error
            });
        }
    }
    
    /**
     * 导出ER图
     */
    private async _exportDiagram(format: 'png' | 'svg' | 'pdf') {
        if (!this._data) {
            vscode.window.showWarningMessage('没有可导出的ER图数据');
            return;
        }
        
        try {
            const uri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(`er-diagram.${format}`),
                filters: {
                    [format.toUpperCase()]: [format]
                }
            });
            
            if (uri) {
                // 发送导出请求到WebView
                this._view?.webview.postMessage({
                    type: 'exportToFile',
                    format: format,
                    path: uri.fsPath
                });
            }
        } catch (error) {
            vscode.window.showErrorMessage(`导出失败: ${error}`);
        }
    }
    
    /**
     * 刷新ER图
     */
    private async _refreshDiagram() {
        try {
            this.showLoading('正在刷新ER图...');
            // 触发重新生成ER图的命令
            await vscode.commands.executeCommand('mybatis-er.generate');
        } catch (error) {
            this.showError(`刷新失败: ${error}`);
        }
    }
    
    /**
     * 搜索实体
     */
    private _searchEntities(query: string) {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'searchResults',
                query: query,
                results: this._performSearch(query)
            });
        }
    }
    
    /**
     * 过滤关系
     */
    private _filterRelations(filter: any) {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'filterResults',
                filter: filter,
                data: this._applyFilter(filter)
            });
        }
    }
    
    /**
     * 执行搜索
     */
    private _performSearch(query: string): EntityInfo[] {
        if (!this._data || !query.trim()) {
            return [];
        }
        
        const lowerQuery = query.toLowerCase();
        return this._data.entities.filter(entity => 
            entity.tableName.toLowerCase().includes(lowerQuery) ||
            entity.className.toLowerCase().includes(lowerQuery) ||
            entity.fields.some(field => 
                field.fieldName.toLowerCase().includes(lowerQuery) ||
                field.columnName.toLowerCase().includes(lowerQuery)
            )
        );
    }
    
    /**
     * 应用过滤器
     */
    private _applyFilter(filter: any): ERDiagramData {
        if (!this._data) {
            return { entities: [], relations: [] };
        }
        
        // 实现过滤逻辑
        let filteredEntities = this._data.entities;
        let filteredRelations = this._data.relations;
        
        if (filter.entityType) {
            filteredEntities = filteredEntities.filter(entity => 
                entity.annotations.some(ann => ann.name === filter.entityType)
            );
        }
        
        if (filter.relationType) {
            filteredRelations = filteredRelations.filter(relation => 
                relation.type === filter.relationType
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
    private _getHtmlForWebview(webview: vscode.Webview): string {
        // 获取资源URI
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));
        const mermaidLoaderUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'mermaid-loader.js'));
        const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
        const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
        const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css'));
        
        // 生成nonce用于安全
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
                
                <title>MyBatis ER 图</title>
            </head>
            <body>
                <!-- 工具栏 -->
                <div class="toolbar">
                    <div class="toolbar-group">
                        <button id="refreshBtn" class="toolbar-btn" title="刷新ER图">
                            <span class="codicon codicon-refresh"></span>
                            刷新
                        </button>
                        <button id="exportBtn" class="toolbar-btn" title="导出ER图">
                            <span class="codicon codicon-export"></span>
                            导出
                        </button>
                    </div>
                    
                    <div class="toolbar-group">
                        <input type="text" id="searchInput" placeholder="搜索实体或字段..." class="search-input">
                        <button id="searchBtn" class="toolbar-btn" title="搜索">
                            <span class="codicon codicon-search"></span>
                        </button>
                    </div>
                    
                    <div class="toolbar-group">
                        <select id="filterSelect" class="filter-select">
                            <option value="">全部关系</option>
                            <option value="one-to-one">一对一</option>
                            <option value="one-to-many">一对多</option>
                            <option value="many-to-one">多对一</option>
                            <option value="many-to-many">多对多</option>
                        </select>
                    </div>
                </div>
                
                <!-- 主要内容区域 -->
                <div class="main-content">
                    <!-- 侧边栏 -->
                    <div class="sidebar">
                        <div class="sidebar-section">
                            <h3>实体列表</h3>
                            <div id="entityList" class="entity-list"></div>
                        </div>
                        
                        <div class="sidebar-section">
                            <h3>关系统计</h3>
                            <div id="relationStats" class="relation-stats"></div>
                        </div>
                    </div>
                    
                    <!-- ER图画布 -->
                    <div class="diagram-container">
                        <div id="loadingIndicator" class="loading-indicator" style="display: none;">
                            <div class="loading-spinner"></div>
                            <div class="loading-text">正在生成ER图...</div>
                        </div>
                        
                        <div id="errorIndicator" class="error-indicator" style="display: none;">
                            <div class="error-icon">⚠️</div>
                            <div class="error-text"></div>
                        </div>
                        
                        <div id="diagramCanvas" class="diagram-canvas"></div>
                    </div>
                </div>
                
                <!-- 导出对话框 -->
                <div id="exportModal" class="modal" style="display: none;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>导出ER图</h3>
                            <button id="closeModal" class="close-btn">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="export-options">
                                <label>
                                    <input type="radio" name="exportFormat" value="png" checked>
                                    PNG 图片
                                </label>
                                <label>
                                    <input type="radio" name="exportFormat" value="svg">
                                    SVG 矢量图
                                </label>
                                <label>
                                    <input type="radio" name="exportFormat" value="pdf">
                                    PDF 文档
                                </label>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button id="confirmExport" class="btn btn-primary">导出</button>
                            <button id="cancelExport" class="btn btn-secondary">取消</button>
                        </div>
                    </div>
                </div>
                
                <script nonce="${nonce}" src="${mermaidLoaderUri}"></script>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
} 