class Modal {
    constructor(options = {}) {
        // 合并配置
        this.config = {
            miniIcon_text: '🎛️',
            title: '悬浮窗',
            x: 100,
            y: 100,
            bx: 1,
            by: 100,
            content: null,
            element: null,
            iframe: document,
            isdblclick: true,
            ...options
        };

        // 初始化状态
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.initialX = 0;
        this.initialY = 0;

        // 初始化 DOM 元素
        this.iframe = this.config.iframe || document;
        this.iframeDocument = this.iframe.contentDocument || this.iframe.contentWindow?.document || document;

        this._createElements();
        this._bindEvents();
    }

    _createElements() {
        // 创建主容器
        this.floatDiv = this.iframeDocument.createElement('div');
        this.floatDiv.style.cssText = `
        position: fixed;
        background: white;
        border: 1px solid #ccc;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        min-width: 200px;
        min-height: 100px;
        max-width: 90vw;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        resize: both;
        overflow: auto;
        z-index: 9999;
      `;

        // 创建标题栏
        this.titleBar = this.iframeDocument.createElement('div');
        this.titleBar.style.cssText = `
        background:rgba(1, 158, 248, 0.26);
        padding: 1px;
        cursor: move;
        display: flex;
        justify-content: space-between;
        align-items: center;
        user-select: none;
      `;

        // 标题文字
        this.titleText = this.iframeDocument.createElement('span');
        this.titleText.textContent = this.config.title;

        // 关闭按钮
        this.closeBtn = this.iframeDocument.createElement('button');
        this.closeBtn.textContent = '×';
        this.closeBtn.style.cssText = `
        background: none;
        border: none;
        font-size: 15px;
        cursor: pointer;
        padding: 0 6px;
        background: rgba(241, 34, 19, 0.72);
        border-radius: 50%;
      `;

        // 内容容器
        this.contentContainer = this.iframeDocument.createElement('div');
        this.contentContainer.style.cssText = `
        flex: 1;
        overflow: auto;
        padding: 8px;
      `;

        // 组装元素
        this.titleBar.appendChild(this.titleText);
        this.titleBar.appendChild(this.closeBtn);
        this.floatDiv.appendChild(this.titleBar);
        this.floatDiv.appendChild(this.contentContainer);
        this.iframeDocument.body.appendChild(this.floatDiv);

        // 初始位置
        this.floatDiv.style.left = `${this.config.x}px`;
        this.floatDiv.style.top = `${this.config.y}px`;

        // 创建迷你图标（无 element 时）
        if (!this.config.element) {
            this.miniIcon = this.iframeDocument.createElement('div');
            this.miniIcon.style.cssText = `
          position: fixed;
          left: ${this.config.bx}px;
          top: ${this.config.by}px;
          width: 20px;
          height: 20px;
          font-size: 15px;
          background: #f0f0f0;
          border: 1px solid #ccc;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        `;
            this.miniIcon.textContent = `${this.config.miniIcon_text}`;
            this.iframeDocument.body.appendChild(this.miniIcon);
        }

        // 初始化显示状态
        this.floatDiv.style.display = 'none';
        if (this.miniIcon) this.miniIcon.style.display = 'block';

        // 绑定元素交互
        if (this.config.element) {
            this.config.element.style.cssText = `
          cursor: pointer;
          user-select: none;
        `;
            const isdblclick = this.config.isdblclick ? 'dblclick' : 'click';
            this.config.element.addEventListener(isdblclick, () => this.show());
        }

        // 初始化内容
        if (this.config.content) {
            this.contentContainer.appendChild(this.config.content);
        }
    }

    _bindEvents() {
        // 拖动事件
        this.titleBar.addEventListener('mousedown', (e) => this._startDrag(e));
        this.iframeDocument.addEventListener('mousemove', (e) => this._drag(e));
        this.iframeDocument.addEventListener('mouseup', () => this._endDrag());

        // 关闭按钮
        this.closeBtn.addEventListener('click', () => this.hide());

        // 迷你图标切换
        if (this.miniIcon) {
            this.miniIcon.addEventListener('click', () => this.toggleVisibility());
        }
    }

    // 拖动方法
    _startDrag(e) {
        this.isDragging = true;
        this.startX = e.clientX;
        this.startY = e.clientY;
        this.initialX = parseFloat(this.floatDiv.style.left);
        this.initialY = parseFloat(this.floatDiv.style.top);
    }

    _drag(e) {
        if (!this.isDragging) return;
        const dx = e.clientX - this.startX;
        const dy = e.clientY - this.startY;
        this.floatDiv.style.left = `${this.initialX + dx}px`;
        this.floatDiv.style.top = `${this.initialY + dy}px`;
    }

    _endDrag() {
        this.isDragging = false;
    }

    // 公共方法
    toggleVisibility() {
        const shouldShow = this.floatDiv.style.display === 'none';
        this.floatDiv.style.display = shouldShow ? 'block' : 'none';
        if (this.miniIcon) this.miniIcon.style.display = shouldShow ? 'none' : 'block';
    }

    setContent(element) {
        this.contentContainer.innerHTML = '';
        this.contentContainer.appendChild(element);
    }

    show() {
        this.floatDiv.style.display = 'block';
        if (this.miniIcon) this.miniIcon.style.display = 'none';
    }

    hide() {
        this.floatDiv.style.display = 'none';
        if (this.miniIcon) this.miniIcon.style.display = 'block';
    }

    close() {
        this.floatDiv.remove();
        if (this.miniIcon) this.miniIcon.remove();
        if (this.config.element) {
            this.config.element.style.cssText = '';
            this.config.element.removeEventListener('dblclick', () => this.show());
        }
    }
}
export default Modal;