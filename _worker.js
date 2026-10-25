
// 部署完成后在网址后面加上这个，获取自建节点和机场聚合节点，/?token=auto或/auto或

let mytoken = 'auto';
let guestToken = ''; //可以随便取，或者uuid生成，https://1024tools.com/uuid
let BotToken = ''; //可以为空，或者@BotFather中输入/start，/newbot，并关注机器人
let ChatID = ''; //可以为空，或者@userinfobot中获取，/start
let TG = 0; //小白勿动， 开发者专用，1 为推送所有的访问信息，0 为不推送订阅转换后端的访问信息与异常访问
let FileName = 'CF-Workers-SUB';
let SUBUpdateTime = 6; //自定义订阅更新时间，单位小时
let total = 99;//TB
let timestamp = 4102329600000;//2099-12-31

//节点链接 + 订阅链接
let MainData = `
https://raw.githubusercontent.com/mfuu/v2ray/master/v2ray
`;

let urls = [];
let subConverter = "subapi.473807.xyz"; //在线订阅转换后端，目前使用CM的订阅转换功能。支持自建psub 可自行搭建https://github.com/bulianglin/psub
let subConfig = "https://raw.githubusercontent.com/cmliu/ACL4SSR/main/Clash/config/ACL4SSR_Online_MultiCountry.ini"; //订阅配置文件
let subProtocol = 'https';

export default {
	async fetch(request, env) {
		const userAgentHeader = request.headers.get('User-Agent');
		const userAgent = userAgentHeader ? userAgentHeader.toLowerCase() : "null";
		const url = new URL(request.url);
		const token = url.searchParams.get('token');
		mytoken = env.TOKEN || mytoken;
		BotToken = env.TGTOKEN || BotToken;
		ChatID = env.TGID || ChatID;
		TG = env.TG || TG;
		subConverter = env.SUBAPI || subConverter;
		if (subConverter.includes("http://")) {
			subConverter = subConverter.split("//")[1];
			subProtocol = 'http';
		} else {
			subConverter = subConverter.split("//")[1] || subConverter;
		}
		subConfig = env.SUBCONFIG || subConfig;
		FileName = env.SUBNAME || FileName;

		const currentDate = new Date();
		currentDate.setHours(0, 0, 0, 0);
		const timeTemp = Math.ceil(currentDate.getTime() / 1000);
		const fakeToken = await MD5MD5(`${mytoken}${timeTemp}`);
		guestToken = env.GUESTTOKEN || env.GUEST || guestToken;
		if (!guestToken) guestToken = await MD5MD5(mytoken);
		const 访客订阅 = guestToken;
		//console.log(`${fakeUserID}\n${fakeHostName}`); // 打印fakeID

		let UD = Math.floor(((timestamp - Date.now()) / timestamp * total * 1099511627776) / 2);
		total = total * 1099511627776;
		let expire = Math.floor(timestamp / 1000);
		SUBUpdateTime = env.SUBUPTIME || SUBUpdateTime;

		if (!([mytoken, fakeToken, 访客订阅].includes(token) || url.pathname == ("/" + mytoken) || url.pathname.includes("/" + mytoken + "?"))) {
			if (TG == 1 && url.pathname !== "/" && url.pathname !== "/favicon.ico") await sendMessage(`#异常访问 ${FileName}`, request.headers.get('CF-Connecting-IP'), `UA: ${userAgent}</tg-spoiler>\n域名: ${url.hostname}\n<tg-spoiler>入口: ${url.pathname + url.search}</tg-spoiler>`);
			if (env.URL302) return Response.redirect(env.URL302, 302);
			else if (env.URL) return await proxyURL(env.URL, url);
			else return new Response(await nginx(), {
				status: 200,
				headers: {
					'Content-Type': 'text/html; charset=UTF-8',
				},
			});
		} else {
			// 订阅获取接口由 Worker 代为请求，避免前端跨域 fetch 失败。
			if (url.searchParams.has('fetchSubscription')) {
				const requestedUrl = url.searchParams.get('fetchSubscription') || '';
				let targetUrl;
				try {
					targetUrl = new URL(requestedUrl);
				} catch {
					return new Response('订阅链接无效', {
						status: 400,
						headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
					});
				}

				const isAllowedSubscriptionUrl = (candidate) => {
					if (!['http:', 'https:'].includes(candidate.protocol)) return false;
					const hostname = candidate.hostname.toLowerCase().replace(/^\[|\]$/g, '');
					if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) return false;

					const octets = hostname.split('.');
					const isIPv4 = octets.length === 4 && octets.every(part => /^\d+$/.test(part) && Number(part) >= 0 && Number(part) <= 255);
					if (isIPv4) {
						const [first, second] = octets.map(Number);
						if (first === 0 || first === 10 || first === 127 || first >= 224 ||
							(first === 169 && second === 254) ||
							(first === 172 && second >= 16 && second <= 31) ||
							(first === 192 && second === 168) ||
							(first === 100 && second >= 64 && second <= 127)) return false;
					}
					if (hostname.includes(':') && /^(::|::1|fc|fd|fe80:|ff|::ffff:)/i.test(hostname)) return false;
					return true;
				};

				if (!isAllowedSubscriptionUrl(targetUrl)) {
					return new Response('订阅链接地址不允许访问', {
						status: 400,
						headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
					});
				}

				try {
					let subscriptionResponse;
					for (let redirectCount = 0; redirectCount <= 5; redirectCount++) {
						subscriptionResponse = await fetch(targetUrl.toString(), {
							method: 'GET',
							redirect: 'manual',
							headers: {
								'Accept': 'text/plain, application/yaml, application/x-yaml, */*',
								'User-Agent': 'Mozilla/5.0 (compatible; CF-Workers-SUB/1.0)'
							}
						});
						if (![301, 302, 303, 307, 308].includes(subscriptionResponse.status)) break;

						const location = subscriptionResponse.headers.get('Location');
						if (!location) break;
						if (redirectCount === 5) {
							return new Response('订阅链接重定向次数过多', {
								status: 502,
								headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
							});
						}
						targetUrl = new URL(location, targetUrl);
						if (!isAllowedSubscriptionUrl(targetUrl)) {
							return new Response('订阅链接重定向地址不允许访问', {
								status: 400,
								headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
							});
						}
					}

					const subscriptionContent = await subscriptionResponse.text();
					return new Response(subscriptionContent, {
						status: subscriptionResponse.status,
						headers: {
							'Content-Type': subscriptionResponse.headers.get('Content-Type') || 'text/plain; charset=utf-8',
							'Cache-Control': 'no-store'
						}
					});
				} catch (error) {
					console.error('获取订阅内容失败:', error);
					return new Response('获取订阅内容失败: ' + error.message, {
						status: 502,
						headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
					});
				}
			}

			if (env.KV) {
				await 迁移地址列表(env, 'LINK.txt');
				if (userAgent.includes('mozilla') && !url.search) {
					await sendMessage(`#编辑订阅 ${FileName}`, request.headers.get('CF-Connecting-IP'), `UA: ${userAgentHeader}</tg-spoiler>\n域名: ${url.hostname}\n<tg-spoiler>入口: ${url.pathname + url.search}</tg-spoiler>`);
					return await KV(request, env, 'LINK.txt', 访客订阅);
				} else {
					MainData = await env.KV.get('LINK.txt') || MainData;
				}
			} else {
				MainData = env.LINK || MainData;
				if (env.LINKSUB) urls = await ADD(env.LINKSUB);
			}
			let 重新汇总所有链接 = await ADD(MainData + '\n' + urls.join('\n'));
			let 自建节点 = "";
			let 订阅链接 = "";
			for (let x of 重新汇总所有链接) {
				if (x.toLowerCase().startsWith('http')) {
					订阅链接 += x + '\n';
				} else {
					自建节点 += x + '\n';
				}
			}
			MainData = 自建节点;
			urls = await ADD(订阅链接);
			await sendMessage(`#获取订阅 ${FileName}`, request.headers.get('CF-Connecting-IP'), `UA: ${userAgentHeader}</tg-spoiler>\n域名: ${url.hostname}\n<tg-spoiler>入口: ${url.pathname + url.search}</tg-spoiler>`);

			let 订阅格式 = 'base64';
			if (userAgent.includes('null') || userAgent.includes('subconverter') || userAgent.includes('nekobox') || userAgent.includes(('CF-Workers-SUB').toLowerCase())) {
				订阅格式 = 'base64';
			} else if (userAgent.includes('clash') || (url.searchParams.has('clash') && !userAgent.includes('subconverter'))) {
				订阅格式 = 'clash';
			} else if (userAgent.includes('sing-box') || userAgent.includes('singbox') || ((url.searchParams.has('sb') || url.searchParams.has('singbox')) && !userAgent.includes('subconverter'))) {
				订阅格式 = 'singbox';
			} else if (userAgent.includes('surge') || (url.searchParams.has('surge') && !userAgent.includes('subconverter'))) {
				订阅格式 = 'surge';
			} else if (userAgent.includes('quantumult%20x') || (url.searchParams.has('quanx') && !userAgent.includes('subconverter'))) {
				订阅格式 = 'quanx';
			} else if (userAgent.includes('loon') || (url.searchParams.has('loon') && !userAgent.includes('subconverter'))) {
				订阅格式 = 'loon';
			}

			let subConverterUrl;
			let 订阅转换URL = `${url.origin}/${await MD5MD5(fakeToken)}?token=${fakeToken}`;
			//console.log(订阅转换URL);
			let req_data = MainData;

			let 追加UA = 'v2rayn';
			if (url.searchParams.has('b64') || url.searchParams.has('base64')) 订阅格式 = 'base64';
			else if (url.searchParams.has('clash')) 追加UA = 'clash';
			else if (url.searchParams.has('singbox')) 追加UA = 'singbox';
			else if (url.searchParams.has('surge')) 追加UA = 'surge';
			else if (url.searchParams.has('quanx')) 追加UA = 'Quantumult%20X';
			else if (url.searchParams.has('loon')) 追加UA = 'Loon';

			const 订阅链接数组 = [...new Set(urls)].filter(item => item?.trim?.()); // 去重
			if (订阅链接数组.length > 0) {
				const 请求订阅响应内容 = await getSUB(订阅链接数组, request, 追加UA, userAgentHeader);
				console.log(请求订阅响应内容);
				req_data += 请求订阅响应内容[0].join('\n');
				订阅转换URL += "|" + 请求订阅响应内容[1];
			}

			if (env.WARP) 订阅转换URL += "|" + (await ADD(env.WARP)).join("|");
			//修复中文错误
			const utf8Encoder = new TextEncoder();
			const encodedData = utf8Encoder.encode(req_data);
			//const text = String.fromCharCode.apply(null, encodedData);
			const utf8Decoder = new TextDecoder();
			const text = utf8Decoder.decode(encodedData);

			//去重
			const uniqueLines = new Set(text.split('\n'));
			const result = [...uniqueLines].join('\n');
			//console.log(result);

			let base64Data;
			try {
				base64Data = btoa(result);
			} catch (e) {
				function encodeBase64(data) {
					const binary = new TextEncoder().encode(data);
					let base64 = '';
					const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

					for (let i = 0; i < binary.length; i += 3) {
						const byte1 = binary[i];
						const byte2 = binary[i + 1] || 0;
						const byte3 = binary[i + 2] || 0;

						base64 += chars[byte1 >> 2];
						base64 += chars[((byte1 & 3) << 4) | (byte2 >> 4)];
						base64 += chars[((byte2 & 15) << 2) | (byte3 >> 6)];
						base64 += chars[byte3 & 63];
					}

					const padding = 3 - (binary.length % 3 || 3);
					return base64.slice(0, base64.length - padding) + '=='.slice(0, padding);
				}

				base64Data = encodeBase64(result)
			}

			if (订阅格式 == 'base64' || token == fakeToken) {
				return new Response(base64Data, {
					headers: {
						"content-type": "text/plain; charset=utf-8",
						"Profile-Update-Interval": `${SUBUpdateTime}`,
						//"Subscription-Userinfo": `upload=${UD}; download=${UD}; total=${total}; expire=${expire}`,
					}
				});
			} else if (订阅格式 == 'clash') {
				subConverterUrl = `${subProtocol}://${subConverter}/sub?target=clash&url=${encodeURIComponent(订阅转换URL)}&insert=false&config=${encodeURIComponent(subConfig)}&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false&new_name=true`;
			} else if (订阅格式 == 'singbox') {
				subConverterUrl = `${subProtocol}://${subConverter}/sub?target=singbox&url=${encodeURIComponent(订阅转换URL)}&insert=false&config=${encodeURIComponent(subConfig)}&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false&new_name=true`;
			} else if (订阅格式 == 'surge') {
				subConverterUrl = `${subProtocol}://${subConverter}/sub?target=surge&ver=4&url=${encodeURIComponent(订阅转换URL)}&insert=false&config=${encodeURIComponent(subConfig)}&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false&new_name=true`;
			} else if (订阅格式 == 'quanx') {
				subConverterUrl = `${subProtocol}://${subConverter}/sub?target=quanx&url=${encodeURIComponent(订阅转换URL)}&insert=false&config=${encodeURIComponent(subConfig)}&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false&udp=true`;
			} else if (订阅格式 == 'loon') {
				subConverterUrl = `${subProtocol}://${subConverter}/sub?target=loon&url=${encodeURIComponent(订阅转换URL)}&insert=false&config=${encodeURIComponent(subConfig)}&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false`;
			}
			//console.log(订阅转换URL);
			try {
				const subConverterResponse = await fetch(subConverterUrl);

				if (!subConverterResponse.ok) {
					return new Response(base64Data, {
						headers: {
							"content-type": "text/plain; charset=utf-8",
							"Profile-Update-Interval": `${SUBUpdateTime}`,
							//"Subscription-Userinfo": `upload=${UD}; download=${UD}; total=${total}; expire=${expire}`,
						}
					});
					//throw new Error(`Error fetching subConverterUrl: ${subConverterResponse.status} ${subConverterResponse.statusText}`);
				}
				let subConverterContent = await subConverterResponse.text();
				if (订阅格式 == 'clash') subConverterContent = await clashFix(subConverterContent);
				return new Response(subConverterContent, {
					headers: {
						"Content-Disposition": `attachment; filename*=utf-8''${encodeURIComponent(FileName)}`,
						"content-type": "text/plain; charset=utf-8",
						"Profile-Update-Interval": `${SUBUpdateTime}`,
						//"Subscription-Userinfo": `upload=${UD}; download=${UD}; total=${total}; expire=${expire}`,

					},
				});
			} catch (error) {
				return new Response(base64Data, {
					headers: {
						"content-type": "text/plain; charset=utf-8",
						"Profile-Update-Interval": `${SUBUpdateTime}`,
						//"Subscription-Userinfo": `upload=${UD}; download=${UD}; total=${total}; expire=${expire}`,
					}
				});
			}
		}
	}
};

async function ADD(envadd) {
	var addtext = envadd.replace(/[	"'|\r\n]+/g, '\n').replace(/\n+/g, '\n');	// 替换为换行
	//console.log(addtext);
	if (addtext.charAt(0) == '\n') addtext = addtext.slice(1);
	if (addtext.charAt(addtext.length - 1) == '\n') addtext = addtext.slice(0, addtext.length - 1);
	const add = addtext.split('\n');
	//console.log(add);
	return add;
}

async function nginx() {
	const text = `
	<!DOCTYPE html>
	<html>
	<head>
	<title>Welcome to nginx!</title>
	<style>
		body {
			width: 35em;
			margin: 0 auto;
			font-family: Tahoma, Verdana, Arial, sans-serif;
		}
	</style>
	</head>
	<body>
	<h1>Welcome to nginx!</h1>
	<p>If you see this page, the nginx web server is successfully installed and
	working. Further configuration is required.</p>
	
	<p>For online documentation and support please refer to
	<a href="http://nginx.org/">nginx.org</a>.<br/>
	Commercial support is available at
	<a href="http://nginx.com/">nginx.com</a>.</p>
	
	<p><em>Thank you for using nginx.</em></p>
	
					<div id="deleteConfirmModal" class="confirm-modal" aria-hidden="true">
						<div class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="deleteConfirmTitle" aria-describedby="deleteConfirmMessage">
							<h3 id="deleteConfirmTitle">确认删除链接</h3>
							<p id="deleteConfirmMessage">确定删除此链接吗？删除后无法恢复。</p>
							<div class="confirm-actions">
								<button type="button" id="deleteCancelBtn" class="confirm-action-btn confirm-cancel-btn">取消</button>
								<button type="button" id="deleteConfirmBtn" class="confirm-action-btn confirm-delete-btn">确认删除</button>
							</div>
						</div>
					</div>
</body>
	</html>
	`
	return text;
}

async function sendMessage(type, ip, add_data = "") {
	if (BotToken !== '' && ChatID !== '') {
		let msg = "";
		const response = await fetch(`http://ip-api.com/json/${ip}?lang=zh-CN`);
		if (response.status == 200) {
			const ipInfo = await response.json();
			msg = `${type}\nIP: ${ip}\n国家: ${ipInfo.country}\n<tg-spoiler>城市: ${ipInfo.city}\n组织: ${ipInfo.org}\nASN: ${ipInfo.as}\n${add_data}`;
		} else {
			msg = `${type}\nIP: ${ip}\n<tg-spoiler>${add_data}`;
		}

		let url = "https://api.telegram.org/bot" + BotToken + "/sendMessage?chat_id=" + ChatID + "&parse_mode=HTML&text=" + encodeURIComponent(msg);
		return fetch(url, {
			method: 'get',
			headers: {
				'Accept': 'text/html,application/xhtml+xml,application/xml;',
				'Accept-Encoding': 'gzip, deflate, br',
				'User-Agent': 'Mozilla/5.0 Chrome/90.0.4430.72'
			}
		});
	}
}

function base64Decode(str) {
	const bytes = new Uint8Array(atob(str).split('').map(c => c.charCodeAt(0)));
	const decoder = new TextDecoder('utf-8');
	return decoder.decode(bytes);
}

async function MD5MD5(text) {
	const encoder = new TextEncoder();

	const firstPass = await crypto.subtle.digest('MD5', encoder.encode(text));
	const firstPassArray = Array.from(new Uint8Array(firstPass));
	const firstHex = firstPassArray.map(b => b.toString(16).padStart(2, '0')).join('');

	const secondPass = await crypto.subtle.digest('MD5', encoder.encode(firstHex.slice(7, 27)));
	const secondPassArray = Array.from(new Uint8Array(secondPass));
	const secondHex = secondPassArray.map(b => b.toString(16).padStart(2, '0')).join('');

	return secondHex.toLowerCase();
}

function clashFix(content) {
	if (content.includes('wireguard') && !content.includes('remote-dns-resolve')) {
		let lines;
		if (content.includes('\r\n')) {
			lines = content.split('\r\n');
		} else {
			lines = content.split('\n');
		}

		let result = "";
		for (let line of lines) {
			if (line.includes('type: wireguard')) {
				const 备改内容 = `, mtu: 1280, udp: true`;
				const 正确内容 = `, mtu: 1280, remote-dns-resolve: true, udp: true`;
				result += line.replace(new RegExp(备改内容, 'g'), 正确内容) + '\n';
			} else {
				result += line + '\n';
			}
		}

		content = result;
	}
	return content;
}

async function proxyURL(proxyURL, url) {
	const URLs = await ADD(proxyURL);
	const fullURL = URLs[Math.floor(Math.random() * URLs.length)];

	// 解析目标 URL
	let parsedURL = new URL(fullURL);
	console.log(parsedURL);
	// 提取并可能修改 URL 组件
	let URLProtocol = parsedURL.protocol.slice(0, -1) || 'https';
	let URLHostname = parsedURL.hostname;
	let URLPathname = parsedURL.pathname;
	let URLSearch = parsedURL.search;

	// 处理 pathname
	if (URLPathname.charAt(URLPathname.length - 1) == '/') {
		URLPathname = URLPathname.slice(0, -1);
	}
	URLPathname += url.pathname;

	// 构建新的 URL
	let newURL = `${URLProtocol}://${URLHostname}${URLPathname}${URLSearch}`;

	// 反向代理请求
	let response = await fetch(newURL);

	// 创建新的响应
	let newResponse = new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: response.headers
	});

	// 添加自定义头部，包含 URL 信息
	//newResponse.headers.set('X-Proxied-By', 'Cloudflare Worker');
	//newResponse.headers.set('X-Original-URL', fullURL);
	newResponse.headers.set('X-New-URL', newURL);

	return newResponse;
}

async function getSUB(api, request, 追加UA, userAgentHeader) {
	if (!api || api.length === 0) {
		return [];
	} else api = [...new Set(api)]; // 去重
	let newapi = "";
	let 订阅转换URLs = "";
	let 异常订阅 = "";
	const controller = new AbortController(); // 创建一个AbortController实例，用于取消请求
	const timeout = setTimeout(() => {
		controller.abort(); // 2秒后取消所有请求
	}, 2000);

	try {
		// 使用Promise.allSettled等待所有API请求完成，无论成功或失败
		const responses = await Promise.allSettled(api.map(apiUrl => getUrl(request, apiUrl, 追加UA, userAgentHeader).then(response => response.ok ? response.text() : Promise.reject(response))));

		// 遍历所有响应
		const modifiedResponses = responses.map((response, index) => {
			// 检查是否请求成功
			if (response.status === 'rejected') {
				const reason = response.reason;
				if (reason && reason.name === 'AbortError') {
					return {
						status: '超时',
						value: null,
						apiUrl: api[index] // 将原始的apiUrl添加到返回对象中
					};
				}
				console.error(`请求失败: ${api[index]}, 错误信息: ${reason.status} ${reason.statusText}`);
				return {
					status: '请求失败',
					value: null,
					apiUrl: api[index] // 将原始的apiUrl添加到返回对象中
				};
			}
			return {
				status: response.status,
				value: response.value,
				apiUrl: api[index] // 将原始的apiUrl添加到返回对象中
			};
		});

		console.log(modifiedResponses); // 输出修改后的响应数组

		for (const response of modifiedResponses) {
			// 检查响应状态是否为'fulfilled'
			if (response.status === 'fulfilled') {
				const content = await response.value || 'null'; // 获取响应的内容
				if (content.includes('proxies:')) {
					//console.log('Clash订阅: ' + response.apiUrl);
					订阅转换URLs += "|" + response.apiUrl; // Clash 配置
				} else if (content.includes('outbounds"') && content.includes('inbounds"')) {
					//console.log('Singbox订阅: ' + response.apiUrl);
					订阅转换URLs += "|" + response.apiUrl; // Singbox 配置
				} else if (content.includes('://')) {
					//console.log('明文订阅: ' + response.apiUrl);
					newapi += content + '\n'; // 追加内容
				} else if (isValidBase64(content)) {
					//console.log('Base64订阅: ' + response.apiUrl);
					newapi += base64Decode(content) + '\n'; // 解码并追加内容
				} else {
					const 异常订阅LINK = `trojan://CMLiussss@127.0.0.1:8888?security=tls&allowInsecure=1&type=tcp&headerType=none#%E5%BC%82%E5%B8%B8%E8%AE%A2%E9%98%85%20${response.apiUrl.split('://')[1].split('/')[0]}`;
					console.log('异常订阅: ' + 异常订阅LINK);
					异常订阅 += `${异常订阅LINK}\n`;
				}
			}
		}
	} catch (error) {
		console.error(error); // 捕获并输出错误信息
	} finally {
		clearTimeout(timeout); // 清除定时器
	}

	const 订阅内容 = await ADD(newapi + 异常订阅); // 将处理后的内容转换为数组
	// 返回处理后的结果
	return [订阅内容, 订阅转换URLs];
}

async function getUrl(request, targetUrl, 追加UA, userAgentHeader) {
	// 设置自定义 User-Agent
	const newHeaders = new Headers(request.headers);
	newHeaders.set("User-Agent", `${atob('djJyYXlOLzYuNDU=')} cmliu/CF-Workers-SUB ${追加UA}(${userAgentHeader})`);

	// 构建新的请求对象
	const modifiedRequest = new Request(targetUrl, {
		method: request.method,
		headers: newHeaders,
		body: request.method === "GET" ? null : request.body,
		redirect: "follow",
		cf: {
			// 忽略SSL证书验证
			insecureSkipVerify: true,
			// 允许自签名证书
			allowUntrusted: true,
			// 禁用证书验证
			validateCertificate: false
		}
	});

	// 输出请求的详细信息
	console.log(`请求URL: ${targetUrl}`);
	console.log(`请求头: ${JSON.stringify([...newHeaders])}`);
	console.log(`请求方法: ${request.method}`);
	console.log(`请求体: ${request.method === "GET" ? null : request.body}`);

	// 发送请求并返回响应
	return fetch(modifiedRequest);
}

function isValidBase64(str) {
	// 先移除所有空白字符(空格、换行、回车等)
	const cleanStr = str.replace(/\s/g, '');
	const base64Regex = /^[A-Za-z0-9+/=]+$/;
	return base64Regex.test(cleanStr);
}

async function 迁移地址列表(env, txt = 'ADD.txt') {
	const 旧数据 = await env.KV.get(`/${txt}`);
	const 新数据 = await env.KV.get(txt);

	if (旧数据 && !新数据) {
		// 写入新位置
		await env.KV.put(txt, 旧数据);
		// 删除旧数据
		await env.KV.delete(`/${txt}`);
		return true;
	}
	return false;
}

async function KV(request, env, txt = 'ADD.txt', guest) {
	const url = new URL(request.url);
	try {
		// POST请求处理
		if (request.method === "POST") {
			if (!env.KV) return new Response("未绑定KV空间", { status: 400 });
			try {
				const content = await request.text();
				await env.KV.put(txt, content);
				return new Response("保存成功");
			} catch (error) {
				console.error('保存KV时发生错误:', error);
				return new Response("保存失败: " + error.message, { status: 500 });
			}
		}

		// GET请求部分
		let content = '';
		let hasKV = !!env.KV;

		if (hasKV) {
			try {
				content = await env.KV.get(txt) || '';
			} catch (error) {
				console.error('读取KV时发生错误:', error);
				content = '读取数据时发生错误: ' + error.message;
			}
		}

		const html = `
				<!DOCTYPE html>
			<html>
				<head>
					<title>${FileName} 订阅管理中心</title>
					<meta charset="utf-8">
					<meta name="viewport" content="width=device-width, initial-scale=1">
					<style>
						* {
							margin: 0;
							padding: 0;
							box-sizing: border-box;
						}
						
						body {
							font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
							background: #ffffff;
							min-height: 100vh;
							color: #333;
							line-height: 1.6;
						}
						
						.container {
							max-width: 1200px;
							margin: 0 auto;
							padding: 20px;
						}
						
						.header {
							text-align: center;
							margin-bottom: 30px;
							color: #2c3e50;
							background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
							padding: 30px;
							border-radius: 15px;
							box-shadow: 0 4px 15px rgba(0,0,0,0.1);
						}
						
						.header h1 {
							font-size: 2.5rem;
							margin-bottom: 10px;
							color: #2c3e50;
							text-shadow: none;
						}
						
						.header p {
							font-size: 1.1rem;
							color: #6c757d;
							opacity: 1;
						}
						
						.card {
							background: #ffffff;
							border-radius: 15px;
							padding: 25px;
							margin-bottom: 25px;
							box-shadow: 0 4px 15px rgba(0,0,0,0.1);
							border: 1px solid #e9ecef;
							position: relative;
							overflow: hidden;
							transition: all 0.3s ease;
						}
						
						.card:hover {
							transform: translateY(-2px);
							box-shadow: 0 12px 40px rgba(0,0,0,0.15);
						}
						
						.card::before {
							content: '';
							position: absolute;
							top: 0;
							left: -100%;
							width: 100%;
							height: 2px;
							background: linear-gradient(90deg, transparent, #3498db, transparent);
							transition: left 0.5s ease;
						}
						
						.card:hover::before {
							left: 100%;
						}
						
						.card-title {
							font-size: 1.4rem;
							font-weight: 600;
							margin-bottom: 20px;
							color: #2c3e50;
							border-bottom: 2px solid #f39c12;
							padding-bottom: 10px;
							position: relative;
						}
						
						.subscription-grid {
							display: grid;
							grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
							gap: 20px;
							margin-bottom: 20px;
						}
						
						.sub-item {
							background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
							border-radius: 12px;
							padding: 20px;
							text-align: center;
							transition: all 0.3s ease;
							cursor: pointer;
							border: none;
							color: white;
							text-decoration: none;
							display: block;
						}
						
						.sub-item:hover {
							transform: translateY(-5px);
							box-shadow: 0 10px 25px rgba(0,0,0,0.2);
							text-decoration: none;
							color: white;
						}
						
						.sub-item h3 {
							font-size: 1.2rem;
							margin-bottom: 10px;
							font-weight: 600;
						}
						
						.sub-item .url {
							font-size: 0.9rem;
							opacity: 0.9;
							word-break: break-all;
							background: rgba(255,255,255,0.2);
							padding: 8px;
							border-radius: 6px;
							margin-top: 10px;
						}
						
						.qr-container {
							margin-top: 15px;
							padding: 15px;
							background: white;
							border-radius: 8px;
							display: none;
							text-align: center;
						}
						
						.qr-container canvas,
						.qr-container img {
							display: block;
							margin: 0 auto;
						}
						
						.guest-section {
							background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
							border-radius: 12px;
							padding: 20px;
							margin-top: 20px;
						}
						
						.toggle-btn {
							background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
							color: white;
							border: none;
							padding: 12px 24px;
							border-radius: 25px;
							cursor: pointer;
							font-size: 1rem;
							font-weight: 600;
							transition: all 0.3s ease;
							margin-bottom: 15px;
						}
						
						.toggle-btn:hover {
							transform: translateY(-2px);
							box-shadow: 0 5px 15px rgba(0,0,0,0.2);
						}
						
						.editor-container {
							margin-top: 20px;
						}
						
						.editor {
							width: 100%;
							min-height: 300px;
							padding: 20px;
							border: 2px solid #e0e0e0;
							border-radius: 12px;
							font-size: 14px;
							line-height: 1.6;
							resize: vertical;
							font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
							background: #f8f9fa;
							transition: border-color 0.3s ease;
						}
						
						.editor:focus {
							outline: none;
							border-color: #667eea;
							box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
						}
						
						.save-container {
							margin-top: 15px;
							display: flex;
							align-items: center;
							gap: 15px;
							flex-wrap: wrap;
						}
						
						.save-btn {
							background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
							color: white;
							border: none;
							padding: 12px 24px;
							border-radius: 25px;
							cursor: pointer;
							font-size: 1rem;
							font-weight: 600;
							transition: all 0.3s ease;
						}
						
						.save-btn:hover {
							transform: translateY(-2px);
							box-shadow: 0 5px 15px rgba(0,0,0,0.2);
						}
						
						.save-btn:disabled {
							opacity: 0.6;
							cursor: not-allowed;
							transform: none;
						}
						
						.save-status {
							color: #666;
							font-weight: 500;
						}
						
						.info-section {
							background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
							border-radius: 12px;
							padding: 20px;
							margin-bottom: 20px;
						}
						
						.info-section h3 {
							color: #d35400;
							margin-bottom: 15px;
						}
						
						.info-item {
							margin-bottom: 10px;
							padding: 10px;
							background: rgba(255,255,255,0.3);
							border-radius: 8px;
						}
						
						.info-item strong {
							color: #c0392b;
						}
						
						.footer-info {
							text-align: center;
							color: white;
							margin-top: 30px;
							padding: 20px;
							background: rgba(255,255,255,0.1);
							border-radius: 12px;
							backdrop-filter: blur(10px);
						}
						
						.footer-info a {
							color: #ffd700;
							text-decoration: none;
							font-weight: 600;
						}
						
						.footer-info a:hover {
							text-decoration: underline;
						}
						
						/* 链接保存功能样式 */
						.link-manager {
							background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
							border-radius: 12px;
							padding: 20px;
							margin-bottom: 20px;
						}
						
						.link-input-group {
							display: flex;
							gap: 10px;
							margin-bottom: 15px;
							flex-wrap: wrap;
						}
						
						.link-input {
							flex: 1;
							min-width: 200px;
							padding: 12px;
							border: 2px solid #e0e0e0;
							border-radius: 8px;
							font-size: 14px;
						}
						
						.link-input:focus {
							outline: none;
							border-color: #667eea;
						}
						
						.add-link-btn {
							background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
							color: white;
							border: none;
							padding: 12px 20px;
							border-radius: 8px;
							cursor: pointer;
							font-weight: 600;
							white-space: nowrap;
						}
						
						.saved-links {
							margin-top: 15px;
						}
						
						.saved-link-item {
							display: flex;
							justify-content: space-between;
							align-items: center;
							padding: 12px;
							background: rgba(255,255,255,0.4);
							border-radius: 10px;
							margin-bottom: 10px;
							transition: all 0.3s ease;
							border: 1px solid rgba(255,255,255,0.2);
						}
						
						.saved-link-item:hover {
							background: rgba(255,255,255,0.6);
							transform: translateY(-2px);
							box-shadow: 0 4px 12px rgba(0,0,0,0.1);
						}
						
						.saved-link-item a {
							color: #2c3e50;
							text-decoration: none;
							font-weight: 500;
							flex: 1;
							margin-right: 10px;
							overflow: hidden;
							text-overflow: ellipsis;
							white-space: nowrap;
						}
						
						.saved-link-item a:hover {
							text-decoration: underline;
							color: #667eea;
						}
						
						.saved-link-item > div {
							display: flex;
							gap: 8px;
							align-items: center;
						}
						
						.copy-link-btn {
							background: #3498db;
							color: white;
							border: none;
							padding: 6px 8px;
							border-radius: 6px;
							cursor: pointer;
							font-size: 12px;
							transition: all 0.3s ease;
							min-width: 32px;
						}
						
						.copy-link-btn:hover {
							background: #2980b9;
							transform: scale(1.05);
						}
						
						.delete-link-btn {
							background: #e74c3c;
							color: white;
							border: none;
							padding: 6px 10px;
							border-radius: 6px;
							cursor: pointer;
							font-size: 12px;
							transition: all 0.3s ease;
						}
						
						.delete-link-btn:hover {
							background: #c0392b;
							transform: scale(1.05);
						}
						
						.link-management-controls {
							display: flex;
							gap: 10px;
							margin-top: 15px;
							flex-wrap: wrap;
							justify-content: center;
						}
						
						.export-import-btn {
							background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
							color: white;
							border: none;
							padding: 8px 16px;
							border-radius: 8px;
							cursor: pointer;
							font-size: 13px;
							font-weight: 500;
							transition: all 0.3s ease;
						}
						
						.export-import-btn:hover {
							transform: translateY(-2px);
							box-shadow: 0 4px 12px rgba(0,0,0,0.2);
						}
						
						/* 轻量提示与居中删除确认框 */
						.ui-toast-container {
							position: fixed;
							left: 50%;
							bottom: 28px;
							transform: translateX(-50%);
							z-index: 10001;
							display: flex;
							flex-direction: column;
							align-items: center;
							gap: 8px;
							pointer-events: none;
						}

						.ui-toast {
							padding: 9px 17px;
							border: 1px solid rgba(226, 232, 240, 0.58);
							border-radius: 999px;
							background: rgba(255, 255, 255, 0.72);
							color: rgba(71, 85, 105, 0.86);
							box-shadow: 0 8px 28px rgba(15, 23, 42, 0.08);
							backdrop-filter: blur(14px);
							-webkit-backdrop-filter: blur(14px);
							font-size: 14px;
							letter-spacing: 0.02em;
							opacity: 0;
							transform: translateY(7px);
							transition: opacity 0.2s ease, transform 0.2s ease;
						}

						.ui-toast.is-visible {
							opacity: 1;
							transform: translateY(0);
						}

						.ui-toast.is-error {
							color: rgba(185, 28, 28, 0.9);
							background: rgba(255, 255, 255, 0.84);
						}

						.confirm-modal {
							position: fixed;
							inset: 0;
							z-index: 10000;
							display: none;
							align-items: center;
							justify-content: center;
							padding: 20px;
							background: rgba(15, 23, 42, 0.36);
							backdrop-filter: blur(3px);
							-webkit-backdrop-filter: blur(3px);
						}

						.confirm-modal.is-open {
							display: flex;
						}

						.confirm-dialog {
							width: min(100%, 420px);
							padding: 24px;
							border: 1px solid rgba(226, 232, 240, 0.9);
							border-radius: 18px;
							background: rgba(255, 255, 255, 0.97);
							box-shadow: 0 24px 70px rgba(15, 23, 42, 0.2);
							animation: confirmModalIn 0.18s ease-out;
						}

						@keyframes confirmModalIn {
							from { opacity: 0; transform: translateY(8px) scale(0.98); }
							to { opacity: 1; transform: translateY(0) scale(1); }
						}

						.confirm-dialog h3 {
							margin: 0 0 10px;
							color: #1e293b;
							font-size: 18px;
						}

						.confirm-dialog p {
							margin: 0;
							color: #64748b;
							line-height: 1.65;
							overflow-wrap: anywhere;
						}

						.confirm-actions {
							display: flex;
							justify-content: flex-end;
							gap: 10px;
							margin-top: 24px;
						}

						.confirm-action-btn {
							padding: 10px 18px;
							border: 0;
							border-radius: 10px;
							cursor: pointer;
							font-size: 14px;
							transition: background 0.2s ease, transform 0.2s ease;
						}

						.confirm-cancel-btn {
							background: #f1f5f9;
							color: #475569;
						}

						.confirm-cancel-btn:hover {
							background: #e2e8f0;
						}

						.confirm-delete-btn {
							background: #ef4444;
							color: #fff;
						}

						.confirm-delete-btn:hover {
							background: #dc2626;
						}

						.confirm-action-btn:focus-visible {
							outline: 3px solid rgba(59, 130, 246, 0.45);
							outline-offset: 2px;
						}

						body.modal-open {
							overflow: hidden;
						}

						@media (max-width: 480px) {
							.confirm-dialog {
								padding: 20px;
								border-radius: 16px;
							}
							.confirm-actions > button {
								flex: 1;
							}
						}

						/* SOCKS转换功能样式 */
						.socks-converter {
							background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
							border-radius: 12px;
							padding: 20px;
							margin-bottom: 20px;
						}
						
						.conversion-mode {
							display: flex;
							gap: 20px;
							margin-bottom: 20px;
							padding: 15px;
							background: rgba(255, 255, 255, 0.9);
							border-radius: 8px;
							border: 1px solid rgba(255, 255, 255, 0.3);
						}
						
						.mode-label {
							display: flex;
							align-items: center;
							gap: 8px;
							cursor: pointer;
							padding: 8px 12px;
							border-radius: 6px;
							transition: background-color 0.3s ease;
							font-weight: 600;
						}
						
						.mode-label:hover {
							background-color: rgba(255, 255, 255, 0.5);
						}
						
						.mode-label input[type="radio"] {
							margin: 0;
							accent-color: #667eea;
						}
						
						.input-section {
							margin-bottom: 20px;
							padding: 15px;
							background: rgba(255, 255, 255, 0.9);
							border-radius: 8px;
							border: 1px solid rgba(255, 255, 255, 0.3);
						}
						
						.input-section label {
							display: block;
							margin-bottom: 8px;
							font-weight: 600;
							color: #495057;
						}
						
						.subscription-url {
							width: calc(100% - 130px);
							padding: 12px 15px;
							border: 2px solid #e0e0e0;
							border-radius: 6px;
							font-size: 14px;
							margin-right: 10px;
							transition: border-color 0.3s ease;
							box-sizing: border-box;
						}
						
						.subscription-url:focus {
							border-color: #667eea;
							outline: none;
							box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
						}
						
						.fetch-btn {
							padding: 12px 20px;
							background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
							color: white;
							border: none;
							border-radius: 6px;
							font-size: 14px;
							font-weight: 600;
							cursor: pointer;
							transition: all 0.3s ease;
							vertical-align: top;
						}
						
						.fetch-btn:hover {
							background: linear-gradient(135deg, #138496 0%, #17a2b8 100%);
							transform: translateY(-2px);
							box-shadow: 0 4px 12px rgba(23, 162, 184, 0.3);
						}
						
						.converter-input {
							width: 100%;
							min-height: 150px;
							padding: 15px;
							border: 2px solid #e0e0e0;
							border-radius: 8px;
							font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
							font-size: 13px;
							resize: vertical;
							margin-bottom: 15px;
							box-sizing: border-box;
						}
						
						.converter-input:focus {
							border-color: #667eea;
							outline: none;
							box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
						}
						
						.converter-controls {
							display: flex;
							gap: 15px;
							align-items: center;
							margin-bottom: 15px;
							flex-wrap: wrap;
						}
						
						.port-input {
							width: 120px;
							padding: 8px;
							border: 2px solid #e0e0e0;
							border-radius: 6px;
							transition: border-color 0.3s ease;
						}
						
						.port-input:focus {
							border-color: #667eea;
							outline: none;
						}
						
						.convert-btn {
							background: linear-gradient(135deg, #6f42c1 0%, #5a32a3 100%);
							color: white;
							border: none;
							padding: 10px 20px;
							border-radius: 8px;
							cursor: pointer;
							font-weight: 600;
							transition: all 0.3s ease;
						}
						
						.convert-btn:hover {
							background: linear-gradient(135deg, #5a32a3 0%, #6f42c1 100%);
							transform: translateY(-2px);
							box-shadow: 0 4px 12px rgba(111, 66, 193, 0.3);
						}
						
						.upload-file-btn {
							background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
							color: white;
							border: none;
							padding: 8px 16px;
							border-radius: 6px;
							cursor: pointer;
							font-size: 14px;
							font-weight: 600;
							transition: all 0.3s ease;
						}
						
						.upload-file-btn:hover {
							background: linear-gradient(135deg, #138496 0%, #17a2b8 100%);
							transform: translateY(-2px);
							box-shadow: 0 4px 12px rgba(23, 162, 184, 0.3);
						}
						
						.converter-output {
							margin-top: 15px;
						}
						
						.download-section {
							margin-top: 15px;
							padding: 15px;
							background: rgba(255, 255, 255, 0.9);
							border-radius: 8px;
							border: 1px solid rgba(255, 255, 255, 0.3);
						}
						
						.download-btn {
							display: inline-block;
							padding: 10px 20px;
							background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
							color: white;
							text-decoration: none;
							border-radius: 6px;
							font-size: 14px;
							font-weight: 600;
							margin-right: 10px;
							margin-bottom: 10px;
							transition: all 0.3s ease;
						}
						
						.download-btn:hover {
							background: linear-gradient(135deg, #20c997 0%, #28a745 100%);
							transform: translateY(-2px);
							box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
							text-decoration: none;
							color: white;
						}
						
						.copy-text-btn {
							padding: 10px 20px;
							background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
							color: white;
							border: none;
							border-radius: 6px;
							font-size: 14px;
							font-weight: 600;
							cursor: pointer;
							margin-right: 10px;
							margin-bottom: 10px;
							transition: all 0.3s ease;
						}
						
						.copy-text-btn:hover {
							background: linear-gradient(135deg, #495057 0%, #6c757d 100%);
							transform: translateY(-2px);
							box-shadow: 0 4px 12px rgba(108, 117, 125, 0.3);
						}
						
						.converter-result {
							background: #f8f9fa;
							border: 2px solid #e0e0e0;
							border-radius: 8px;
							padding: 15px;
							font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
							font-size: 13px;
							white-space: pre-wrap;
							max-height: 300px;
							overflow-y: auto;
						}
						
						.download-link {
							display: inline-block;
							margin-top: 10px;
							padding: 10px 20px;
							background: #27ae60;
							color: white;
							text-decoration: none;
							border-radius: 8px;
							font-weight: 600;
						}
						
						.download-link:hover {
							background: #229954;
							text-decoration: none;
							color: white;
						}
						
						/* 现代化增强样式 */
						
						.qr-container {
							animation: fadeIn 0.3s ease;
						}
						
						@keyframes fadeIn {
							from { opacity: 0; transform: translateY(10px); }
							to { opacity: 1; transform: translateY(0); }
						}
						
						/* 加载动画 */
						.loading {
							position: relative;
							overflow: hidden;
						}
						
						.loading::after {
							content: '';
							position: absolute;
							top: 0;
							left: -100%;
							width: 100%;
							height: 100%;
							background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
							animation: shimmer 1.5s infinite;
						}
						
						@keyframes shimmer {
							0% { left: -100%; }
							100% { left: 100%; }
						}
						
						/* 响应式设计 */
						@media (max-width: 1024px) {
							.subscription-grid {
								grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
							}
						}
						
						@media (max-width: 768px) {
							.container {
								padding: 12px;
							}
							
							.header h1 {
								font-size: 1.8rem;
							}
							
							.header p {
								font-size: 1rem;
							}
							
							.card {
								padding: 18px;
								margin-bottom: 20px;
							}
							
							.card-title {
								font-size: 1.2rem;
							}
							
							.subscription-grid {
								grid-template-columns: 1fr;
								gap: 15px;
							}
							
							.sub-item {
								padding: 16px;
							}
							
							.sub-item h3 {
								font-size: 1.1rem;
							}
							
							.link-input-group {
								flex-direction: column;
								gap: 12px;
							}
							
							.link-input {
								min-width: auto;
								padding: 14px;
								font-size: 16px; /* 防止iOS缩放 */
							}
							
							.add-link-btn {
								padding: 14px 20px;
								font-size: 16px;
							}
							
							.saved-link-item {
								flex-direction: column;
								align-items: flex-start;
								gap: 10px;
							}
							
							.saved-link-item a {
								margin-right: 0;
								width: 100%;
							}
							
							.saved-link-item > div {
								width: 100%;
								justify-content: flex-end;
							}
							
							.link-management-controls {
								flex-direction: column;
								align-items: stretch;
							}
							
							.export-import-btn {
								padding: 12px 16px;
								font-size: 14px;
							}
							
							.converter-controls {
								flex-direction: column;
								align-items: stretch;
								gap: 12px;
							}
							
							.port-input {
								width: 100%;
								padding: 12px;
								font-size: 16px;
							}
							
							.convert-btn {
								padding: 12px 20px;
								font-size: 16px;
							}
							
							.editor {
								padding: 16px;
								font-size: 14px;
							}
							
							.save-container {
								flex-direction: column;
								align-items: stretch;
								gap: 10px;
							}
							
							.save-btn {
								padding: 14px 24px;
								font-size: 16px;
							}
						}
						
						@media (max-width: 480px) {
							.container {
								padding: 10px;
							}
							
							.header h1 {
								font-size: 1.6rem;
							}
							
							.card {
								padding: 15px;
							}
							
							.subscription-grid {
								gap: 12px;
							}
							
							.sub-item {
								padding: 14px;
							}
						}
					</style>
					<script src="https://cdn.jsdelivr.net/npm/@keeex/qrcodejs-kx@1.0.2/qrcode.min.js"></script>
					<script src="https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js"></script>
					<script>
						// 全局变量
						window.mytoken = '${mytoken}';
					</script>
				</head>
				<body>
					<div class="container">
						<div class="header">
							<h1>🚀 ${FileName} 订阅管理中心</h1>
							<p>现代化的订阅管理与转换工具</p>
						</div>
					
						<!-- 订阅链接卡片 -->
						<div class="card">
							<h2 class="card-title">📡 订阅链接</h2>
							<p style="margin-bottom: 20px; color: #666;">点击链接自动复制订阅地址并生成二维码</p>
							
							<div class="subscription-grid">
								<div class="sub-item" onclick="copyToClipboard('https://${url.hostname}/${mytoken}','qrcode_0')">
									<h3>🔄 自适应订阅</h3>
									<div class="url">https://${url.hostname}/${mytoken}</div>
									<div id="qrcode_0" class="qr-container"></div>
								</div>
								
								<div class="sub-item" onclick="copyToClipboard('https://${url.hostname}/${mytoken}?b64','qrcode_1')">
									<h3>📝 Base64订阅</h3>
									<div class="url">https://${url.hostname}/${mytoken}?b64</div>
									<div id="qrcode_1" class="qr-container"></div>
								</div>
								
								<div class="sub-item" onclick="copyToClipboard('https://${url.hostname}/${mytoken}?clash','qrcode_2')">
									<h3>⚔️ Clash订阅</h3>
									<div class="url">https://${url.hostname}/${mytoken}?clash</div>
									<div id="qrcode_2" class="qr-container"></div>
								</div>
								
								<div class="sub-item" onclick="copyToClipboard('https://${url.hostname}/${mytoken}?sb','qrcode_3')">
									<h3>📦 SingBox订阅</h3>
									<div class="url">https://${url.hostname}/${mytoken}?sb</div>
									<div id="qrcode_3" class="qr-container"></div>
								</div>
								
								<div class="sub-item" onclick="copyToClipboard('https://${url.hostname}/${mytoken}?surge','qrcode_4')">
									<h3>🌊 Surge订阅</h3>
									<div class="url">https://${url.hostname}/${mytoken}?surge</div>
									<div id="qrcode_4" class="qr-container"></div>
								</div>
								
								<div class="sub-item" onclick="copyToClipboard('https://${url.hostname}/${mytoken}?loon','qrcode_5')">
									<h3>🎈 Loon订阅</h3>
									<div class="url">https://${url.hostname}/${mytoken}?loon</div>
									<div id="qrcode_5" class="qr-container"></div>
								</div>
							</div>
						</div>
					
						<!-- 访客订阅卡片 -->
						<div class="card">
							<h2 class="card-title">👥 访客订阅</h2>
							<button class="toggle-btn" id="noticeToggle" onclick="toggleNotice()">查看访客订阅 ∨</button>
							
							<div id="noticeContent" class="guest-section" style="display: none;">
								<p style="margin-bottom: 15px; color: #e67e22; font-weight: 600;">⚠️ 访客订阅只能使用订阅功能，无法查看配置页！</p>
								<p style="margin-bottom: 20px;"><strong>GUEST TOKEN:</strong> <span style="color: #c0392b; font-weight: 600;">${guest}</span></p>
								
								<div class="subscription-grid">
									<div class="sub-item" onclick="copyToClipboard('https://${url.hostname}/sub?token=${guest}','guest_0')">
										<h3>🔄 自适应订阅</h3>
										<div class="url">https://${url.hostname}/sub?token=${guest}</div>
										<div id="guest_0" class="qr-container"></div>
									</div>
									
									<div class="sub-item" onclick="copyToClipboard('https://${url.hostname}/sub?token=${guest}&b64','guest_1')">
										<h3>📝 Base64订阅</h3>
										<div class="url">https://${url.hostname}/sub?token=${guest}&b64</div>
										<div id="guest_1" class="qr-container"></div>
									</div>
									
									<div class="sub-item" onclick="copyToClipboard('https://${url.hostname}/sub?token=${guest}&clash','guest_2')">
										<h3>⚔️ Clash订阅</h3>
										<div class="url">https://${url.hostname}/sub?token=${guest}&clash</div>
										<div id="guest_2" class="qr-container"></div>
									</div>
									
									<div class="sub-item" onclick="copyToClipboard('https://${url.hostname}/sub?token=${guest}&sb','guest_3')">
										<h3>📦 SingBox订阅</h3>
										<div class="url">https://${url.hostname}/sub?token=${guest}&sb</div>
										<div id="guest_3" class="qr-container"></div>
									</div>
									
									<div class="sub-item" onclick="copyToClipboard('https://${url.hostname}/sub?token=${guest}&surge','guest_4')">
										<h3>🌊 Surge订阅</h3>
										<div class="url">https://${url.hostname}/sub?token=${guest}&surge</div>
										<div id="guest_4" class="qr-container"></div>
									</div>
									
									<div class="sub-item" onclick="copyToClipboard('https://${url.hostname}/sub?token=${guest}&loon','guest_5')">
										<h3>🎈 Loon订阅</h3>
										<div class="url">https://${url.hostname}/sub?token=${guest}&loon</div>
										<div id="guest_5" class="qr-container"></div>
									</div>
								</div>
							</div>
						</div>
					
						<!-- 订阅转换配置信息 -->
						<div class="info-section">
							<h3>⚙️ 订阅转换配置</h3>
							<div class="info-item">
								<strong>SUBAPI（订阅转换后端）:</strong> ${subProtocol}://${subConverter}
							</div>
							<div class="info-item">
								<strong>SUBCONFIG（订阅转换配置文件）:</strong> ${subConfig}
							</div>
						</div>
					
						<!-- 链接保存管理 -->
						<div class="card">
							<h2 class="card-title">🔗 链接保存管理</h2>
							<div class="link-manager">
								<p style="margin-bottom: 15px; color: #2c3e50; font-weight: 500;">💡 保存常用链接，支持导出导入，数据存储在本地浏览器中</p>
								<div class="link-input-group">
									<input type="text" class="link-input" id="linkName" placeholder="输入链接名称（如：GitHub、文档等）">
									<input type="url" class="link-input" id="linkUrl" placeholder="输入完整链接地址（https://...）">
									<button class="add-link-btn" onclick="addLink()">💾 添加链接</button>
								</div>
								<div id="linkSaveStatus" role="status" aria-live="polite" style="margin-top: 10px;"></div>
								<div class="saved-links" id="savedLinks"></div>
								<div class="link-management-controls">
									<button class="export-import-btn" onclick="exportLinks()">📤 导出链接</button>
									<button class="export-import-btn" onclick="importLinks()">📥 导入链接</button>
								</div>
							</div>
						</div>
					
						<!-- SOCKS转换工具 -->
						<div class="card">
							<h2 class="card-title">🔧 SOCKS转换工具</h2>
							<div class="socks-converter">
								<p style="margin-bottom: 15px; color: #8e44ad; font-weight: 600;">将机场节点和自建节点任意协议转换为本地SOCKS节点，支持从订阅链接自动生成Clash规则文件</p>
								
								<!-- 转换模式选择 -->
								<div class="conversion-mode">
									<label class="mode-label">
										<input type="radio" name="conversionMode" value="subscription" checked>
										<span>📡 订阅链接转换</span>
									</label>
									<label class="mode-label">
										<input type="radio" name="conversionMode" value="yaml">
										<span>📄 YAML文件转换</span>
									</label>
									<label class="mode-label">
										<input type="radio" name="conversionMode" value="base64decode">
										<span>🔓 Base64解码转换</span>
									</label>
								</div>
								
								<!-- 订阅链接输入区域 -->
								<div id="subscriptionInput" class="input-section">
									<label>订阅链接：</label>
									<input type="url" class="subscription-url" id="subscriptionUrl" placeholder="输入订阅链接，例如：https://example.com/sub?token=xxx">
									<button class="fetch-btn" onclick="fetchSubscription()">📥 获取订阅</button>
								</div>
								
								<!-- YAML输入区域 -->
								<div id="yamlInput" class="input-section" style="display: none;">
									<label>YAML配置：</label>
									<div class="file-upload-container" style="margin-bottom: 10px;">
										<input type="file" id="yamlFileInput" accept=".yaml,.yml" style="display: none;">
										<button type="button" class="upload-file-btn" onclick="document.getElementById('yamlFileInput').click()">
											📁 选择YAML文件
										</button>
									</div>
									<textarea class="converter-input" id="inputYAML" placeholder="拖动YAML文件到此处或在此处粘贴节点配置"></textarea>
								</div>
								
								<!-- Base64解码输入区域 -->
								<div id="base64Input" class="input-section" style="display: none;">
									<label>Base64编码内容：</label>
									<textarea class="converter-input" id="inputBase64" placeholder="在此处粘贴Base64编码的节点配置内容"></textarea>
								</div>
								
								<div class="converter-controls">
									<label>起始端口：</label>
									<input type="number" class="port-input" id="startPort" min="1" step="1" value="42000">
									<button class="convert-btn" id="processButton" onclick="processConversion()">🔄 生成SOCKS配置</button>
								</div>
								
								<div class="converter-output">
									<p><strong>节点信息：</strong><span id="infoDiv" style="color: #e74c3c;"></span></p>
									<textarea class="converter-input" id="outputYAML" placeholder="生成结果" readonly></textarea>
									<div id="outputDiv" class="download-section">
										<h4 style="margin-bottom: 15px; color: #495057;">📥 下载和复制选项</h4>
										<a href="#" download="socks-config.yaml" class="download-btn" id="downloadLink" style="pointer-events: none; opacity: 0.5;">📄 下载YAML文件</a>
										<button class="copy-text-btn" onclick="copySOCKSConfig()" disabled style="opacity: 0.5;">📋 复制配置文本</button>
										<div style="margin-top: 15px; padding: 10px; background: #e9ecef; border-radius: 6px; font-size: 13px; color: #6c757d;">
											<strong>使用说明：</strong><br>
											1. 下载生成的YAML文件并导入到Clash客户端<br>
											2. 启动Clash后，每个节点将在对应端口提供SOCKS5代理服务<br>
											3. 在需要代理的应用中配置SOCKS5代理：127.0.0.1:端口号
										</div>
									</div>
								</div>
							</div>
						</div>
					
						<!-- 订阅编辑器 -->
						<div class="card">
							<h2 class="card-title">📝 ${FileName} 汇聚订阅编辑</h2>
							<div class="editor-container">
								${hasKV ? `
						<textarea class="editor" 
							placeholder="${decodeURIComponent(atob('TElOSyVFNyVBNCVCQSVFNCVCRSU4QiVFRiVCQyU4OCVFNCVCOCU4MCVFOCVBMSU4QyVFNCVCOCU4MCVFNCVCOCVBQSVFOCU4QSU4MiVFNyU4MiVCOSVFOSU5MyVCRSVFNiU4RSVBNSVFNSU4RCVCMyVFNSU4RiVBRiVFRiVCQyU4OSVFRiVCQyU5QQp2bGVzcyUzQSUyRiUyRjI0NmFhNzk1LTA2MzctNGY0Yy04ZjY0LTJjOGZiMjRjMWJhZCU0MDEyNy4wLjAuMSUzQTEyMzQlM0ZlbmNyeXB0aW9uJTNEbm9uZSUyNnNlY3VyaXR5JTNEdGxzJTI2c25pJTNEVEcuQ01MaXVzc3NzLmxvc2V5b3VyaXAuY29tJTI2YWxsb3dJbnNlY3VyZSUzRDElMjZ0eXBlJTNEd3MlMjZob3N0JTNEVEcuQ01MaXVzc3NzLmxvc2V5b3VyaXAuY29tJTI2cGF0aCUzRCUyNTJGJTI1M0ZlZCUyNTNEMjU2MCUyM0NGbmF0CnRyb2phbiUzQSUyRiUyRmFhNmRkZDJmLWQxY2YtNGE1Mi1iYTFiLTI2NDBjNDFhNzg1NiU0MDIxOC4xOTAuMjMwLjIwNyUzQTQxMjg4JTNGc2VjdXJpdHklM0R0bHMlMjZzbmklM0RoazEyLmJpbGliaWxpLmNvbSUyNmFsbG93SW5zZWN1cmUlM0QxJTI2dHlwZSUzRHRjcCUyNmhlYWRlclR5cGUlM0Rub25lJTIzSEsKc3MlM0ElMkYlMkZZMmhoWTJoaE1qQXRhV1YwWmkxd2IyeDVNVE13TlRveVJYUlFjVzQyU0ZscVZVNWpTRzlvVEdaVmNFWlJkMjVtYWtORFVUVnRhREZ0U21SRlRVTkNkV04xVjFvNVVERjFaR3RTUzBodVZuaDFielUxYXpGTFdIb3lSbTgyYW5KbmRERTRWelkyYjNCMGVURmxOR0p0TVdwNlprTm1RbUklMjUzRCU0MDg0LjE5LjMxLjYzJTNBNTA4NDElMjNERQoKCiVFOCVBRSVBMiVFOSU5OCU4NSVFOSU5MyVCRSVFNiU4RSVBNSVFNyVBNCVCQSVFNCVCRSU4QiVFRiVCQyU4OCVFNCVCOCU4MCVFOCVBMSU4QyVFNCVCOCU4MCVFNiU5RCVBMSVFOCVBRSVBMiVFOSU5OCU4NSVFOSU5MyVCRSVFNiU4RSVBNSVFNSU4RCVCMyVFNSU4RiVBRiVFRiVCQyU4OSVFRiVCQyU5QQpodHRwcyUzQSUyRiUyRnN1Yi54Zi5mcmVlLmhyJTJGYXV0bw=='))}"
							id="content">${content}</textarea>
						<div class="save-container">
							<button class="save-btn" onclick="saveContent(this)">保存</button>
							<span class="save-status" id="saveStatus"></span>
						</div>
						` : '<p>请绑定 <strong>变量名称</strong> 为 <strong>KV</strong> 的KV命名空间</p>'}
				</div>
				
				<!-- 页面底部信息 -->
				<div class="footer-info" style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 10px; text-align: center; color: #6c757d; font-size: 0.9rem;">
					<p style="margin-bottom: 10px;">📱 <strong>Telegram交流群:</strong> <a href="https://t.me/CMliussss" style="color: #007bff; text-decoration: none;">https://t.me/CMliussss</a></p>
					<p style="margin-bottom: 10px;">⭐ <strong>GitHub项目:</strong> <a href="https://github.com/cmliu/CF-Workers-SUB" style="color: #007bff; text-decoration: none;">https://github.com/cmliu/CF-Workers-SUB</a></p>
					<p style="margin: 0; font-size: 0.8rem;">User-Agent: ${request.headers.get('User-Agent')}</p>
				</div>
					<script>
// 全局函数定义 - 确保在DOM加载前就定义好所有函数

// 二维码和复制功能
function copyToClipboard(text, qrcode) {
	navigator.clipboard.writeText(text).then(() => {
		showToast('已复制');
	}).catch(err => {
		console.error(\`复制失败:\`, err);
	});
	
	// 显示所有二维码
	const allQrCodes = [
		{ id: 'qrcode_0', url: 'https://' + window.location.hostname + '/' + window.mytoken },
		{ id: 'qrcode_1', url: 'https://' + window.location.hostname + '/' + window.mytoken + '?b64' },
		{ id: 'qrcode_2', url: 'https://' + window.location.hostname + '/' + window.mytoken + '?clash' },
		{ id: 'qrcode_3', url: 'https://' + window.location.hostname + '/' + window.mytoken + '?sb' },
		{ id: 'qrcode_4', url: 'https://' + window.location.hostname + '/' + window.mytoken + '?surge' },
		{ id: 'qrcode_5', url: 'https://' + window.location.hostname + '/' + window.mytoken + '?loon' }
	];
	
	allQrCodes.forEach(qr => {
		const qrcodeDiv = document.getElementById(qr.id);
		if (qrcodeDiv) {
			qrcodeDiv.innerHTML = \`\`;
			new QRCode(qrcodeDiv, {
				text: qr.url,
				width: 220,
				height: 220,
				colorDark: \`#000000\`,
				colorLight: \`#ffffff\`,
				correctLevel: QRCode.CorrectLevel.Q,
				scale: 1
			});
			// 显示二维码容器
			qrcodeDiv.style.display = \`block\`;
		}
	});
}

// 切换通知显示
function toggleNotice() {
	const noticeContent = document.getElementById(\`noticeContent\`);
	const toggleBtn = document.getElementById(\`noticeToggle\`);
	if (noticeContent.style.display === \`none\`) {
		noticeContent.style.display = \`block\`;
		toggleBtn.textContent = \`隐藏访客订阅 ∧\`;
	} else {
		noticeContent.style.display = \`none\`;
		toggleBtn.textContent = \`查看访客订阅 ∨\`;
	}
}

// 添加链接功能
function addLink() {
	const nameInput = document.getElementById('linkName');
	const urlInput = document.getElementById('linkUrl');
	const status = document.getElementById('linkSaveStatus');
	const name = nameInput ? nameInput.value.trim() : '';
	const rawUrl = urlInput ? urlInput.value.trim() : '';
	const setStatus = (message, isError) => {
		if (!status) return;
		status.textContent = message;
		status.style.color = isError ? '#e74c3c' : '#198754';
	};

	if (!name || !rawUrl) {
		setStatus('请填写链接名称和链接地址。', true);
		return;
	}

	let parsedUrl;
	try {
		parsedUrl = new URL(rawUrl);
	} catch {
		setStatus('请输入有效的链接地址。', true);
		return;
	}
	if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
		setStatus('链接地址仅支持 http 或 https。', true);
		return;
	}

	let savedLinks;
	try {
		savedLinks = JSON.parse(localStorage.getItem('savedLinks') || '[]');
	} catch {
		savedLinks = [];
	}
	if (!Array.isArray(savedLinks)) savedLinks = [];

	const existingLink = savedLinks.find(link => link && link.name === name);
	if (existingLink) {
		existingLink.url = parsedUrl.href;
		existingLink.timestamp = new Date().toISOString();
		setStatus('同名链接已更新。', false);
	} else {
		savedLinks.push({
			name: name,
			url: parsedUrl.href,
			timestamp: new Date().toISOString()
		});
		setStatus('链接已保存。', false);
	}

	localStorage.setItem('savedLinks', JSON.stringify(savedLinks));
	displaySavedLinks();
	if (nameInput) nameInput.value = '';
	if (urlInput) urlInput.value = '';
}

// 导出链接功能
function exportLinks() {
	const savedLinks = JSON.parse(localStorage.getItem(\`savedLinks\`) || \`[]\`);
	if (savedLinks.length === 0) {
		alert(\`没有保存的链接\`);
		return;
	}
	
	const exportData = {
		version: \`1.0\`,
		exportTime: new Date().toISOString(),
		links: savedLinks
	};
	
	const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: \`application/json\` });
	const url = URL.createObjectURL(blob);
	const a = document.createElement(\`a\`);
	a.href = url;
	a.download = \`saved-links-\` + new Date().toISOString().split(\`T\`)[0] + \`.json\`;
	a.click();
	URL.revokeObjectURL(url);
}

// 导入链接功能
function importLinks() {
	const input = document.createElement(\`input\`);
	input.type = \`file\`;
	input.accept = \`.json\`;
	input.onchange = function(e) {
		const file = e.target.files[0];
		if (!file) return;
		
		const reader = new FileReader();
		reader.onload = function(e) {
			try {
				const importData = JSON.parse(e.target.result);
				const importedLinks = importData.links || [];
				
				if (!Array.isArray(importedLinks)) {
					alert(\`文件格式错误\`);
					return;
				}
				
				const savedLinks = JSON.parse(localStorage.getItem(\`savedLinks\`) || \`[]\`);
				let addedCount = 0;
				
				importedLinks.forEach(link => {
					if (link.name && link.url) {
						const existingIndex = savedLinks.findIndex(existing => existing.name === link.name);
						if (existingIndex >= 0) {
							savedLinks[existingIndex] = link;
						} else {
							savedLinks.push(link);
							addedCount++;
						}
					}
				});
				
				localStorage.setItem(\`savedLinks\`, JSON.stringify(savedLinks));
				displaySavedLinks();
				alert(\`成功导入 \` + importedLinks.length + \` 个链接\`);
			} catch (error) {
				alert(\`文件解析失败: \` + error.message);
			}
		};
		reader.readAsText(file);
	};
	input.click();
}

// 统一的轻量提示：复制成功不再弹出浏览器提示框
function showToast(message, type) {
	let container = document.getElementById('uiToastContainer');
	if (!container) {
		container = document.createElement('div');
		container.id = 'uiToastContainer';
		container.className = 'ui-toast-container';
		container.setAttribute('role', 'status');
		container.setAttribute('aria-live', 'polite');
		document.body.appendChild(container);
	}

	const toast = document.createElement('div');
	toast.className = 'ui-toast' + (type === 'error' ? ' is-error' : '');
	toast.textContent = message;
	container.appendChild(toast);

	window.requestAnimationFrame(() => toast.classList.add('is-visible'));
	window.setTimeout(() => {
		toast.classList.remove('is-visible');
		window.setTimeout(() => toast.remove(), 220);
	}, 1800);
}

function handleDeleteConfirmKeydown(event) {
	if (event.key === 'Escape') closeDeleteConfirm();
}

function closeDeleteConfirm() {
	const modal = document.getElementById('deleteConfirmModal');
	if (!modal) return;

	modal.classList.remove('is-open');
	modal.setAttribute('aria-hidden', 'true');
	document.body.classList.remove('modal-open');
	document.removeEventListener('keydown', handleDeleteConfirmKeydown);

	const previousFocus = modal._previousFocus;
	modal._onConfirm = null;
	modal._previousFocus = null;
	if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
}

function showDeleteConfirm(name, onConfirm) {
	const modal = document.getElementById('deleteConfirmModal');
	const message = document.getElementById('deleteConfirmMessage');
	const cancelButton = document.getElementById('deleteCancelBtn');
	const confirmButton = document.getElementById('deleteConfirmBtn');
	if (!modal || !message || !cancelButton || !confirmButton) {
		showToast('无法打开删除确认框，请刷新页面后重试。', 'error');
		return;
	}

	modal._previousFocus = document.activeElement;
	modal._onConfirm = onConfirm;
	message.textContent = '确定删除链接“' + name + '”吗？删除后无法恢复。';
	modal.classList.add('is-open');
	modal.setAttribute('aria-hidden', 'false');
	document.body.classList.add('modal-open');

	cancelButton.onclick = closeDeleteConfirm;
	confirmButton.onclick = function () {
		const action = modal._onConfirm;
		closeDeleteConfirm();
		if (typeof action === 'function') action();
	};
	modal.onclick = function (event) {
		if (event.target === modal) closeDeleteConfirm();
	};

	document.removeEventListener('keydown', handleDeleteConfirmKeydown);
	document.addEventListener('keydown', handleDeleteConfirmKeydown);
	window.setTimeout(() => cancelButton.focus(), 0);
}

// 复制链接到剪贴板
function copyLinkToClipboard(url) {
	navigator.clipboard.writeText(url).then(() => {
		showToast('已复制');
	}).catch(err => {
		console.error('复制失败:', err);
		showToast('复制失败，请手动复制', 'error');
	});
}

// 删除链接：使用屏幕中央的自定义确认框
function deleteLink(name) {
	showDeleteConfirm(name, function () {
		let savedLinks;
		try {
			savedLinks = JSON.parse(localStorage.getItem('savedLinks') || '[]');
		} catch {
			savedLinks = [];
		}
		if (!Array.isArray(savedLinks)) savedLinks = [];

		const filteredLinks = savedLinks.filter(link => link && link.name !== name);
		localStorage.setItem('savedLinks', JSON.stringify(filteredLinks));
		displaySavedLinks();
		showToast('链接已删除');
	});
}

// 抽象函数：解析YAML格式数据
function parseYAMLData(data) {
	try {
		const source = String(data || '').trim();
		if (!source) return [];

		const parseContent = (text) => {
			try {
				const parsed = jsyaml.load(text);
				if (parsed && Array.isArray(parsed.proxies)) {
					return parsed.proxies.filter(proxy => proxy && typeof proxy === 'object');
				}
			} catch (yamlError) {
				// 非 YAML 文本继续尝试逐行解析代理链接。
			}

			return text.split(/\\r?\\n/)
				.map(line => line.trim())
				.filter(line => line && !line.startsWith('#'))
				.map(line => parseProxyUrl(line))
				.filter(proxy => proxy !== null);
		};

		let proxies = parseContent(source);
		if (proxies.length > 0) return proxies;

		// 订阅服务常返回 Base64 编码的节点列表；先解码为 UTF-8，再解析 YAML 或节点链接。
		let compact = source.replace(/\\s/g, '').replace(/-/g, '+').replace(/_/g, '/');
		if (!/^[A-Za-z0-9+/]*={0,2}$/.test(compact)) return [];
		compact = compact.replace(/=+$/, '');
		compact += '='.repeat((4 - compact.length % 4) % 4);

		try {
			const binary = atob(compact);
			const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
			const decoded = new TextDecoder('utf-8').decode(bytes);
			if (decoded.trim() && decoded !== source) {
				proxies = parseContent(decoded);
				if (proxies.length > 0) return proxies;
			}
		} catch (decodeError) {
			// 原始内容不是有效的 Base64。
		}

		return [];
	} catch (error) {
		throw new Error('YAML数据解析失败: ' + error.message);
	}
}

// 抽象函数：显示节点数量信息
function displayNodeCount(count, infoDiv, startPort) {
	if (infoDiv) {
		if (startPort !== undefined) {
			infoDiv.innerHTML = \`共 \${count} 个节点，端口范围：\${startPort} - \${startPort + count - 1}\`;
			infoDiv.style.color = \`#28a745\`;
		} else {
			infoDiv.textContent = \`成功转换 \${count} 个代理配置\`;
		}
	}
}

// 抽象函数：生成标准Clash YAML格式配置
function generateClashYAMLConfig(proxies, startPort) {
	// 生成标准Clash YAML格式的配置
	const clashProxies = proxies.map((proxy, index) => {
		// 如果是Clash格式，直接使用
		if (proxy.type && proxy.server) {
			return proxy;
		}
		// 如果是其他格式，转换为Clash格式
		return {
			name: \`proxy\${index}\`,
			...proxy
		};
	}).filter(p => p !== null);
	
	if (clashProxies.length === 0) {
		throw new Error(\`未找到有效的代理配置\`);
	}
	
	const socksConfig = {
		'allow-lan': true,
		dns: {
			'enable': true,
			'enhanced-mode': \`fake-ip\`,
			'fake-ip-range': \`198.18.0.1/16\`,
			'default-nameserver': [\`114.114.114.114\`],
			'nameserver': [\`https://doh.pub/dns-query\`]
		},
		'listeners': [],
		'proxies': clashProxies
	};
	
	// 生成监听器配置
	socksConfig.listeners = clashProxies.map((proxy, i) => ({
		name: \`mixed\${i}\`,
		type: \`mixed\`,
		port: startPort + i,
		proxy: proxy.name
	}));
	
	// 转换为YAML字符串
	const yamlConfig = jsyaml.dump(socksConfig);
	
	return {
		yamlConfig,
		clashProxies
	};
}

// 抽象函数：生成复制和下载链接
function setupCopyAndDownload(yamlConfig, copyBtn, downloadLink, outputDiv) {
	// 复制配置文本的函数
	const copyConfig = () => {
		const outputYAML = document.getElementById(\`outputYAML\`);
		let textToCopy = outputYAML ? outputYAML.value : \`\`;
		
		// 如果是Base64模式或有存储的配置文本，使用存储的配置文本
		if (yamlConfig) {
			textToCopy = yamlConfig;
		}
		
		if (!textToCopy.trim()) {
			showToast('没有可复制的内容', 'error');
			return;
		}
		
		navigator.clipboard.writeText(textToCopy).then(() => {
			showToast('已复制');
		}).catch(err => {
			console.error(\`复制失败:\`, err);
			showToast('复制失败，请手动复制', 'error');
		});
	};
	
	// 设置下载链接
	const downloadData = \`data:text/yaml;charset=utf-8,\${encodeURIComponent(yamlConfig)}\`;
	if (downloadLink) {
		downloadLink.href = downloadData;
		downloadLink.download = \`socks-config.yaml\`;
		downloadLink.style.pointerEvents = \`auto\`;
		downloadLink.style.opacity = \`1\`;
	}
	
	// 启用复制按钮并绑定事件
	if (copyBtn) {
		copyBtn.disabled = false;
		copyBtn.style.opacity = \`1\`;
		copyBtn.onclick = copyConfig;
	}
	
	// 存储配置文本用于复制（保持向后兼容）
	window.socksConfigText = yamlConfig;
	// 将复制函数也存储到全局，供HTML内联事件使用
	window.copySOCKSConfig = copyConfig;
	
	// 如果有outputDiv，生成详细的下载和复制选项
	if (outputDiv) {
		const blob = new Blob([yamlConfig], {type: \`text/yaml\`});
		const downloadUrl = URL.createObjectURL(blob);
		
		outputDiv.innerHTML = \`
			<h4 style="margin-bottom: 15px; color: #495057;">📥 下载和复制选项</h4>
			<a href="\${downloadUrl}" download="socks-config.yaml" class="download-btn">📄 下载YAML文件</a>
			<button class="copy-text-btn" onclick="window.copySOCKSConfig()">📋 复制配置文本</button>
			<div style="margin-top: 15px; padding: 10px; background: #e9ecef; border-radius: 6px; font-size: 13px; color: #6c757d;">
				<strong>使用说明：</strong><br>
				1. 下载生成的YAML文件并导入到Clash客户端<br>
				2. 启动Clash后，每个节点将在对应端口提供SOCKS5代理服务<br>
				3. 在需要代理的应用中配置SOCKS5代理：127.0.0.1:端口号
			</div>
		\`;
	}
}

// 获取订阅功能
function fetchSubscription() {
	const urlInput = document.getElementById('subscriptionUrl');
	const infoDiv = document.getElementById('infoDiv');
	const outputYAML = document.getElementById('outputYAML');
	const copyBtn = document.querySelector('.copy-text-btn');
	const downloadLink = document.getElementById('downloadLink');
	const startPortInput = document.getElementById('startPort');
	const url = urlInput ? urlInput.value.trim() : '';

	if (!url) {
		infoDiv.textContent = '请输入订阅链接';
		return;
	}

	let subscriptionUrl;
	try {
		subscriptionUrl = new URL(url);
	} catch {
		infoDiv.textContent = '订阅链接格式无效';
		return;
	}
	if (!['http:', 'https:'].includes(subscriptionUrl.protocol)) {
		infoDiv.textContent = '订阅链接仅支持 http 或 https';
		return;
	}

	infoDiv.textContent = '正在获取订阅内容...';

	// 通过当前 Worker 同源代理请求订阅，避免浏览器直接访问第三方链接时被 CORS 拦截。
	const proxyUrl = new URL(window.location.href);
	proxyUrl.searchParams.set('fetchSubscription', subscriptionUrl.href);

	fetch(proxyUrl.toString(), {
		headers: { 'Accept': 'text/plain, application/yaml, */*' }
	})
		.then(response => {
			if (!response.ok) {
				throw new Error('HTTP ' + response.status);
			}
			return response.text();
		})
		.then(data => {
			try {
				const proxies = parseYAMLData(data);
				const startPort = parseInt(startPortInput.value, 10) || 42000;

				if (proxies.length === 0) {
					throw new Error('未找到有效的代理配置。请确认订阅返回的是 Clash YAML 或 Base64/节点链接格式。');
				}

				const { yamlConfig, clashProxies } = generateClashYAMLConfig(proxies, startPort);
				if (outputYAML) outputYAML.value = yamlConfig;
				displayNodeCount(clashProxies.length, infoDiv);
				setupCopyAndDownload(yamlConfig, copyBtn, downloadLink);
			} catch (parseError) {
				infoDiv.textContent = '解析订阅失败: ' + parseError.message;
				if (outputYAML) outputYAML.value = '';
				if (copyBtn) {
					copyBtn.disabled = true;
					copyBtn.style.opacity = '0.5';
				}
				if (downloadLink) {
					downloadLink.style.pointerEvents = 'none';
					downloadLink.style.opacity = '0.5';
				}
			}
		})
		.catch(error => {
			infoDiv.textContent = '获取订阅失败: ' + error.message;
			if (outputYAML) outputYAML.value = '';
			if (copyBtn) {
				copyBtn.disabled = true;
				copyBtn.style.opacity = '0.5';
			}
			if (downloadLink) {
				downloadLink.style.pointerEvents = 'none';
				downloadLink.style.opacity = '0.5';
			}
		});
}

// 处理转换功能
function processConversion() {
	const mode = document.querySelector('input[name="conversionMode"]:checked').value;
	if (mode === 'yaml') {
		processYAMLConversion();
	} else {
		processBase64Conversion();
	}
}

// 处理YAML转换
function processYAMLConversion() {
	const inputYAML = document.getElementById('inputYAML').value.trim();
	const startPort = parseInt(document.getElementById('startPort').value);
	const infoDiv = document.getElementById('infoDiv');
	const outputYAML = document.getElementById('outputYAML');
	const outputDiv = document.getElementById('outputDiv');
	
	if (!inputYAML) {
		infoDiv.textContent = '请输入YAML配置内容';
		infoDiv.style.color = '#dc3545';
		return;
	}
	
	try {
		// 解析YAML
		const yamlData = jsyaml.load(inputYAML);
		
		if (!yamlData || !yamlData.proxies || !Array.isArray(yamlData.proxies)) {
			throw new Error('YAML格式错误：未找到有效的proxies数组');
		}
		
		// 使用抽象的YAML解析函数处理代理数据
		const proxies = yamlData.proxies;
		
		// 使用统一的generateClashYAMLConfig函数生成配置
		const result = generateClashYAMLConfig(proxies, startPort);
		const socksYAMLString = result.yamlConfig;
		
		outputYAML.value = socksYAMLString;
		
		// 使用抽象的节点数量显示函数
		displayNodeCount(result.clashProxies.length, infoDiv, startPort);
		
		// 使用抽象的复制和下载链接生成函数
		setupCopyAndDownload(socksYAMLString, null, null, outputDiv);
		
	} catch (error) {
		console.error('转换失败:', error);
		infoDiv.textContent = \`转换失败: \${error.message}\`;
		infoDiv.style.color = '#dc3545';
		outputYAML.value = '';
		outputDiv.innerHTML = '';
	}
}

// 处理Base64转换
function processBase64Conversion() {
	const base64InputElement = document.getElementById('inputBase64');
	if (!base64InputElement) {
		console.error('inputBase64 element not found');
		return;
	}
	
	const base64Input = base64InputElement.value?.trim();
	const infoDiv = document.getElementById('infoDiv');
	const outputYAML = document.getElementById('outputYAML');
	const copyBtn = document.querySelector('.copy-text-btn');
	const downloadLink = document.getElementById('downloadLink');
	
	if (!base64Input) {
		return;
	}
	
	try {
		// 使用抽象的YAML解析函数
		const proxies = parseYAMLData(base64Input);
		
		if (proxies.length === 0) {
			throw new Error('未找到有效的代理配置');
		}
		
		// 使用抽象的生成Clash YAML配置函数
		const { yamlConfig, clashProxies } = generateClashYAMLConfig(proxies, 10000);
		
		// 显示在输出区域
		if (outputYAML) {
			outputYAML.value = yamlConfig;
		}
		
		// 使用抽象的节点数量显示函数
		displayNodeCount(clashProxies.length, infoDiv);
		
		// 使用抽象的复制和下载链接生成函数
		setupCopyAndDownload(yamlConfig, copyBtn, downloadLink);
		
	} catch (error) {
		if (infoDiv) infoDiv.textContent = \`转换失败: \${error.message}\`;
		if (outputYAML) outputYAML.value = '';
		if (copyBtn) {
			copyBtn.disabled = true;
			copyBtn.style.opacity = '0.5';
		}
		if (downloadLink) {
			downloadLink.style.pointerEvents = 'none';
			downloadLink.style.opacity = '0.5';
		}
	}
}

// 复制SOCKS配置
// copySOCKSConfig函数已合并到setupCopyAndDownload中，通过window.copySOCKSConfig访问

// 显示保存的链接
function displaySavedLinks() {
	const container = document.getElementById('savedLinks');
	if (!container) return;

	let savedLinks;
	try {
		savedLinks = JSON.parse(localStorage.getItem('savedLinks') || '[]');
	} catch {
		savedLinks = [];
	}
	if (!Array.isArray(savedLinks)) savedLinks = [];

	container.innerHTML = '';
	if (savedLinks.length === 0) {
		const emptyMessage = document.createElement('p');
		emptyMessage.style.color = '#666';
		emptyMessage.style.textAlign = 'center';
		emptyMessage.style.padding = '20px';
		emptyMessage.textContent = '暂无保存的链接';
		container.appendChild(emptyMessage);
		return;
	}

	savedLinks.forEach(link => {
		if (!link || typeof link.name !== 'string' || typeof link.url !== 'string') return;

		const item = document.createElement('div');
		item.className = 'saved-link-item';

		const info = document.createElement('div');
		info.className = 'link-info';

		const name = document.createElement('div');
		name.className = 'link-name';
		name.textContent = link.name;

		const urlElement = document.createElement('div');
		urlElement.className = 'link-url';
		try {
			const parsedUrl = new URL(link.url);
			if (['http:', 'https:'].includes(parsedUrl.protocol)) {
				const anchor = document.createElement('a');
				anchor.href = parsedUrl.href;
				anchor.target = '_blank';
				anchor.rel = 'noopener noreferrer';
				anchor.textContent = link.url;
				urlElement.appendChild(anchor);
			} else {
				urlElement.textContent = link.url;
			}
		} catch {
			urlElement.textContent = link.url;
		}

		const time = document.createElement('div');
		time.className = 'link-time';
		const timestamp = link.timestamp ? new Date(link.timestamp) : null;
		const savedAt = timestamp && !Number.isNaN(timestamp.getTime())
			? timestamp.toLocaleString()
			: '未知';
		time.textContent = '保存时间: ' + savedAt;

		info.appendChild(name);
		info.appendChild(urlElement);
		info.appendChild(time);

		const actions = document.createElement('div');
		actions.className = 'link-actions';

		const copyButton = document.createElement('button');
		copyButton.type = 'button';
		copyButton.className = 'copy-link-btn';
		copyButton.title = '复制链接';
		copyButton.textContent = '📋';
		copyButton.addEventListener('click', () => copyLinkToClipboard(link.url));

		const deleteButton = document.createElement('button');
		deleteButton.type = 'button';
		deleteButton.className = 'delete-link-btn';
		deleteButton.textContent = '删除';
		deleteButton.addEventListener('click', () => deleteLink(link.name));

		actions.appendChild(copyButton);
		actions.appendChild(deleteButton);
		item.appendChild(info);
		item.appendChild(actions);
		container.appendChild(item);
	});
}

// 切换转换模式
function switchConversionMode() {
	const mode = document.querySelector(\`input[name="conversionMode"]:checked\`).value;
	const subscriptionInput = document.getElementById(\`subscriptionInput\`);
	const yamlInput = document.getElementById(\`yamlInput\`);
	const base64Input = document.getElementById(\`base64Input\`);
	
	if (mode === \`subscription\`) {
		subscriptionInput.style.display = \`block\`;
		yamlInput.style.display = \`none\`;
		base64Input.style.display = \`none\`;
	} else if (mode === \`yaml\`) {
		subscriptionInput.style.display = \`none\`;
		yamlInput.style.display = \`block\`;
		base64Input.style.display = \`none\`;
	} else {
		subscriptionInput.style.display = \`none\`;
		yamlInput.style.display = \`none\`;
		base64Input.style.display = \`block\`;
	}
}

// 解析代理URL
function parseProxyUrl(url) {
	try {
		if (url.startsWith('vmess://')) {
			// VMess协议解析
			const decoded = atob(url.substring(8));
			const config = JSON.parse(decoded);
			return {
				type: 'vmess',
				server: config.add,
				port: config.port,
				uuid: config.id,
				alterId: config.aid || 0,
				cipher: config.scy || 'auto',
				network: config.net || 'tcp',
				tls: config.tls === 'tls',
				'ws-opts': config.net === 'ws' ? {
					path: config.path || '/',
					headers: { Host: config.host || config.add }
				} : undefined
			};
		} else if (url.startsWith('vless://')) {
			// VLESS协议暂不支持，过滤掉
			return null;
		} else if (url.startsWith('ss://')) {
			// Shadowsocks协议解析
			const decoded = atob(url.substring(5).split('#')[0]);
			const [method, password] = decoded.split(':');
			const [server, port] = password.split('@')[1].split(':');
			return {
				type: 'shadowsocks',
				server: server,
				port: parseInt(port),
				method: method,
				password: password.split('@')[0]
			};
		} else if (url.startsWith('ssr://')) {
			// ShadowsocksR协议解析
			const decoded = atob(url.substring(6));
			const parts = decoded.split(':');
			if (parts.length >= 6) {
				const [server, port, protocol, method, obfs, passwordBase64] = parts;
				const password = atob(passwordBase64.split('/?')[0]);
				return {
					type: 'ssr',
					server: server,
					port: parseInt(port),
					method: method,
					password: password,
					protocol: protocol,
					obfs: obfs
				};
			}
		} else if (url.startsWith('trojan://')) {
			// Trojan协议解析
			const urlObj = new URL(url);
			return {
				type: 'trojan',
				server: urlObj.hostname,
				port: parseInt(urlObj.port) || 443,
				password: urlObj.username,
				sni: urlObj.searchParams.get('sni') || urlObj.hostname,
				'skip-cert-verify': urlObj.searchParams.get('allowInsecure') === '1',
				network: urlObj.searchParams.get('type') || 'tcp',
				'ws-opts': urlObj.searchParams.get('type') === 'ws' ? {
					path: urlObj.searchParams.get('path') || '/'
				} : undefined
			};
		} else if (url.startsWith('hysteria2://') || url.startsWith('hy2://')) {
			// Hysteria2协议解析
			const urlObj = new URL(url);
			return {
				type: 'hysteria2',
				server: urlObj.hostname,
				port: parseInt(urlObj.port) || 443,
				auth: urlObj.username || urlObj.searchParams.get('auth'),
				'skip-cert-verify': urlObj.searchParams.get('insecure') === '1',
				sni: urlObj.searchParams.get('sni') || urlObj.hostname,
				'up-speed': parseInt(urlObj.searchParams.get('upmbps')) || 100,
				'down-speed': parseInt(urlObj.searchParams.get('downmbps')) || 100
			};
		} else if (url.startsWith('tuic://')) {
			// TUIC协议解析
			const urlObj = new URL(url);
			return {
				type: 'tuic',
				server: urlObj.hostname,
				port: parseInt(urlObj.port) || 443,
				uuid: urlObj.username,
				password: urlObj.password,
				version: parseInt(urlObj.searchParams.get('version')) || 5,
				'skip-cert-verify': urlObj.searchParams.get('allow_insecure') === '1',
				sni: urlObj.searchParams.get('sni') || urlObj.hostname,
				alpn: urlObj.searchParams.get('alpn') ? [urlObj.searchParams.get('alpn')] : ['h3']
			};
		} else if (url.startsWith('snell://')) {
			// Snell协议解析
			const urlObj = new URL(url);
			return {
				type: 'snell',
				server: urlObj.hostname,
				port: parseInt(urlObj.port) || 6160,
				psk: urlObj.username,
				version: parseInt(urlObj.searchParams.get('version')) || 4,
				'obfs-opts': {
					mode: urlObj.searchParams.get('obfs') || 'http',
					host: urlObj.searchParams.get('obfs-host') || urlObj.hostname
				}
			};
		} else if (url.startsWith('http://') || url.startsWith('https://')) {
			// HTTP/HTTPS代理解析
			const urlObj = new URL(url);
			return {
				type: 'http',
				server: urlObj.hostname,
				port: parseInt(urlObj.port) || (url.startsWith('https://') ? 443 : 80),
				username: urlObj.username || undefined,
				password: urlObj.password || undefined,
				tls: url.startsWith('https://')
			};
		} else if (url.startsWith('socks5://') || url.startsWith('socks://')) {
			// SOCKS5代理解析
			const urlObj = new URL(url);
			return {
				type: 'socks5',
				server: urlObj.hostname,
				port: parseInt(urlObj.port) || 1080,
				username: urlObj.username || undefined,
				password: urlObj.password || undefined
			};
		}
		return null;
	} catch (error) {
		console.error('解析代理URL失败:', error, 'URL:', url);
		return null;
	}
}

// 转换代理为SOCKS配置
function convertProxyToSocks(proxyInfo, port) {
	if (proxyInfo.type === 'vmess') {
		return \`listener socks-\${port} {
  type socks
  port \${port}
  proxy vmess {
    server \${proxyInfo.server}
    port \${proxyInfo.port}
    uuid \${proxyInfo.uuid}
    alter_id \${proxyInfo.alterId}
    cipher \${proxyInfo.cipher}
    network \${proxyInfo.network}
  }
}\`;
	} else if (proxyInfo.type === 'vless') {
		// VLESS协议暂不支持
		return null;
	} else if (proxyInfo.type === 'shadowsocks') {
		return \`listener socks-\${port} {
  type socks
  port \${port}
  proxy shadowsocks {
    server \${proxyInfo.server}
    port \${proxyInfo.port}
    method \${proxyInfo.method}
    password \${proxyInfo.password}
  }
}\`;
	} else if (proxyInfo.type === 'ssr') {
		return \`listener socks-\${port} {
  type socks
  port \${port}
  proxy ssr {
    server \${proxyInfo.server}
    port \${proxyInfo.port}
    method \${proxyInfo.method}
    password \${proxyInfo.password}
    protocol \${proxyInfo.protocol}
    obfs \${proxyInfo.obfs}
  }
}\`;
	} else if (proxyInfo.type === 'trojan') {
		return \`listener socks-\${port} {
  type socks
  port \${port}
  proxy trojan {
    server \${proxyInfo.server}
    port \${proxyInfo.port}
    password \${proxyInfo.password}
    sni \${proxyInfo.sni}
    skip_cert_verify \${proxyInfo['skip-cert-verify'] || false}
    network \${proxyInfo.network}
  }
}\`;
	} else if (proxyInfo.type === 'hysteria2') {
		return \`listener socks-\${port} {
  type socks
  port \${port}
  proxy hysteria2 {
    server \${proxyInfo.server}
    port \${proxyInfo.port}
    auth \${proxyInfo.auth}
    sni \${proxyInfo.sni}
    skip_cert_verify \${proxyInfo['skip-cert-verify'] || false}
    up_speed \${proxyInfo['up-speed']}mbps
    down_speed \${proxyInfo['down-speed']}mbps
  }
}\`;
	} else if (proxyInfo.type === 'tuic') {
		return \`listener socks-\${port} {
  type socks
  port \${port}
  proxy tuic {
    server \${proxyInfo.server}
    port \${proxyInfo.port}
    uuid \${proxyInfo.uuid}
    password \${proxyInfo.password}
    version \${proxyInfo.version}
    sni \${proxyInfo.sni}
    skip_cert_verify \${proxyInfo['skip-cert-verify'] || false}
  }
}\`;
	} else if (proxyInfo.type === 'snell') {
		return \`listener socks-\${port} {
  type socks
  port \${port}
  proxy snell {
    server \${proxyInfo.server}
    port \${proxyInfo.port}
    psk \${proxyInfo.psk}
    version \${proxyInfo.version}
    obfs_mode \${proxyInfo['obfs-opts']?.mode || 'http'}
    obfs_host \${proxyInfo['obfs-opts']?.host || proxyInfo.server}
  }
}\`;
	} else if (proxyInfo.type === 'http') {
		return \`listener socks-\${port} {
  type socks
  port \${port}
  proxy http {
    server \${proxyInfo.server}
    port \${proxyInfo.port}
    username \${proxyInfo.username || ''}
    password \${proxyInfo.password || ''}
    tls \${proxyInfo.tls}
  }
}\`;
	} else if (proxyInfo.type === 'socks5') {
		return \`listener socks-\${port} {
  type socks
  port \${port}
  proxy socks5 {
    server \${proxyInfo.server}
    port \${proxyInfo.port}
    username \${proxyInfo.username || ''}
    password \${proxyInfo.password || ''}
  }
}\`;
	}
	return null;
}

// 文件拖拽功能
function setupFileDrop() {
	// 文件处理配置
	const fileConfigs = [
		{
			elementId: 'yamlInput',
			highlightColor: '#f0f8ff',
			borderColor: null,
			validateFile: () => true,
			onFileLoad: (content, element) => {
				element.value = content;
			}
		},
		{
			elementId: 'inputYAML',
			highlightColor: '#f8f9ff',
			borderColor: '#667eea',
			validateFile: (file) => {
				return file.type === 'text/yaml' || file.name.endsWith('.yaml') || file.name.endsWith('.yml');
			},
			onFileLoad: (content, element) => {
				element.value = content;
				document.querySelector('input[name="conversionMode"][value="yaml"]').checked = true;
				switchConversionMode();
			},
			onInvalidFile: () => {
				alert('请拖拽YAML文件（.yaml或.yml格式）');
			}
		}
	];
	
	// 批量设置拖拽功能
	fileConfigs.forEach(config => {
		const element = document.getElementById(config.elementId);
		if (element) {
			setupElementDrop(element, {
				highlightColor: config.highlightColor,
				borderColor: config.borderColor,
				validateFile: config.validateFile,
				onFileLoad: (content) => config.onFileLoad(content, element),
				onInvalidFile: config.onInvalidFile
			});
		}
	});
	
	// 设置文件上传按钮事件（复用inputYAML的配置）
	const yamlFileInput = document.getElementById('yamlFileInput');
	const inputYAML = document.getElementById('inputYAML');
	if (yamlFileInput && inputYAML) {
		const yamlConfig = fileConfigs.find(config => config.elementId === 'inputYAML');
		yamlFileInput.addEventListener('change', (e) => {
			const file = e.target.files[0];
			if (file) {
				if (yamlConfig.validateFile(file)) {
					const reader = new FileReader();
					reader.onload = (event) => {
						yamlConfig.onFileLoad(event.target.result, inputYAML);
					};
					reader.readAsText(file);
				} else {
					alert('请选择YAML文件（.yaml或.yml格式）');
				}
				// 清空文件输入，允许重复选择同一文件
				e.target.value = '';
			}
		});
	}
}

// 通用的元素拖拽设置函数
function setupElementDrop(element, options) {
	const {
		highlightColor,
		borderColor,
		validateFile,
		onFileLoad,
		onInvalidFile
	} = options;
	
	// 阻止默认行为
	function preventDefaults(e) {
		e.preventDefault();
		e.stopPropagation();
	}
	
	// 高亮显示
	function highlight() {
		if (highlightColor) {
			element.style.backgroundColor = highlightColor;
		}
		if (borderColor) {
			element.style.borderColor = borderColor;
		}
	}
	
	// 取消高亮
	function unhighlight() {
		element.style.backgroundColor = '';
		if (borderColor) {
			element.style.borderColor = '#e0e0e0';
		}
	}
	
	// 处理文件拖拽
	function handleDrop(e) {
		preventDefaults(e);
		unhighlight();
		
		const files = e.dataTransfer.files;
		if (files.length > 0) {
			const file = files[0];
			if (validateFile(file)) {
				const reader = new FileReader();
				reader.onload = (event) => {
					onFileLoad(event.target.result);
				};
				reader.readAsText(file);
			} else if (onInvalidFile) {
				onInvalidFile();
			}
		}
	}
	
	// 绑定事件
	['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
		element.addEventListener(eventName, preventDefaults, false);
	});
	
	['dragenter', 'dragover'].forEach(eventName => {
		element.addEventListener(eventName, highlight, false);
	});
	
	['dragleave', 'drop'].forEach(eventName => {
		element.addEventListener(eventName, unhighlight, false);
	});
	
	element.addEventListener('drop', handleDrop, false);
}

// 编辑器相关功能 - 只在编辑器页面加载

// 编辑器相关功能
if (document.querySelector('.editor')) {
	let timer;
	const textarea = document.getElementById('content');
	const originalContent = textarea.value;

	function goBack() {
		const currentUrl = window.location.href;
		const parentUrl = currentUrl.substring(0, currentUrl.lastIndexOf('/'));
		window.location.href = parentUrl;
	}

	function replaceFullwidthColon() {
		const text = textarea.value;
		textarea.value = text.replace(/：/g, ':');
	}
	
	function saveContent(button) {
		try {
			// 验证button参数
			if (!button) {
				console.error('saveContent: button参数未定义');
				return;
			}
			
			const updateButtonText = (step) => {
				if (button && button.textContent !== undefined) {
					button.textContent = \`保存中: \${step}\`;
				}
			};
			
			const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
			
			if (!isIOS) {
				replaceFullwidthColon();
			}
			updateButtonText('开始保存');
			if (button) {
				button.disabled = true;
			}

			const textarea = document.getElementById('content');
			if (!textarea) {
				throw new Error('找不到文本编辑区域');
			}

			updateButtonText('获取内容');
			let newContent;
			let originalContent;
			try {
				newContent = textarea.value || '';
				originalContent = textarea.defaultValue || '';
			} catch (e) {
				console.error('获取内容错误:', e);
				throw new Error('无法获取编辑内容');
			}

			updateButtonText('准备状态更新函数');
			const updateStatus = (message, isError = false) => {
				const statusElem = document.getElementById('saveStatus');
				if (statusElem) {
					statusElem.textContent = message;
					statusElem.style.color = isError ? 'red' : '#666';
				}
			};

			updateButtonText('准备按钮重置函数');
			const resetButton = () => {
				if (button) {
					button.textContent = '保存';
					button.disabled = false;
				}
			};

			if (newContent !== originalContent) {
				updateButtonText('发送保存请求');
				fetch(window.location.href, {
					method: 'POST',
					body: newContent,
					headers: {
						'Content-Type': 'text/plain;charset=UTF-8'
					},
					cache: 'no-cache'
				})
				.then(response => {
					updateButtonText('检查响应状态');
					if (!response.ok) {
						throw new Error(\`HTTP error! status: \${response.status}\`);
					}
					updateButtonText('更新保存状态');
					const now = new Date().toLocaleString();
					document.title = \`编辑已保存 \${now}\`;
				updateStatus(\`已保存 \${now}\`);
				})
				.catch(error => {
					updateButtonText('处理错误');
					console.error('Save error:', error);
					updateStatus(\`保存失败: \${error.message}\`, true);
				})
				.finally(() => {
					resetButton();
				});
			} else {
				updateButtonText('检查内容变化');
				updateStatus('内容未变化');
				resetButton();
			}
		} catch (error) {
			console.error('保存过程出错:', error);
			if (button) {
				button.textContent = '保存';
				button.disabled = false;
			}
			const statusElem = document.getElementById('saveStatus');
			if (statusElem) {
				statusElem.textContent = \`错误: \${error.message}\`;
				statusElem.style.color = 'red';
			}
		}
	}

	textarea.addEventListener('blur', () => saveContent());
	textarea.addEventListener('input', () => {
		clearTimeout(timer);
		timer = setTimeout(() => saveContent(), 5000);
	});
}


// setupFileDrop函数已合并到上面的统一实现中

// 初始化函数
document.addEventListener('DOMContentLoaded', () => {
	const noticeContent = document.getElementById('noticeContent');
	if (noticeContent) {
		noticeContent.style.display = 'none';
	}
	
	displaySavedLinks();
	
	const modeRadios = document.querySelectorAll('input[name="conversionMode"]');
	modeRadios.forEach(radio => {
		radio.addEventListener('change', switchConversionMode);
	});
	
	switchConversionMode();
	setupFileDrop();
});
					</script>
				</body>
			</html>
		`;

		return new Response(html, {
			headers: { "Content-Type": "text/html;charset=utf-8" }
		});
	} catch (error) {
		console.error('处理请求时发生错误:', error);
		return new Response('服务器错误: ' + error.message, {
			status: 500,
			headers: { "Content-Type": "text/plain;charset=utf-8" }
		});
	}
}

