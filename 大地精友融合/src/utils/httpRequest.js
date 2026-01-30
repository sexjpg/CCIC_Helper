/**
 * 改进版的 HTTP 请求函数，使用统一的缓存存储结构
 * @param {string} url - 请求的URL
 * @param {string|URLSearchParams} data - 表单数据
 * @param {Object} json - JSON数据
 * @param {Object} headers - 自定义请求头
 * @param {number} CachexpiryMs - 缓存过期时间,默认5,设为0时不缓存
 * @returns {Promise<Object>} 返回包含响应数据的Promise
 */
async function httpRequest(url, data = "", json = "", headers = {} ,CachexpiryMs = 5) {

	

	// 防止同时传递data和json参数
	if (data && json) {
		throw new Error("Cannot provide both 'data' and 'json' parameters. Choose one.");
	}

	// 缓存相关功能
	const generateCacheKey = () => {
		// 生成唯一的缓存键
		const requestData = {
			url,
			data,
			json,
			headers
		};
		return btoa(encodeURIComponent(JSON.stringify(requestData)));
	};

	// 检查是否有可用缓存
	// 检查是否有可用缓存
	const getCachedResponse = () => {
		try {
			const cacheData = localStorage.getItem('http_cache');
			if (!cacheData) return null;

			const cacheObj = JSON.parse(cacheData);
			const cacheKey = generateCacheKey();
			const cachedItem = cacheObj[cacheKey];

			if (cachedItem) {
				// 检查是否过期 (默认缓存5分钟)
				if (Date.now() - cachedItem.timestamp < cachedItem.expiry) {
					// 重构缓存的数据为mockResponse格式
					const cachedData = cachedItem.data;
					return {
						ok: cachedData.ok,
						status: cachedData.status,
						statusText: cachedData.statusText,
						type: cachedData.type,
						redirected: cachedData.redirected,
						url: cachedData.url,
						text: () => cachedData._text,
						json: () => {
							if (cachedData._contentType && cachedData._contentType.includes('application/json')) {
								return JSON.parse(cachedData._text);
							}
							try {
								return JSON.parse(cachedData._text);
							} catch (e) {
								console.error('Failed to parse JSON:', e);
								return {};
							}
							console.error('Response is not JSON');
							return {};
						},
						html: () => {
							if (cachedData._contentType && cachedData._contentType.includes('text/html')) {
								return new DOMParser().parseFromString(cachedData._text, 'text/html');
							}
							console.error('Response is not HTML');
							return new DOMParser().parseFromString('', 'text/html');
						}
					};
				} else {
					// 删除过期缓存
					delete cacheObj[cacheKey];
					localStorage.setItem('http_cache', JSON.stringify(cacheObj));
				}
			}
		} catch (e) {
			console.warn('Failed to retrieve cached response:', e);
		}
		return null;
	};

	// 缓存响应
	const cacheResponse = (responseData, expiryMs = CachexpiryMs * 60 * 1000) => {
		try {
			const cacheKey = generateCacheKey();
			let cacheObj = {};

			// 获取现有缓存
			const existingCache = localStorage.getItem('http_cache');
			if (existingCache) {
				cacheObj = JSON.parse(existingCache);
			}

			// 添加新缓存项
			cacheObj[cacheKey] = {
				data: responseData,
				timestamp: Date.now(),
				expiry: expiryMs
			};

			localStorage.setItem('http_cache', JSON.stringify(cacheObj));
		} catch (e) {
			console.warn('Failed to cache response:', e);
		}
	};

	// 清理所有过期缓存
	const cleanExpiredCache = () => {
		try {
			const cacheData = localStorage.getItem('http_cache');
			if (!cacheData) return;

			const cacheObj = JSON.parse(cacheData);
			const currentTime = Date.now();
			let hasExpired = false;

			// 删除过期项
			for (const key in cacheObj) {
				if (currentTime - cacheObj[key].timestamp >= cacheObj[key].expiry) {
					delete cacheObj[key];
					hasExpired = true;
				}
			}

			// 如果有删除的项，更新存储
			if (hasExpired) {
				localStorage.setItem('http_cache', JSON.stringify(cacheObj));
			}
		} catch (e) {
			console.warn('Failed to clean expired cache:', e);
		}
	};

	// 清理所有缓存
	const clearAllCache = () => {
		try {
			localStorage.removeItem('http_cache');
		} catch (e) {
			console.warn('Failed to clear cache:', e);
		}
	};

	// 获取缓存统计信息
	const getCacheStats = () => {
		try {
			const cacheData = localStorage.getItem('http_cache');
			if (!cacheData) return { total: 0, valid: 0, expired: 0 };

			const cacheObj = JSON.parse(cacheData);
			const currentTime = Date.now();
			let valid = 0;
			let expired = 0;

			for (const key in cacheObj) {
				if (currentTime - cacheObj[key].timestamp < cacheObj[key].expiry) {
					valid++;
				} else {
					expired++;
				}
			}

			return {
				total: Object.keys(cacheObj).length,
				valid,
				expired
			};
		} catch (e) {
			console.warn('Failed to get cache stats:', e);
			return { total: 0, valid: 0, expired: 0 };
		}
	};

	// 定期清理过期缓存（每10次请求清理一次）
	if (Math.random() < 0.1) {
		cleanExpiredCache();
	}

	// 首先检查缓存
	const cachedResponse = getCachedResponse();
	if (cachedResponse) {
		console.debug(`正在获取缓存... ${url}`);
		return cachedResponse;
	}

	// 保留用户自定义Content-Type，仅在未提供时自动设置
	let contentTypeHeader = headers['Content-Type'] || headers['content-type'];
	if (!contentTypeHeader) {
		if (data) {
			contentTypeHeader = 'application/x-www-form-urlencoded';
		} else if (json) {
			contentTypeHeader = 'application/json;charset=UTF-8';
		} else {
			contentTypeHeader = 'text/html';
		}
	}

	const options = {
		method: data || json ? "POST" : "GET",
		credentials: "include",
		headers: {
			...headers,
			'Content-Type': contentTypeHeader
		},
	};

	if (data) {
		options.body = new URLSearchParams(data).toString();
	}

	if (json) {
		options.body = JSON.stringify(json);
	}

	try {
		console.debug(`httpRequst请求数据 URL,options`, url,options);
		const response = await fetch(url, options);
		// 提前读取响应文本，避免多次读取流
		const text = await response.text();
		// 获取响应的实际Content-Type
		const responseContentType = response.headers.get('Content-Type');

		// 改进错误处理，根据实际响应类型解析错误信息
		if (!response.ok) {
			let errorMessage = `HTTP error! status: ${response.status}`;
			if (responseContentType && responseContentType.includes('application/json')) {
				try {
					const errorData = JSON.parse(text);
					errorMessage += `, message: ${errorData.message || JSON.stringify(errorData)}`;
				} catch (e) {
					// errorMessage += `, message: ${text}`;
				}
			} else {
				// errorMessage += `, message: ${text}`;
			}
			// throw new Error(errorMessage);
            console.error('httpRequest请求错误',errorMessage,{url,options});
		}

		// 按需解析响应，避免提前解析
		const mockResponse = {
			ok: response.ok,
			status: response.status,
			statusText: response.statusText,
			type: response.type,
			redirected: response.redirected,
			url: response.url,
			body: response.body,
			text: () => text,
			json: () => {
				if (responseContentType && responseContentType.includes('application/json')) {
					return JSON.parse(text);
				}
				try {
					return JSON.parse(text);
				} catch (e) {
					console.error('Failed to parse JSON:', e);
					return {};
				}
				console.error('Response is not JSON');
				return {};
			},
			html: () => {
				if (responseContentType && responseContentType.includes('text/html')) {
					return new DOMParser().parseFromString(text, 'text/html');
				}
				console.error('Response is not HTML');
				return new DOMParser().parseFromString('', 'text/html');
			}
		};

		// 修改缓存成功的响应部分
		// 缓存成功的响应
		if (responseContentType &&
			(responseContentType.includes('text/') ||
				responseContentType.includes('application/json'))) {
			// 创建用于缓存的简化响应对象
			const cacheableResponse = {
				ok: response.ok,
				status: response.status,
				statusText: response.statusText,
				type: response.type,
				redirected: response.redirected,
				url: response.url,
				// 只缓存原始文本数据，而不是函数
				_text: text,
				_contentType: responseContentType
			};

			cacheResponse(cacheableResponse);
		}

		return mockResponse;

	} catch (error) {
		throw error;
	}
}

export default httpRequest;