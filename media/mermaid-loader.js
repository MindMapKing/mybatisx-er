// Mermaid.js 动态加载器
// 由于VS Code WebView的安全限制，我们需要动态加载Mermaid库

(function() {
    'use strict';
    
    // 检查是否已经加载
    if (window.mermaid) {
        console.log('Mermaid already loaded');
        return;
    }
    
    // 创建script标签加载Mermaid
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js';
    script.onload = function() {
        console.log('Mermaid loaded successfully');
        
        // 初始化Mermaid
        if (window.mermaid) {
            window.mermaid.initialize({
                startOnLoad: false,
                theme: 'default',
                securityLevel: 'loose',
                er: {
                    diagramPadding: 20,
                    layoutDirection: 'TB',
                    minEntityWidth: 100,
                    minEntityHeight: 75,
                    entityPadding: 15,
                    stroke: 'gray',
                    fill: 'honeydew',
                    fontSize: 12
                }
            });
            
            // 触发自定义事件通知主脚本
            window.dispatchEvent(new CustomEvent('mermaidLoaded'));
        }
    };
    
    script.onerror = function() {
        console.error('Failed to load Mermaid from CDN');
        
        // 如果CDN加载失败，使用降级方案
        console.log('Using fallback rendering mode');
        window.dispatchEvent(new CustomEvent('mermaidLoadFailed'));
    };
    
    // 添加到head
    document.head.appendChild(script);
})(); 