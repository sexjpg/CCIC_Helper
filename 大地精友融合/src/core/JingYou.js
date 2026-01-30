import { $, $$, hoverTip } from "../utils/index.js";
import Modal from "../common/Modal.js";
import elmGetter from "../utils/elmGetter.js";
// import { GM_notification, GM_xmlhttpRequest,unsafeWindow } from 'vite-plugin-monkey/dist/client';

class JY {

    constructor(iframe) {
        this.iframe = iframe;
        this.Modal = null;       // 类属性，初始化为 null

        if (this.iframe.src.includes('from=TaskToDo')) {
            this.initialization()
        }
        else {
            this.iframe.contentDocument.addEventListener('keydown', (event) => { // 建议使用 keydown 事件来监听组合键
                // 检查 Alt 键是否被按下以及按下的键是否是 'q' 或 'W'
                if (event.altKey && (event.key === 'j' || event.key === 'J')) {
                    event.preventDefault(); // 可选：阻止浏览器的默认行为，例如某些浏览器可能有 Alt+Q 的快捷键
                    this.initialization()
                }
            });
        }


    }

    // 获取精友定损链接
    async initialization() {
        const contentDocument = this.iframe.document || this.iframe.contentDocument || this.iframe.contentWindow.document;
        const $ = (selector, context = contentDocument) => context.querySelector(selector);


        const data = {
            'registNo': $("#bpmPage_registNo").value,
            'userCode': $("#bpmPage_userCode").value,
            'userName': $("#bpmPage_userName").value,
            'comCode': $("#bpmPage_comCode").value,
            'comCName': $("#bpmPage_comCName").value,
            'itemId': $("#bpmPage_itemId").value,
            'businessKey': $("#bpmPage_businessKey").value
        };
        const url_JYVerify = "/claim/approvalLossController.do?goVerifyRequestFromJY";
        return await fetch(url_JYVerify, {
            method: 'POST',
            body: new URLSearchParams(data).toString(),
            headers: {
                'Content-Type': "application/x-www-form-urlencoded"
            }
        }).then(response => response.json())
            .then(jsondata => {
                if (jsondata.success) {
                    const url = jsondata.obj;
                    this.accessurl = url
                    const host_match = url.match(/^https?:\/\/[^\/]+/);
                    this.homeurl = host_match ? host_match[0] : null;
                    const urlObj = new URL(url);
                    const params = new URLSearchParams(urlObj.search);
                    this.accesstoken = params.get('fileName') || null;
                    this.host = urlObj.hostname || null;
                }
            })
            .then(() => {
                this.creatJYlink()
            })
            .then(() => {
                elmGetter.get('a[href="#carLossApproval_div"]', this.iframe.contentDocument).then(async (elm) => {
                    elm?.click();
                });
            })
            .then(async () => {
                return await this.checktoken()
            })
            .then(async () => {
                GM_notification(jy.car.modelName, '精友初始化成功', jy.car.carImgPath)
                this.createSearchtool()
            })
            .then(async () => {
                this.addapprovetips()
                this.insert2cell();
                this.iframe.contentDocument.addEventListener('mouseup', this.CreatSelectedText.bind(this));
                this.iframe.contentDocument.addEventListener('keydown', (event) => { // 建议使用 keydown 事件来监听组合键
                    // 检查 Alt 键是否被按下以及按下的键是否是 'q' 或 'Q'
                    if (event.altKey && (event.key === 'q' || event.key === 'Q')) {
                        event.preventDefault(); // 可选：阻止浏览器的默认行为，例如某些浏览器可能有 Alt+Q 的快捷键
                        this.insert2cell();
                    }
                });
            })


    }

    async checktoken(url = this.accessurl) {
        if (this.init) return this.init
        return await this.fetch(url)
            .then((res) => {
                console.debug('精友请求链接结果', res);

                // this.isSearchBarExpanded = true; 
                // this.icon.style.backgroundColor = res.ok ? '#4CAF50;' : '#e8470cff;';
                // return res.ok;
            })
            .then(() => {
                const url_ApproveInfo = `${jy.homeurl}//ClaimCloudProd/approve/getApproveInfo`
                return this.fetch(url_ApproveInfo)
                    .then(res => res.json())
                    .then(res => {
                        // console.log('精友定损信息', res);
                        if (res.code == 0) {
                            this.approveInfo = res.result;
                            this.car = res.result.car;
                            this.init = true
                        }

                    })
            })

    }

    //创建打开定损平台的链接
    creatJYlink(url = this.accessurl) {
        const jyNew = $("#jyNew", this.iframe.contentDocument);
        console.debug('检测精友定损按钮', jyNew);
        if (jyNew) return;


        const button = document.createElement("button");
        button.innerText = "精友平台";
        button.id = 'GMjyNew';
        button.className = 'btn btn-default';
        button.onclick = function () { window.open(url, 'jyNew'); }
        const container = $('#tools.btn-toolbar div.btn-group.pull-right', this.iframe.contentDocument);
        if (container) { container.appendChild(button); }


    }


    async _partQuery(kw = '', ext = 0) {
        if (!kw) {
            return { code: 300, message: '零件名称不可以为空', result: [] };
        }
        const queryurl = `${this.homeurl}/ClaimCloudProd/partQuery/getPartListForName`;
        const headers = {
            'Content-Type': `text/plain;charset=UTF-8`,
            'Accesstoken': `${this.accesstoken}`
        };
        const postdata = {
            customerFlag: ext,
            partName: kw,
            standPartSearch: ext,
            isFlooded: 0
        }

        return await this.fetch(queryurl, postdata, {}, headers).then((resp) => resp.json())

    }

    async _partQuery_Replacedpart(kw = '', ext = 0) {
        if (!kw) {
            return { code: 300, message: '零件名称不可以为空', result: [] };
        }
        const queryurl = `${this.homeurl}/ClaimCloudProd/partQuery/getReplacePartListForPart`;
        const headers = {
            'Content-Type': `text/plain;charset=UTF-8`,
        };
        const postdata = {
            priceType: '',
            evalComCode: this.approveInfo.car.evalComCode,
            brandCode: this.approveInfo.car.brandCode,
            factPartCode: kw
        }

        return await this.fetch(queryurl, postdata, {}, headers).then((resp) => resp.json())

    }

    async _getPartPicture(partitem) {
        const queryurl = `${this.homeurl}/ClaimCloudProd/partQuery/getPartPicture`;
        const postdata = {
            groupId: this.approveInfo.car.groupId,
            modelId: this.approveInfo.car.modelId,
            brandCode: this.approveInfo.car.brandCode,
            partGroupId: partitem.partGroupId,
            factPartId: partitem.factPartId,
            evalId: this.approveInfo.evalRepair.evalId,
            evalComCode: this.approveInfo.car.evalComCode,
            carTypeCode: this.approveInfo.car.carTypeCode,
        }
        if (partitem.picNo) { postdata.picNo = partitem.picNo }

        function getPicData(result) {
            const picData = {}
            //默认取第一个结果作为默认图片
            picData.imageSerialNo = result.partPicHotspotList[0].imageSerialNo
            picData.partPicPath = result.partPicHotspotList[0].partPicPath
            picData.partName = partitem.partName
            picData.factPartName = partitem.factPartName
            picData.partRemark = partitem.partRemark ? partitem.partRemark : ''
            //还要继续其他情况去修改imageSerialNo,partPicPath
            if (result.picUrl != null) {
                console.debug('picUrl', result.picUrl)
                picData.partPicPath = result.picUrl
                let orderNo
                const partPicHotspots = result.partPicHotspotList

                for (let i = 0; i < partPicHotspots.length; i++) {
                    if (partPicHotspots[i].factPartId == partitem.factPartId) {
                        orderNo = partPicHotspots[i].orderNo
                        picData.imageSerialNo = partPicHotspots[i].orderNo
                        break
                    }
                }

                //新增返回列表:partPicHotspots,图片内部零件信息
                picData.partPicHotspots = partPicHotspots

            }
            return picData
        }

        return await this.fetch(queryurl, postdata, {}).then((resp) => resp.json())
            .then((json) => {
                if (json.code == 0) {
                    const result = json.result
                    const picData = getPicData(result)
                    console.debug('图片数据', picData)
                    return picData
                }
            });

    }


    // 创建结果表格,返回表格
    createresult_table(items, options = { infotag: true }) {
        //中文表头,有新字段可以添加,不一定显示
        const header_zh = {
            partName: '配件名称', factPartName: '原厂名称', partRemark: '备注',
            factPartCode: '零件号', guidePrice: '厂方指导价', marketPrice: '市场价',
            referencePrice: '参考价', brandPrice: '品牌价', dadiBrandPrice: `大地价`,
            marketRefPrice: `原厂价(大地)`, orderNo: '图片序号'
        }
        console.debug(`创建结果表格`, items)

        // 可配置的表头字段
        let headers = ['partName', 'partRemark', `factPartCode`, 'guidePrice', 'brandPrice', `dadiBrandPrice`, 'marketPrice', 'marketRefPrice'];

        if (options.headers) { headers = [...options.headers] }

        // 创建表格
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';

        // 创建表头
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');

        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header_zh[header];
            th.style.border = '1px solid #ddd';
            th.style.padding = '8px';
            th.style.backgroundColor = '#f5f5f5';
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        // 创建表格内容
        const tbody = document.createElement('tbody');

        items.forEach(item => {
            const row = document.createElement('tr');
            const infobar = this.createInfobar(item);
            headers.forEach(header => {
                const cell = document.createElement('td');

                const value = item[header] !== undefined ? item[header] : '-';
                if (header == 'partName') {
                    cell.title = `${item.factPartName ? item.factPartName : ''} ${item.partRemark ? item.partRemark : ''}`;
                }

                // 为单元格添加悬停提示
                const cellContent = document.createElement('div');
                cellContent.textContent = value;


                cell.appendChild(cellContent);
                if (header == 'partName' && options.infotag) { cell.appendChild(infobar) }
                cell.style.border = '1px solid #ddd';
                cell.style.padding = '6px';
                row.appendChild(cell);
            });

            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        return table;
    }


    createImagePreview(picdata) {
        const iframeDocument = this.iframe.contentDocument || this.iframe.contentWindow.document;

        // 创建遮罩层
        const overlay = iframeDocument.createElement('div');
        overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    z-index: 99999;
    display: flex;
    justify-content: center;
    align-items: center;
`;

        // 创建主容器（用于包裹图片和表格）
        const mainContainer = iframeDocument.createElement('div');
        mainContainer.style.cssText = `
    display: flex;
    flex-direction: row;
    max-width: 95vw;
    max-height: 95vh;
    background: white;
    border-radius: 8px;
    overflow: hidden;
`;

        // 创建图片预览区域容器
        const imageContainerWrapper = iframeDocument.createElement('div');
        imageContainerWrapper.style.cssText = `
    flex: 1;
    display: flex;
    flex-direction: column;
    max-width: 60vw;
    max-height: 90vh;
    border-right: 1px solid #ddd;
`;

        // 创建标题栏
        const titleBar = iframeDocument.createElement('div');
        titleBar.textContent = `${picdata.partName}(${picdata.factPartName};${picdata.partRemark}) 图片编号:${picdata.imageSerialNo}`;
        titleBar.style.cssText = `
    padding: 8px 12px;
    background: #f0f0f0;
    font-weight: bold;
    border-bottom: 1px solid #ddd;
`;

        // 创建图片容器
        const imageContainer = iframeDocument.createElement('div');
        imageContainer.style.cssText = `
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 10px;
    overflow: auto;
    cursor: grab;
    min-width: 100%;
    min-height: 100%;
`;

        // 创建图片元素
        const img = iframeDocument.createElement('img');
        img.src = picdata.partPicPath;
        img.style.cssText = `
        max-width: 100%;
        max-height: 100%;
        transition: transform 0.2s ease, transform-origin 0.2s ease;
        cursor: zoom-in;
        user-select: none;
        transform-origin: 1% 1%; /* 初始缩放原点 默认10%*/
    `;
        // img.style.cssText = `
        //     max-width: 100%;
        //     max-height: 100%;
        //     transition: transform 0.2s ease, transform-origin 0.2s ease; /* 添加transform-origin过渡 */
        //     cursor: zoom-in;
        //     user-select: none;
        // `;

        // 新增拖拽功能
        let isDragging = false;
        let dragStartX = 0;
        let dragStartY = 0;
        let scrollLeft = 0;
        let scrollTop = 0;

        // 鼠标按下事件（左键、中键）
        const startDragging = (e) => {
            // 仅允许左键（0）和中键（1）拖拽
            if (e.button !== 0 && e.button !== 1) return;
            e.preventDefault();

            isDragging = true;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            scrollLeft = imageContainer.scrollLeft;
            scrollTop = imageContainer.scrollTop;

            // 改变光标样式
            img.style.cursor = 'grabbing';
            imageContainer.style.cursor = 'grabbing';
        };

        // 鼠标移动事件
        const drag = (e) => {
            if (!isDragging) return;
            e.preventDefault();

            const x = e.clientX;
            const y = e.clientY;
            const deltaX = x - dragStartX;
            const deltaY = y - dragStartY;

            imageContainer.scrollLeft = scrollLeft - deltaX;
            // imageContainer.scrollTop = deltaY - dragStartY;
            imageContainer.scrollTop = scrollTop - deltaY;

        };

        // 鼠标释放事件
        const stopDragging = () => {
            if (!isDragging) return;
            isDragging = false;

            // 恢复光标样式
            img.style.cursor = 'zoom-in';
            imageContainer.style.cursor = 'grab';
        };

        // 添加事件监听器
        img.addEventListener('mousedown', startDragging);
        iframeDocument.addEventListener('mousemove', drag);
        iframeDocument.addEventListener('mouseup', stopDragging);
        iframeDocument.addEventListener('mouseleave', stopDragging);

        // 添加滚轮缩放事件
        let scale = 1;
        // 修改滚轮缩放事件处理
        // img.addEventListener('wheel', (e) => {
        //     e.preventDefault();

        //     // 获取鼠标在图片上的位置
        //     const rect = img.getBoundingClientRect();
        //     const x = e.clientX - rect.left;
        //     const y = e.clientY - rect.top;

        //     // 计算缩放原点百分比
        //     const originX = (x / img.offsetWidth) * 100;
        //     const originY = (y / img.offsetHeight) * 100;

        //     // 设置动态缩放原点
        //     img.style.transformOrigin = `${originX}% ${originY}%`;

        //     // 调整缩放比例
        //     if (e.deltaY < 0) {
        //         scale += 0.1;
        //     } else {
        //         scale -= 0.1;
        //         if (scale < 0.5) scale = 0.5;
        //     }

        //     img.style.transform = `scale(${scale})`;
        //     img.style.cursor = scale > 1 ? 'zoom-out' : 'zoom-in';
        // });
        img.addEventListener('wheel', (e) => {
            e.preventDefault();

            // 固定缩放原点为左上10%位置
            img.style.transformOrigin = '10% 10%';

            // 调整缩放比例
            if (e.deltaY < 0) {
                scale += 0.1;
            } else {
                scale -= 0.1;
                if (scale < 0.5) scale = 0.5;
            }

            img.style.transform = `scale(${scale})`;
            img.style.cursor = scale > 1 ? 'zoom-out' : 'zoom-in';
        });


        // 如果有热点数据，创建表格
        let table = null;
        if (picdata.partPicHotspots && picdata.partPicHotspots.length > 0) {
            const items = picdata.partPicHotspots;
            table = this.createresult_table(items, {
                infotag: false,
                headers: ['orderNo', 'partName', 'partRemark', 'factPartCode', 'guidePrice']
            });

            // 设置表格容器样式
            if (table) {
                const result_container = iframeDocument.createElement('div');
                result_container.style.cssText = `
                flex: 1;
                max-width: 40vw;
                max-height: 90vh;
                overflow: auto;
                border-left: 1px solid #ddd;
            `;
                result_container.appendChild(table);
                mainContainer.appendChild(result_container);
            }
        }

        // 组装图片区域DOM结构
        imageContainer.appendChild(img);
        imageContainerWrapper.appendChild(titleBar);
        imageContainerWrapper.appendChild(imageContainer);
        mainContainer.appendChild(imageContainerWrapper);

        // 添加点击关闭事件
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });

        // 将主容器添加到遮罩层
        overlay.appendChild(mainContainer);
        iframeDocument.body.appendChild(overlay);
    }


    createSearchtool() {
        const Searchtool = {}
        this.Searchtool = Searchtool
        const iframeDocument = this.iframe.contentDocument || this.iframe.contentWindow.document;

        const containerId = "JYSearchtool";
        const searchtool = iframeDocument.createElement('div');
        searchtool.id = containerId;
        searchtool.style.cssText = `
                background: white;
                border: 1px solid #ddd;
                padding: 8px;
                box-shadow: 0 0 5px rgba(0,0,0,0.2);
                width: auto;
                height: auto;
                `

        const icon = iframeDocument.createElement('label');
        icon.textContent = '🔎';
        icon.style.cssText = `
                font-size: 18px;
            `;
        // 创建输入框
        const input_kw = iframeDocument.createElement('input');
        input_kw.type = 'text';
        input_kw.placeholder = '零件名称';
        input_kw.style.cssText = `
                margin-right: 5px;
                padding: 4px 8px;
                border: 1px solid #ccc;
                border-radius: 4px;
                width: 150px;
            `;

        const checkbox_ext = iframeDocument.createElement('input');
        checkbox_ext.type = 'checkbox';
        checkbox_ext.style.marginRight = '4px';
        checkbox_ext.title = '扩展查询';

        const btn_serch = iframeDocument.createElement('button');
        btn_serch.textContent = '🔍';
        btn_serch.style.cssText = `
            padding: 4px 4px;
            font-size: 18px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 12px;
            cursor: pointer;
            `;

        const barContainer = iframeDocument.createElement('div');
        barContainer.id = 'barContainer';
        barContainer.style.cssText = `
                border: 1px solid #ddd;
                border-radius: 4px;
                background: #f9f9f9;
                display: flex;
                flex-direction: row;
                align-items: center;
                flex-wrap: nowrap;
            `;

        const resultContainer = iframeDocument.createElement('div');
        resultContainer.id = 'resultContainer';
        resultContainer.style.cssText = `
                margin-top: 8px;
                border-radius: 4px;
                background: #f9f9f9;
                overflow-y: auto;
                clear: both; /* 确保在下一行显示 */
            `;
        barContainer.appendChild(icon);
        barContainer.appendChild(input_kw);
        barContainer.appendChild(checkbox_ext);
        barContainer.appendChild(btn_serch);
        searchtool.appendChild(barContainer)
        searchtool.appendChild(resultContainer)
        Searchtool.barContainer = barContainer;
        Searchtool.icon = icon;
        Searchtool.input_kw = input_kw;
        Searchtool.checkbox_ext = checkbox_ext;
        Searchtool.btn_serch = btn_serch;
        Searchtool.resultContainer = resultContainer;
        Searchtool.searchtool = searchtool




        btn_serch.addEventListener('click', () => {
            doserach()
        });

        // 新增回车键搜索功能
        input_kw.addEventListener('keypress', (event) => {
            if (event.keyCode === 13) { // 回车键
                doserach()
            }
        });



        const doserach = () => {  // 使用箭头函数，继承外层 this
            const kw = Searchtool.input_kw.value.trim();
            const ext = Searchtool.checkbox_ext.checked ? 1 : 0;
            this._partQuery(kw, ext).then(response => {
                console.log('续写后面的流程', response);
                const table = this.createresult_table(response.result);
                Searchtool.resultContainer.innerHTML = '';
                Searchtool.resultContainer.appendChild(table);
            });
        };

        const JYModal_config = {
            miniIcon_text: '🎈',
            title: '精友查询',
            content: Searchtool.searchtool,
            iframe: this.iframe,
            isdblclick: false
        }
        this.Modal = new Modal(JYModal_config);

    }

    /**
 * 创建 infobar 元素
 * @param {Object} item - 零件数据对象
 * @param {Document} iframeDocument - iframe 的 document 对象
 * @returns {HTMLDivElement} 创建的 infobar 元素
 */
    createInfobar(item) {
        const cssText = {}
        cssText.Tag = 'color: white; padding: 2px 5px; border-radius: 3px; cursor: default;'
        const iframeDocument = this.iframe.contentDocument || this.iframe.contentWindow.document;
        const infobar = iframeDocument.createElement('div');
        infobar.style.cssText = 'display: inline-flex; align-items: center; gap: 5px;';
        infobar.setAttribute('name', 'JYpartinfobar');

        // 存在替换配件: isReplaced == '1'
        if (item.isReplaced === '1') {
            const replacedTag = iframeDocument.createElement('span');
            replacedTag.textContent = '替';
            replacedTag.title = '替换件';
            replacedTag.style.cssText = cssText.Tag;
            replacedTag.style.background = 'blue';
            infobar.appendChild(replacedTag);
        }

        // 精准点选: matchType === '1'
        if (item.matchType === '1') {
            const matchTypeTag = iframeDocument.createElement('span');
            matchTypeTag.textContent = '精准';
            matchTypeTag.title = '精准点选';
            //底色为紫色
            // matchTypeTag.style.cssText = 'background: purple ; color: white; padding: 2px 5px; border-radius: 3px; cursor: default;';
            matchTypeTag.style.cssText = cssText.Tag;
            matchTypeTag.style.background = 'purple';
            infobar.appendChild(matchTypeTag);
        }
        // 高价值配件: ifWading == '0'
        else if (item.ifWading === '0') {
            const highValueTag = iframeDocument.createElement('span');
            highValueTag.textContent = '高';
            highValueTag.title = '高价值';
            highValueTag.style.cssText = cssText.Tag;
            highValueTag.style.background = 'red';
            // highValueTag.style.cssText = 'background: red; color: white; padding: 2px 5px; border-radius: 3px; cursor: default;';
            infobar.appendChild(highValueTag);
        }


        // 零件图: factPartId 和 partGroupId 都不为空
        // 如果hasPartPic == '0'也没有图片?待确定
        if (item.factPartId && item.partGroupId) {
            const pictureTag = iframeDocument.createElement('span');
            pictureTag.textContent = '图';
            pictureTag.style.cssText = cssText.Tag;
            pictureTag.style.background = 'green';

            if (item.hasPartPic && item.hasPartPic == '0') {
                pictureTag.textContent = '无图?';
            }
            pictureTag.addEventListener('click', async () => {
                try {
                    const picData = await this._getPartPicture(item);

                    this.createImagePreview(picData);
                } catch (error) {
                    console.error('获取图片失败:', error);
                }
            });
            pictureTag.style.cursor = 'pointer';
            infobar.appendChild(pictureTag);
        }

        return infobar;
    }


    /**
 * 发起网络请求的静态方法，支持多种数据格式和自定义配置
 * @param {string} url - 请求的目标URL（必填）
 * @param {Object|string} [data=""] - 需要发送的表单数据（可选）
 * @param {Object} [json=""] - 需要发送的JSON数据（可选）
 * @param {Object} [headers={}] - 自定义请求头配置（可选）
 * @returns {Promise<Object>} 返回包含响应数据的Promise对象，解析后获得：
 *  - {boolean} ok - 请求是否成功（状态码2xx）
 *  - {number} status - HTTP状态码
 *  - {Function} json() - 解析响应为JSON对象
 *  - {Function} text() - 解析响应为文本字符串
 *  - {Function} blob() - 解析响应为Blob对象
 *  - {Function} html() - 解析响应为HTML文档
 */
    async fetch(url, data = "", json = "", headers = {}) {
        // 构建请求配置对象
        const options = {
            method: data || json ? "POST" : "GET",
            headers: {
                ...headers,
                'Accesstoken': `${this.accesstoken}`,
                "Content-Type": data
                    ? "application/x-www-form-urlencoded"
                    : json
                        ? "application/json;charset=UTF-8"
                        : "text/plain"
            },
            data: data ? new URLSearchParams(data).toString() : null,
            json: json ? JSON.stringify(json) : null,
            timeout: 10000
        };

        console.debug('精友调试:fetch', `url:${url}`, `options:`, options);

        // 创建并返回Promise封装的GM_xmlhttpRequest请求
        return new Promise((resolve, reject) => {
            // 配置并发起原生GM_xmlhttpRequest请求
            GM_xmlhttpRequest({
                method: options.method,
                url,
                headers: options.headers,
                data: options.data || options.json,
                // 处理成功响应
                onload: async (response) => {
                    try {
                        // 解析响应头中的Content-Type
                        const contentType = response.responseHeaders
                            .split('\n')
                            .find(header => header.toLowerCase().startsWith('content-type'));

                        // 构建标准化的响应对象
                        const mockResponse = {
                            ok: response.status >= 200 && response.status < 300,
                            status: response.status,
                            statusText: response.statusText,
                            url: response.finalUrl,
                            json: () => JSON.parse(response.responseText),
                            text: () => response.responseText,
                            blob: () => new Blob([response.response]),
                            html: () => new DOMParser().parseFromString(response.responseText, "text/html")
                        };
                        console.debug('精友调试:fetch', `response:`, mockResponse);
                        resolve(mockResponse);
                    } catch (error) {
                        reject(new Error(`Response parsing failed: ${error.message}`));
                    }
                },
                // 处理网络请求错误
                onerror: (error) => {
                    reject(new Error(`GM_xmlhttpRequest failed: ${error.statusText}`));
                },
                // 处理请求超时
                ontimeout: () => {
                    reject(new Error('Request timed out'));
                },
                timeout: options.timeout
            });
        });
    }

    /**
 * 将毫秒级时间戳转换为格式化的日期时间字符串。
 *
 * @param {number} timestamp 毫秒级时间戳 (例如: 1755614553000)
 * @returns {string} 格式化的日期时间字符串 (例如: "2025-11-05 00:02:33")
 */
    TS2DT(timestamp) {
        // 创建一个Date对象
        // JavaScript的Date对象构造函数直接接受毫秒级时间戳
        const date = new Date(timestamp);

        // 获取年、月、日、时、分、秒
        const year = date.getFullYear();
        // 月份从0开始 (0-January, 11-December), 所以需要加1
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const seconds = date.getSeconds();

        // 辅助函数：确保数字是两位数，不足补零
        const padZero = (num) => String(num).padStart(2, '0');

        // 格式化输出为 YYYY-MM-DD HH:mm:ss 格式
        // 这个格式是当前浏览器/Node.js运行环境的本地时间
        return `${year}-${padZero(month)}-${padZero(day)} ${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}`;
    }


    insert2cell(iframe = this.iframe) {

        const contentDocument = iframe.document || iframe.contentDocument || iframe.contentWindow.document;
        const trs = contentDocument.querySelectorAll('#UIPrpLComponent_add_orderProduct_table tr');
        const jyitems = this.approveInfo.partList
        if (trs.length == 0 || jyitems.length == 0) return;


        for (let i = 0; i < trs.length; i++) {

            //作用域是每行第2列'
            const td = trs[i].cells[1];
            const JYpartinfobar = $('div[name="JYpartinfobar"]', td)
            if (JYpartinfobar) {
                JYpartinfobar.remove();
            }
            else {
                const infobar = this.createInfobar(jyitems[i]);
                td.appendChild(infobar);
            }
        }


    }



    //划词搜索
    CreatSelectedText() {
        // 获取iframe的文档对象
        const iframeDoc = this.iframe.contentDocument || this.iframe.contentWindow.document;
        const iframeWin = this.iframe.contentWindow;
        let selectionitem, selectedText

        // 获取选中文字
        const selection = iframeWin.getSelection();
        if (selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        selectedText = range.toString().replace(/\s/g, '');
        selectionitem = range
        // if (!selectedText) return;

        // console.log('选中文字:', selectedText);

        // 特殊处理文本框选中
        const activeElement = iframeDoc.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
            selectedText = activeElement.value.substring(
                activeElement.selectionStart,
                activeElement.selectionEnd
            ).replace(/\s/g, '');


            // console.log('文本框选中:', selectedText || '无选中文字');
            if (selectedText) {
                selectionitem = activeElement

            }
        }
        if (selectedText.length <= 1 || selectedText.length > 15) return;
        // console.log('划词搜索调试:selectionitem:', selectionitem);

        // 获取iframe文档对象
        const iframeDocument = this.iframe.contentDocument || this.iframe.contentWindow.document;

        // 检查是否已添加过指示器
        const existingIndicator = iframeDocument.getElementById('jy-selection-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }

        // 创建指示器
        const indicator = iframeDocument.createElement('span');
        indicator.id = 'jy-selection-indicator';
        indicator.innerHTML = '🔍';
        indicator.searchkw = selectedText;
        indicator.title = `搜索: ${selectedText}`;
        indicator.style.cssText = `
            display: inline-block;
            width: 16px;
            height: 16px;
            background: #007bff;
            border-radius: 50%;
            color: white;
            text-align: center;
            font-size: 12px;
            margin-left: 4px;
            cursor: progress;
            user-select: none;
            vertical-align: middle;
            transition: all 0.2s ease;
            position: fixed;
            z-index: 9999;
            cursor: progress;
        `;

        // 获取iframe在父页面中的位置
        const iframeRect = this.iframe.getBoundingClientRect();

        // 获取选中文本的位置
        // const rect = range.getBoundingClientRect();
        const rect = selectionitem.getBoundingClientRect();

        // 计算最终位置 - 添加iframe在父页面中的偏移
        // indicator.style.left = `${rect.right + 0 + iframeRect.left}px`;
        indicator.style.left = `${rect.left - 30 + iframeRect.left}px`;
        indicator.style.top = `${rect.top - 20 + iframeRect.top}px`;

        // 将指示器添加到iframe的body中
        iframeDocument.body.appendChild(indicator);

        // // 点击事件,不知道为什么不生效
        // indicator.addEventListener('click', (e) => {
        //     // e.preventDefault();
        //     // e.stopPropagation();
        //     console.log('点击了指示器');
        //     this.indicator_search()
        // });
        let timer = null;
        // 鼠标进入事件
        indicator.addEventListener('mouseenter', (e) => {
            timer = setTimeout(() => {
                this.indicator_search()
            }, 1000);
        });
        indicator.addEventListener('mouseleave', () => {
            clearTimeout(timer); // 取消未触发的显示
            // 不再立即隐藏 tooltip，交给 tooltip 自己控制
        });


        // 当选择改变时移除指示器
        const removeIndicator = () => {
            if (iframeDocument.getElementById('jy-selection-indicator')) {
                iframeDocument.getElementById('jy-selection-indicator').remove();
            }
            iframeDoc.removeEventListener('selectionchange', removeIndicator);
        };

        iframeDoc.addEventListener('selectionchange', removeIndicator);

        this.indicator = indicator
        // 返回选中文本（如果需要）
        // return selectedText;
    }

    async indicator_search() {
        const Modal = this.Modal
        const floatDiv = Modal.floatDiv
        const indicator = this.indicator
        const kw = indicator.searchkw
        // console.log('kw', kw, indicator.style.left, indicator.style.top, floatDiv.style.left, floatDiv.style.top)
        if (!kw || !Modal) return;
        this._partQuery(kw).then(response => {
            // console.log('划词搜索', response);
            Modal.hide()
            const iframeRect = this.iframe.getBoundingClientRect();
            // floatDiv.style.left = indicator.style.left
            floatDiv.style.left = indicator.style.left ? indicator.style.left < (iframeRect.width * 0.5) : iframeRect.width - indicator.style.left
            // floatDiv.style.top = indicator.style.top
            floatDiv.style.top = indicator.style.top ? indicator.style.top < (iframeRect.height * 0.5) : iframeRect.height - indicator.style.top
            const table = this.createresult_table(response.result);
            this.Searchtool.resultContainer.innerHTML = ''
            this.Searchtool.resultContainer.appendChild(table)
            this.Searchtool.input_kw.value = kw
            Modal.show()
        });
    }

    //添加车辆和维修厂的定损信息
    addapprovetips() {

        function createCarInfoContainer(data) {
            // console.log('makeinfotips', data)

            // 创建容器元素
            const container = document.createElement('div');
            container.className = 'car-info-container';
            container.style.cssText = `padding: 5px;border: 1px solid #e4e4e4;border-radius: 6px;max-width: 800px;font-family: Arial, sans-serif;background: #fff;`;

            // 创建字段显示配置
            const fields = [
                { key: 'modelName', label: '定损车型', parent: 'car' },
                { key: 'vinNo', label: '定损车VIN码', parent: 'car' },
                { key: 'groupName', label: '品牌厂家', parent: 'car' },
                { key: 'vehiclePrice', label: '新车购置价', parent: 'car' },
                // { key: 'actualValue', label: '实际价值', parent: 'car' },
                { key: 'repairFacName', label: '维修厂名称', parent: 'evalRepair' },
                { key: 'repairType', label: '维修厂类型', parent: 'evalRepair' },
                { key: 'partDiscountPercent', label: '厂方指导价折扣率', parent: 'evalRepair' },
                { key: 'partBrandDiscount', label: '品牌件折扣率', parent: 'evalRepair' }

            ];

            // 创建数据行
            const row = document.createElement('div');
            row.className = 'car-info-row';
            row.style.cssText = `display: flex;flex-wrap: wrap;margin-bottom: 10px;`

            // 生成字段显示
            fields.forEach((field, index) => {
                const column = document.createElement('div');
                column.className = 'car-info-column';
                column.style.cssText = `flex: 0 0 48%;display: flex;align-items: center;margin-bottom: 12px;`

                const label = document.createElement('span');
                label.className = 'info-label';
                label.style.cssText = `font-weight: bold;width: 120px;color: #333;flex-shrink: 0;`
                label.textContent = field.label;

                const value = document.createElement('span');
                value.className = 'info-value';
                value.style.cssText = `color: #555;overflow: hidden;text-overflow: ellipsis;`

                value.textContent = data?.[field.parent]?.[field.key] || 'N/A';

                // 特殊字段处理,维修厂类型
                if (field.parent === 'evalRepair' && field.key === 'repairType') {
                    // 维修厂类型映射（根据实际数据补充映射关系）
                    const repairTypeMap = {
                        // '0': '非协议厂',
                        '2': '综修厂',
                        '1': '服务站'
                    };
                    value.textContent = repairTypeMap[data?.[field.parent]?.[field.key]] || '未知类型';
                }

                // 特殊字段处理,实际价值与新车购置价
                if (field.parent === 'car' && field.key === 'vehiclePrice') {
                    value.textContent = `${data.car.vehiclePrice} (${data.car.actualValue} 折旧率:${data.car.actualValue / data.car.vehiclePrice * 100}%)`;
                }

                // 特殊字段处理,增加品牌与厂家的显示
                if (field.parent === 'car' && field.key === 'groupName') {
                    const item = data.car
                    value.textContent = `${item.brandName}-${item.factoryName}`;
                }


                column.appendChild(label);
                column.appendChild(value);
                row.appendChild(column);

                // 每行显示两个数据项
                if ((index + 1) % 2 === 0 && index < fields.length - 1) {
                    container.appendChild(row.cloneNode(true));
                    row.innerHTML = '';
                }
            });

            // 添加最后一行可能存在的剩余数据项
            if (row.children.length > 0) {
                container.appendChild(row);
            }

            return container;
        }
        // const element = $("#SIUSurveyManagement_viewReadonly", this.iframe.contentDocument)
        // const element = $("#baseTab", this.iframe.contentDocument)
        const element = this.Modal.miniIcon
        if (!element) return;
        const infotips = createCarInfoContainer(this.approveInfo)
        hoverTip(this.iframe, element, infotips.outerHTML)

    }




}

export default JY;