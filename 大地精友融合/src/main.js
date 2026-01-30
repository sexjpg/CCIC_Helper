// import { unsafeWindow } from 'vite-plugin-monkey/dist/client';

import IframeMonitor from './core/IframeMonitor.js';
import JY from './core/JingYou.js';




function 显示iframe信息(iframe) {
  console.log('iframe 加载完成:', iframe);
}

function injectJY(iframe) {
    const iframe_names_car = ['CarComponent', 'CarLoss'];
    if (
        iframe.name &&  iframe_names_car.some((str) => iframe.name.includes(str))
    ) {
        console.debug("iframe 加载完成,开始创建精友实例", iframe);
        const jy = new JY(iframe);
        unsafeWindow.jy = jy;
    }
}

function init() {
  const iframeMonitor = new IframeMonitor();
  // iframeMonitor.addHandler(显示iframe信息);
  iframeMonitor.addHandler(injectJY);
  iframeMonitor.monitorIframes();
}

init()