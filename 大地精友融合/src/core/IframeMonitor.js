import {$,$$} from '../utils/index.js'

class IframeMonitor {
    constructor() {
        // 处理函数队列，默认包含 handleifame_events
        this.handlers = [];
        this.observer = null;
        this.observedIframes = new WeakSet();
    }

    // 监控 iframe 的生成和移除
    monitorIframes() {
        const targetNode = document.body;
        const config = { childList: true, subtree: true };
        // const $$ = (selector, context = document) => context.querySelectorAll(selector);


        this.observer = new MutationObserver((mutationsList) => {
            for (const mutation of mutationsList) {
                // 处理新增的节点
                mutation.addedNodes.forEach((node) => {
                    if (node.tagName === "IFRAME") {
                        console.debug("iframe 被添加:", node);
                        this.bindIframeLoadEvent(node);
                    } else if (node.querySelector) {
                        // 检查子节点中的 iframe（例如动态插入的容器）
                        const iframes = $$("iframe", node);
                        iframes.forEach((iframe) => {
                            console.debug("iframe 被添加（嵌套）:", iframe);
                            this.bindIframeLoadEvent(iframe);
                        });
                    }
                });

                // 处理移除的节点
                mutation.removedNodes.forEach((node) => {
                    if (node.tagName === "IFRAME") {
                        console.debug("iframe 被移除:", node);
                    } else if (node.querySelector) {
                        const iframes = $$("iframe", node);
                        iframes.forEach((iframe) => {
                            console.debug("iframe 被移除（嵌套）:", iframe);
                        });
                    }
                });
            }
        });

        this.observer.observe(targetNode, config);

        // ✅ 新增：立即处理页面初始加载时已存在的iframe
        $$("iframe").forEach((iframe) => {
            this.bindIframeLoadEvent(iframe);
        });

        console.debug("开始监控 iframe 的动态生成、移除及加载事件...");
    }

    // 监控 iframe 的加载完成事件
    bindIframeLoadEvent(iframe) {
        if (this.observedIframes.has(iframe)) return; // 避免重复监听
        this.observedIframes.add(iframe);

        // 监听 iframe 的 load 事件
        iframe.addEventListener("load", () => {
            console.debug("iframe 加载完成:", iframe);
            // 执行处理函数队列
            this.executeHandlers(iframe);
        });

        // 检查 iframe 是否已经加载完成（例如缓存导致立即加载）
        if (iframe.contentDocument?.readyState === "complete") {
            console.debug("iframe 已缓存加载完成:", iframe);
            this.executeHandlers(iframe);
        }
    }

    // 异步顺序执行所有处理函数
    async executeHandlers(iframe) {
        for (let i = 0; i < this.handlers.length; i++) {
            try {
                console.debug(`执行处理函数 [${i}]:`, this.handlers[i].name || '匿名函数');
                await this.handlers[i](iframe);
            } catch (error) {
                console.error(`处理函数 [${i}] 执行失败:`, error);
                // 继续执行下一个处理函数
            }
        }
    }


    // 默认的处理函数
    /**
 * 检测 iframe 内是否包含 jQuery 或其他常用库/方法
 * @param {HTMLIFrameElement} iframe - 要检测的 iframe 元素
 */
    detectIframeLibraries(iframe) {
        try {
            const iframeWindow = iframe.contentWindow;

            // 检测 jQuery
            const hasJQuery = typeof iframeWindow.jQuery !== 'undefined' ||
                typeof iframeWindow.$ !== 'undefined';

            // 检测其他常用库
            const libraries = {
                lodash: typeof iframeWindow._ !== 'undefined',
                moment: typeof iframeWindow.moment !== 'undefined',
                vue: typeof iframeWindow.Vue !== 'undefined',
                react: typeof iframeWindow.React !== 'undefined',
                angular: typeof iframeWindow.angular !== 'undefined',
                underscore: typeof iframeWindow._ !== 'undefined' && !iframeWindow._.noConflict,
                axios: typeof iframeWindow.axios !== 'undefined',
                // 可以根据需要添加更多库
            };

            // 检测特定方法
            const hasMethods = {
                $: typeof iframeWindow.$ === 'function',
                jQuery: typeof iframeWindow.jQuery === 'function',
                getElementById: typeof iframeWindow.document?.getElementById === 'function',
                querySelector: typeof iframeWindow.document?.querySelector === 'function'
            };

            console.debug(`iframe 库检测结果 [${iframe.name || '无名'}]:`, {
                hasJQuery,
                libraries,
                hasMethods
            });

            // 可根据检测结果执行特定操作
            if (hasJQuery) {
                console.log(`检测到 jQuery，版本: ${iframeWindow.jQuery.fn.jquery || '未知'}`);
            }

            // 返回检测结果
            return {
                iframeName: iframe.name,
                hasJQuery,
                libraries,
                hasMethods
            };
        } catch (error) {
            // 跨域 iframe 会抛出安全错误
            console.warn(`无法完全检测 iframe [${iframe.name || '无名'}] 内容 (可能跨域):`, error);
            return {
                iframeName: iframe.name,
                error: '跨域限制',
                partialInfo: {
                    iframeSrc: iframe.src
                }
            };
        }
    }

    // 添加处理函数
    addHandler(handler) {
        if (typeof handler !== 'function') {
            console.error('添加失败: handler 必须是函数');
            return false;
        }
        this.handlers.push(handler.bind(this));
        console.debug(`已添加处理函数，当前队列长度: ${this.handlers.length}`);
        return true;
    }

    // 删除处理函数（通过索引或函数引用）
    removeHandler(handlerOrIndex) {
        if (typeof handlerOrIndex === 'number') {
            // 通过索引删除
            if (handlerOrIndex >= 0 && handlerOrIndex < this.handlers.length) {
                const removed = this.handlers.splice(handlerOrIndex, 1);
                console.debug(`已删除索引 [${handlerOrIndex}] 的处理函数`);
                return true;
            }
        } else if (typeof handlerOrIndex === 'function') {
            // 通过函数引用删除
            const index = this.handlers.indexOf(handlerOrIndex);
            if (index !== -1) {
                this.handlers.splice(index, 1);
                console.debug(`已删除处理函数，当前队列长度: ${this.handlers.length}`);
                return true;
            }
        }
        console.error('删除失败: 未找到指定的处理函数');
        return false;
    }

    // 重置处理函数队列（恢复为只包含默认处理函数）
    resetHandlers() {
        this.handlers = [];
        console.debug('已重置处理函数队列');
    }

    // 清空所有处理函数
    clearHandlers() {
        this.handlers = [];
        console.debug('已清空所有处理函数');
    }

    // 获取当前处理函数列表
    getHandlers() {
        return [...this.handlers];
    }

    // 停止监控
    stopMonitoring() {
        if (this.observer) {
            this.observer.disconnect();
            console.debug('已停止 iframe 监控');
        }
    }
}

export default IframeMonitor;