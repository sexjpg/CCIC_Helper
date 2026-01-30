function hoverTip (context, element, content, id = "") {
  // 判断上下文类型并获取相应的document和window对象
  let contextDocument, contextWindow;

  if (context === window || context === document) {
    // 主窗口环境
    contextDocument = document;
    contextWindow = window;
  } else if (context.contentDocument || context.contentWindow) {
    // iframe环境
    contextDocument = context.contentDocument || context.contentWindow.document;
    contextWindow = context.contentWindow;
  } else {
    // 其他情况，默认使用传入的context作为document
    contextDocument = context;
    contextWindow = context.defaultView || context.parentWindow || window;
  }

  let hoverDiv = null;

  // 创建悬浮提示框
  /**
   * 初始化悬浮框DOM元素
   * 设置基础样式和内容
   * @returns {HTMLDivElement} 创建的悬浮框元素
   */
  const createHoverDiv = () => {
    hoverDiv = contextDocument.createElement("div");
    hoverDiv.style.cssText = `
                display:none;
                position:absolute;
                background:#f9f9f9;
                border:1px solid #ddd;
                padding:5px;
                z-index:1000;
                box-shadow:0 0 3px rgba(0,0,0,0.5);
                pointer-events: auto;
                background-color: #ffffae;
            `;
    hoverDiv.innerHTML = content;
    if (id) hoverDiv.id = id;
    contextDocument.body.appendChild(hoverDiv);
    return hoverDiv;
  };

  hoverDiv = createHoverDiv();

  // 统一事件处理器
  /**
   * 鼠标进入基准元素时的处理逻辑
   * 显示悬浮框并计算定位位置
   */
  const handleElementEnter = (event) => {
    // 显示提示框
    hoverDiv.style.display = "block";

    // 定位逻辑
    if (context === window || context === document) {
      // 主窗口环境定位
      hoverDiv.style.left = `${event.clientX + 15}px`;
      hoverDiv.style.top = `${event.clientY}px`;
    } else {
      // iframe环境定位
      const rect = context.getBoundingClientRect();
      const scrollX = contextWindow.scrollX;
      const scrollY = contextWindow.scrollY;
      hoverDiv.style.left = `${event.clientX + scrollX - rect.left + 15}px`;
      hoverDiv.style.top = `${event.clientY + scrollY - rect.top}px`;
    }
  };

  /**
   * 鼠标离开悬浮框时的处理逻辑
   * 隐藏悬浮框
   */
  const handleHoverDivLeave = () => {
    hoverDiv.style.display = "none";
  };

  // 事件监听优化
  // 使用状态标志位解决鼠标在元素与悬浮框之间的过渡闪烁问题
  let isHoveringDiv = false;

  // 元素鼠标事件绑定
  element.addEventListener("mouseenter", handleElementEnter);
  element.addEventListener("mouseleave", () => {
    setTimeout(() => {
      if (!isHoveringDiv) {
        handleHoverDivLeave();
      }
    }, 100);
  });

  // 悬浮框自身鼠标事件绑定
  hoverDiv.addEventListener("mouseenter", () => {
    isHoveringDiv = true;
    hoverDiv.style.display = "block";
  });
  hoverDiv.addEventListener("mouseleave", () => {
    isHoveringDiv = false;
    handleHoverDivLeave();
  });

  // 窗口尺寸变化处理
  // 隐藏悬浮框避免定位错误
  contextWindow.addEventListener("resize", () => {
    hoverDiv.style.display = "none";
  });

  return hoverDiv;
}

export default hoverTip;