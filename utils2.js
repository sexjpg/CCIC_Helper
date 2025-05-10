const utils = {};
const parers = {};

/**
 * 发起异步HTTP请求，支持GET/POST，自动处理请求头和响应解析
 * @param {string} url - 请求目标URL
 * @param {Object|string} [data=""] - 表单数据，将作为x-www-form-urlencoded发送
 * @param {Object} [json=""] - JSON数据，将作为application/json发送
 * @param {Object} [headers={}] - 自定义请求头
 * @returns {Promise<Object|Document>} 返回JSON对象或HTML文档（根据响应Content-Type决定）
 */
utils.httpRequest = async function (url, data = "", json = "", headers = {}) {
	const options = {
		//如果data或json不为空，则为POST请求，否则为GET请求
		method: data || json ? "POST" : "GET",
		credentials: "include",
		headers: {
			...headers,
			"Content-Type": data
				? "application/x-www-form-urlencoded"
				: json
				? "application/json;charset=UTF-8"
				: "text/html",
		},
	};

	if (data) {
		options.body = new URLSearchParams(data).toString();
	}

	if (json) {
		options.body = JSON.stringify(json);
		//   options.body = new URLSearchParams(json).toString();
	}

	try {
		const response = await fetch(url, options);

		if (!response.ok) {
			const errorInfo = await response.json();
			throw new Error(
				`HTTP error! status: ${response.status}, message: ${errorInfo.message}`
			);
		}

		// 根据 Content-Type 返回对应格式
		const contentType = response.headers.get("Content-Type");
		if (contentType?.includes("application/json")) {
			return await response.json();
		} else {
			const text = await response.text();
			const parser = new DOMParser();
			return parser.parseFromString(text, "text/html");
		}
	} catch (error) {
		throw error;
	}
};

/**
 * 异步查询DOM元素，支持动态加载和超时控制
 * @param {string} selector - 要查询的CSS选择器
 * @param {Object} [options] - 配置选项
 * @param {number} [options.timeout=5000] - 超时时间（毫秒）
 * @param {HTMLElement} [options.parent=document] - 父级容器元素
 * @returns {Promise<HTMLElement>} 返回包含元素的Promise，超时或失败时拒绝
 */
utils.async_querySelector = function (
	selector,
	{ timeout = 5000, parent = document } = {}
) {
	return new Promise((resolve, reject) => {
		// 立即检查元素是否存在
		const element = parent.querySelector(selector);
		if (element) {
			return resolve(element);
		}

		// 配置 MutationObserver
		const observer = new MutationObserver((mutations, obs) => {
			const foundElement = parent.querySelector(selector);
			if (foundElement) {
				cleanup();
				resolve(foundElement);
			}
		});

		// 超时处理
		const timeoutId = setTimeout(() => {
			cleanup();
			reject(new Error(`Element "${selector}" not found within ${timeout}ms`));
		}, timeout);

		// 清理函数
		const cleanup = () => {
			observer.disconnect();
			clearTimeout(timeoutId);
		};

		// 开始观察 DOM 变化
		observer.observe(parent, {
			childList: true,
			subtree: true,
			attributes: false,
			characterData: false,
		});

		// 再次检查防止竞争条件
		const immediateCheck = parent.querySelector(selector);
		if (immediateCheck) {
			cleanup();
			resolve(immediateCheck);
		}
	});
};

/**
 * 监控页面中所有 iframe 的加载、添加和移除事件
 * 功能：
 * 1. 使用 MutationObserver 监听 body 及其子树的 DOM 变化
 * 2. 自动处理新增 iframe 的加载监控
 * 3. 根据 iframe 名称执行不同的处理逻辑
 * 4. 记录 iframe 的添加/移除日志
 */
utils.monitorIframes = function () {
	// 监控 iframe 的加载完成事件
	function bindIframeLoadEvent(iframe) {
		if (observedIframes.has(iframe)) return; // 避免重复监听
		observedIframes.add(iframe);

		// 监听 iframe 的 load 事件
		iframe.addEventListener("load", () => {
			console.log("iframe 加载完成:", iframe);
			const ifamenames = iframe_names_car.concat(iframe_name_other);
			if (ifamenames.some((str) => iframe.name.includes(str))) {
				Common.addinitBTN(iframe);

				if (
					iframe.name &&
					iframe_names_car.some((str) => iframe.name.includes(str))
				) {
					Common.handle_iframe_carloss(iframe);
				} else if (
					iframe.name &&
					iframe_name_other.some((str) => iframe.name.includes(str))
				) {
					Common.handle_iframe_others(iframe);
				}
			}
		});

		// 检查 iframe 是否已经加载完成（例如缓存导致立即加载）
		if (iframe.contentDocument?.readyState === "complete") {
			console.log("iframe 已缓存加载完成:", iframe);
		}
	}

	const targetNode = document.body;
	const config = { childList: true, subtree: true };

	const observer = new MutationObserver((mutationsList) => {
		for (const mutation of mutationsList) {
			// 处理新增的节点
			mutation.addedNodes.forEach((node) => {
				if (node.tagName === "IFRAME") {
					console.log("iframe 被添加:", node);
					bindIframeLoadEvent(node);
				} else if (node.querySelector) {
					// 检查子节点中的 iframe（例如动态插入的容器）
					const iframes = node.querySelectorAll("iframe");
					iframes.forEach((iframe) => {
						console.log("iframe 被添加（嵌套）:", iframe);
						bindIframeLoadEvent(iframe);
					});
				}
			});

			// 处理移除的节点
			mutation.removedNodes.forEach((node) => {
				if (node.tagName === "IFRAME") {
					console.log("iframe 被移除:", node);
				} else if (node.querySelector) {
					const iframes = node.querySelectorAll("iframe");
					iframes.forEach((iframe) => {
						console.log("iframe 被移除（嵌套）:", iframe);
					});
				}
			});
		}
	});

	observer.observe(targetNode, config);
	console.log("开始监控 iframe 的动态生成、移除及加载事件...");
};

/**
 * Toast消息提示功能封装
 *
 * 实现特性：
 * - 自动创建样式表和容器
 * - 支持info/success/warning/error四种消息类型
 * - 自动消失功能（3秒，支持鼠标悬停暂停）
 * - 渐入渐出动画效果
 * - 多消息堆叠展示
 *
 * @returns {Object} 包含四种消息类型方法的对象
 */
utils.toast = function () {
	// 创建样式
	const style = document.createElement("style");
	style.textContent = `
          .brmenu-container {
              position: fixed;
              bottom: 10px;
              right: 10px;
              max-width: 35vw;
              max-height: 90vh;
              overflow-y: auto;
              display: flex;
              flex-direction: column-reverse;
              gap: 10px;
              z-index: 9999;
              padding: 10px;
          }

          .brmenu-toast {
              position: relative;
              padding: 15px 35px 15px 20px;
              border-radius: 4px;
              color: #fff;
              box-shadow: 0 0 10px rgba(0,0,0,0.3);
              animation: slideIn 0.3s ease-out;
              opacity: 1;
              transition: opacity 0.3s;
              min-width: 200px;
              word-break: break-word;
          }
          
          .brmenu-toast.hide {
              opacity: 0;
          }
          
          .toast-close {
              position: absolute;
              top: 5px;
              right: 5px;
              cursor: pointer;
              opacity: 0.8;
              background: none;
              border: none;
              color: white;
              padding: 2px;
          }
          
          @keyframes slideIn {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
          }
          
          /* 不同类型颜色 */
          .toast-info { background-color: #3498db; }
          .toast-success { background-color: #27ae60; }
          .toast-warning { background-color: #f39c12; }
          .toast-error { background-color: #e74c3c; }
      `;
	document.head.appendChild(style);

	// 创建容器
	const container = document.createElement("div");
	container.className = "brmenu-container";
	document.body.appendChild(container);

	function createToast(content, type) {
		const toast = document.createElement("div");
		toast.className = `brmenu-toast toast-${type}`;

		// 关闭按钮
		const closeBtn = document.createElement("button");
		closeBtn.className = "toast-close";
		closeBtn.innerHTML = "×";
		closeBtn.onclick = () => removeToast(toast);

		// 内容
		const contentDiv = document.createElement("div");
		contentDiv.innerHTML = content;

		toast.appendChild(closeBtn);
		toast.appendChild(contentDiv);

		// 鼠标交互
		let timeout;
		const startTimeout = () => {
			timeout = setTimeout(() => removeToast(toast), 3000);
		};

		toast.addEventListener("mouseenter", () => clearTimeout(timeout));
		toast.addEventListener("mouseleave", startTimeout);

		return { toast, startTimeout };
	}

	function removeToast(toast) {
		toast.classList.add("hide");
		setTimeout(() => {
			toast.remove();
			// 当没有消息时移除容器
			if (container.children.length === 0) {
				container.remove();
			}
		}, 300);
	}

	function showMessage(type, content) {
		// 确保容器存在
		if (!document.body.contains(container)) {
			document.body.appendChild(container);
		}

		const { toast, startTimeout } = createToast(content, type);
		container.appendChild(toast);
		startTimeout();
	}

	return {
		info: (content) => showMessage("info", content),
		success: (content) => showMessage("success", content),
		warning: (content) => showMessage("warning", content),
		error: (content) => showMessage("error", content),
	};
};

/**
 * 计算两个日期字符串之间的天数差
 * @param {string} dateString1 - 起始日期字符串（符合Date解析格式）
 * @param {string} dateString2 - 结束日期字符串（符合Date解析格式）
 * @returns {string} 两个日期相差的天数，保留1位小数
 */
utils.getDaysDifference = function (dateString1, dateString2) {
	// 将日期字符串转换为Date对象
	const date1 = new Date(dateString1);
	const date2 = new Date(dateString2);

	// 计算绝对时间差（确保结果始终为正数）
	const timeDifference = Math.abs(date2 - date1);

	// 将毫秒时间差转换为天数（毫秒/秒/分钟/小时）
	const daysDifference = timeDifference / (1000 * 3600 * 24);

	// 返回格式化后的天数差（四舍五入到小数点后1位）
	return daysDifference.toFixed(1);
};

/**
 * 从日期时间字符串中提取小时数（24小时制）
 * @static
 * @param {string} dateTimeString - 日期时间字符串（需符合Date对象解析格式）
 * @returns {number} 返回0-23的整点小时数
 * @throws {TypeError} 当输入参数不是字符串时抛出类型错误
 * @throws {Error} 当日期字符串无法解析时抛出格式错误
 * @example
 * // 返回 15
 * getHour("2023-10-01T15:30:00");
 */
utils.getHour = function (dateTimeString) {
	// 参数类型校验
	if (typeof dateTimeString !== "string") {
		throw new TypeError("非法日期格式：输入参数必须是字符串类型");
	}

	// 创建日期对象
	const date = new Date(dateTimeString);

	// 有效性校验（无效日期会返回NaN的时间戳）
	if (isNaN(date.getTime())) {
		throw new Error("非法日期字符串格式：无法解析为有效日期");
	}

	// 返回小时数（Date.prototype.getHours() 原生方法）
	return date.getHours();
};

/**
 * 合并两个Map结构，相同键的值进行数组合并
 * @param {Map} map1 - 基准映射表，键为任意类型，值应为数组
 * @param {Map} map2 - 待合并的映射表，键为任意类型，值应为数组
 * @returns {Map} 返回新的Map实例，包含合并后的所有键值对，
 *                相同键的值已合并为联合数组
 */
utils.mapsmerge = function (map1, map2) {
	// 基于map1创建初始副本，保证原始map1不被修改
	const newMap = new Map(map1); // 创建一个新的Map，包含map1的所有键值对

	/* 遍历合并逻辑：
	 * 1. 当键冲突时，合并两个数组内容
	 * 2. 新键直接添加到Map中
	 */
	for (const [key, value] of map2) {
		if (newMap.has(key)) {
			// 如果新Map中已经有这个键，则合并列表
			const existingValue = newMap.get(key);
			newMap.set(key, [...existingValue, ...value]);
		} else {
			// 如果新Map中没有这个键，则直接添加
			newMap.set(key, value);
		}
	}
	return newMap;
};

/**
 * 根据VIN码计算车辆年份
 * @param {string} vin - 17位的车辆识别代号（VIN码）
 * @returns {number} 解析出的车辆年份（4位数字形式）
 */
utils.getvinyear = function (vin) {
	// 定义VIN字符集（包含30个年份编码字符，对应2000-2029年，之后循环）
	const VIN10C = [
		"0",
		"1",
		"2",
		"3",
		"4",
		"5",
		"6",
		"7",
		"8",
		"9",
		"A",
		"B",
		"C",
		"D",
		"E",
		"F",
		"G",
		"H",
		"J",
		"K",
		"L",
		"M",
		"N",
		"P",
		"R",
		"S",
		"T",
		"V",
		"W",
		"X",
		"Y",
		"Z",
	];

	// 解析VIN第10位字符（代表车型年份）
	const charAt9 = vin.charAt(9); // 第10位字符，索引为9

	// 将字符转换为对应的年份编码数值
	const indexInVIN10C = VIN10C.indexOf(charAt9);

	/*
	 * 年份计算逻辑：
	 * 1. 基准年份从2000年开始计算
	 * 2. 当计算结果超过2026年时，回滚一个编码周期（VIN10C数组长度）
	 */
	let year = 2000 + indexInVIN10C;
	if (year > 2026) {
		year = year - VIN10C.length;
	}

	return year;
};

/**
 * 从表格单元格中提取并处理文本内容
 *
 * @param {HTMLElement} element - 需要解析的单元格DOM元素（通常为<tr>中的<td>元素）
 * @returns {string} 处理后的文本内容（自动去除冒号及首尾空格）
 *
 * 处理逻辑优先级：
 * 1. 单选按钮  2. 下拉选择框  3. 输入框  4. 普通文本内容
 */
utils.cellGetValue = function (element) {
	// 处理单选按钮逻辑
	// 查找单选按钮并检测选中状态
	const element_ischeck = element.querySelector('input[type="radio"]');
	if (element_ischeck) {
		// 优先返回已选中项的值，未选中时返回默认值"0"
		if (element.querySelector("input[checked]")) {
			return element
				.querySelector("input[checked]")
				.value.trim()
				.replace("：", "");
		} else {
			return "0";
		}
	}

	// 处理下拉选择框逻辑
	// 获取第一个option元素的文本内容
	const element_isselect = element.querySelector("select option");
	if (element_isselect) {
		return element_isselect.textContent.trim().replace("：", "");
	}

	// 处理输入框逻辑
	// 获取input元素的value值
	const element_isinput = element.querySelector("input");
	if (element_isinput) {
		return element_isinput.value.trim().replace("：", "");
	}

	// 默认处理逻辑
	// 直接获取元素文本内容
	return element.textContent.trim().replace("：", "");
};

/**
 * 解析保险单文档信息，提取基本信息、投保险种和特别约定
 * - 页面URL: `/claim/prpLCmainController.do?mainPageList&accidentNo=${accidentNo}&registNo=${registNo}`
 * @param {Document} Doc - 待解析的HTML文档对象
 * @returns {Object} 返回结构化保单信息对象，包含三个属性：
 *   - 基本信息: 包含投保单基础字段键值对
 *   - 投保险种: 包含险种详情信息的对象集合，以险别名称为键
 *   - 特别约定: 包含特别约定条款的对象集合，以特别代码为键
 */
parers.保单页面 = function (Doc) {
	// 初始化保单信息容器对象
	const 基本信息 = {};
	const 投保险种 = {};
	const 特别约定 = {};
	const 保单信息 = {
		基本信息: 基本信息,
		投保险种: 投保险种,
		特别约定: 特别约定,
	};

	// 解析基础信息：遍历.label类元素构建键值对
	const labels = Doc.querySelectorAll(".label");
	labels.forEach((label) => {
		const key = utils.cellGetValue(label);
		const value = utils.cellGetValue(label.nextElementSibling);
		基本信息[key] = value;
	});

	// 解析保险种类表格：提取险种名称、责任限额及免赔信息
	const table_limplicateItemKind = Doc.querySelector("#limplicateItemKind");
	if (table_limplicateItemKind) {
		trs = table_limplicateItemKind.querySelectorAll("tr");
		trs.forEach((tr) => {
			// 表格列结构：0-险别名称 1-责任限额 4-免赔额 5-免赔率
			const 险别名称 = utils.cellGetValue(tr.cells[0]);
			投保险种[险别名称] = {
				险别名称: 险别名称,
				责任限额: utils.cellGetValue(tr.cells[1]),
				免赔额: utils.cellGetValue(tr.cells[4]),
				免赔率: utils.cellGetValue(tr.cells[5]),
			};
		});
	}

	// 解析特别约定表格：提取条款代码、名称及详细内容
	const table_lcengage = Doc.querySelector("#lcengage");
	if (table_lcengage) {
		const trs = table_lcengage.querySelectorAll("tr");
		trs.forEach((tr) => {
			// 表格列结构：0-特别代码 1-特别名称 2-特约内容
			const 特别代码 = utils.cellGetValue(tr.cells[0]);
			特别约定[特别代码] = {
				特别代码: 特别代码,
				特别名称: utils.cellGetValue(tr.cells[1]),
				特约内容: utils.cellGetValue(tr.cells[2]),
			};
		});
	}

	return 保单信息;
};

/**
 * 解析KTM文档中的风险信息并生成结构化数据
 * @param {Document} ktmdoc - 包含KTM风险信息的DOM文档对象
 * @returns {Object} 风险信息字典，包含送检状态和风险条目明细
 */
parers.KTM_parser = function (ktmdoc) {
	// 初始化风险字典，默认送检状态为0（未送检）
	const KTMrisks_dic = {};
	KTMrisks_dic["KTM送检"] = 0;

	/* 检查是否存在未触发风险段落
	 * 若发现"未触发风险"文本，立即返回基础送检状态 */
	const ps = ktmdoc.querySelectorAll("span p");
	ps.forEach((p) => {
		if (p.textContent.includes("未触发风险")) {
			KTMrisks_dic["KTM送检"] = 1;
			return KTMrisks_dic;
		}
	});

	/* 解析表格行数据
	 * 存在有效表格时默认设置送检状态为1（已送检） */
	const trs = ktmdoc.querySelectorAll("tr");
	if (trs) {
		KTMrisks_dic["KTM送检"] = 1;
		trs.forEach((tr) => {
			// 提取表格单元格基础信息
			const 风险描述 = tr.cells[2].textContent;
			const 风险项目 = tr.cells[3].textContent;
			const 风险类型 = tr.cells[1].textContent;

			/* 解析损失项目与类型
			 * 格式示例："配件：保险杠,大灯" -> 损失类型:配件，损失项目:[保险杠,大灯] */
			const 损失项目 =
				风险项目.split("：").length <= 1
					? []
					: 风险项目.split("：")[1].split(",").length <= 1
					? [风险项目.split("：")[1]]
					: 风险项目.split("：")[1].split(",");
			const 损失类型 =
				风险项目.split("：").length >= 1 ? 风险项目.split("：")[0] : "";

			// 从风险描述中提取方括号内的风险代码
			const 风险代码 =
				tr.cells[2].textContent.split("【").length >= 1
					? tr.cells[2].textContent.split("【")[1]
					: `0`;

			// 构建风险条目对象
			const riskitem = {
				损失项目: 损失项目,
				损失类型: 损失类型,
				风险代码: 风险代码,
				风险描述: 风险描述,
				风险类型: 风险类型,
			};

			/* 构建以损失项目为key的字典结构
			 * 确保每个损失项目对应的风险条目不重复 */
			损失项目.forEach((item) => {
				if (KTMrisks_dic[损失项目] == undefined) {
					KTMrisks_dic[损失项目] = [];
				}
				if (!KTMrisks_dic[损失项目].includes(riskitem)) {
					KTMrisks_dic[损失项目].push(riskitem);
				}
			});
		});
	}
	return KTMrisks_dic;
};

/**
 * 解析DXM文档中的车辆泄漏风险信息并生成结构化数据
 *
 * @param {Document} DXMdoc - 包含风险信息的HTML文档对象
 * @returns {Object} 泄漏风险字典，结构为：
 *   {
 *     'DXM送检': 0|1,              // 是否存在送检风险
 *     [损失项目名称]: Array<{       // 每个损失项目对应的风险详情
 *       损失项目: string,
 *       损失类型: string,
 *       风险描述: string,
 *       风险类型: string
 *     }>
 *   }
 */
parers.DXM_parser = function (DXMdoc) {
	const LeakageRisk_dict = {};
	LeakageRisk_dict["DXM送检"] = 0;
	const 损失类型_list = ["配件", "工时", "辅料"];

	/* 处理车辆泄漏风险信息表格 */
	const carLeakageRiskInfos = DXMdoc.querySelectorAll(
		"#carLeakageRiskInfo tr.perRow"
	);
	if (carLeakageRiskInfos.length > 0) {
		carLeakageRiskInfos.forEach((tr) => {
			const 风险类型 = tr.cells[1].textContent;
			const 风险描述 = tr.cells[2].textContent;
			const 风险项目 = tr.cells[3].textContent;

			/* 解析风险项目字符串：
               1. 分割逗号分隔的字符串，第一个元素为损失类型
               2. 校验是否为合法损失类型（配件/工时/辅料）
               3. 剩余元素作为具体损失项目 */
			let items = 风险项目.trim().replaceAll("\n", "").split(",");
			const 损失类型 = 损失类型_list.includes(items[0]) ? items[0] : "";

			/* 为每个损失项目创建风险条目并存入字典 */
			items.slice(1).forEach((损失名称) => {
				const riskitem = {
					损失项目: 损失名称,
					损失类型: 损失类型,
					风险描述: 风险描述,
					风险类型: 风险类型,
				};

				/* 初始化数组并去重添加风险条目 */
				if (LeakageRisk_dict[损失名称] == undefined) {
					LeakageRisk_dict[损失名称] = [];
				}
				if (!LeakageRisk_dict[损失名称].includes(riskitem)) {
					LeakageRisk_dict[损失名称].push(riskitem);
				}
			});
			LeakageRisk_dict["DXM送检"] = 1;
		});
	}
	return LeakageRisk_dict;
};

/**
 * 解析AXM送检风险数据，生成按损失项目分类的风险字典
 * @param {Object} html - 包含送检数据的Json对象，需包含rows数组结构
 * @param {string} licenseNo - 需要匹配的车牌，用于过滤数据
 * @returns {Object} 返回风险字典对象，结构为：
 *   {
 *     "AXM送检": 0|1,          // 送检状态标识
 *     [损失项目]: Array<{      // 风险项数组（动态键名）
 *       损失项目: string,      // 具体损失项目名称
 *       损失类型: string,      // 类型（配件/工时/辅料）
 *       风险描述: string       // 风险规则描述
 *     }>
 *   }
 */
parser.AXM_parser = function (html, licenseNo) {
	// 初始化风险字典，设置初始送检状态为0（未送检）
	const items = html.rows;
	const LeakageRisk_dict = {};
	LeakageRisk_dict["AXM送检"] = 0;

	// 遍历所有数据行，筛选匹配指定许可证号的记录
	for (let item of items) {
		// 跳过非当前许可证号的数据
		if (item.licenseNo != licenseNo) {
			continue;
		}

		// 转换数字类型的损失类型为中文描述
		const 损失类型 =
			item.lossType == "1" ? "配件" : item.lossType == "2" ? "工时" : "辅料";

		// 构建风险条目对象
		const 风险描述 = item.ruleName;
		const 损失项目 = item.lossName;
		const riskitem = {
			损失项目: 损失项目,
			损失类型: 损失类型,
			风险描述: 风险描述,
		};

		// 按损失项目分组存储，确保数组初始化并避免重复条目
		if (LeakageRisk_dict[损失项目] == undefined) {
			LeakageRisk_dict[损失项目] = [];
		}
		if (!LeakageRisk_dict[损失项目].includes(riskitem)) {
			LeakageRisk_dict[损失项目].push(riskitem);
		}
	}

	// 最终设置送检状态为1（已处理）
	LeakageRisk_dict["AXM送检"] = 1;

	return LeakageRisk_dict;
};
