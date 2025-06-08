
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
let subConverter = "SUBAPI.cmliussss.net"; //在线订阅转换后端，目前使用CM的订阅转换功能。支持自建psub 可自行搭建https://github.com/bulianglin/psub
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
// 二维码和复制功能
function copyToClipboard(text, qrcode) {
	navigator.clipboard.writeText(text).then(() => {
		alert('已复制到剪贴板');
	}).catch(err => {
		console.error('复制失败:', err);
	});
	const qrcodeDiv = document.getElementById(qrcode);
	qrcodeDiv.innerHTML = '';
	new QRCode(qrcodeDiv, {
		text: text,
		width: 220,
		height: 220,
		colorDark: "#000000",
		colorLight: "#ffffff",
		correctLevel: QRCode.CorrectLevel.Q,
		scale: 1
	});
}

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
			const updateButtonText = (step) => {
				button.textContent = `保存中: ${step}`;
			};
			
			const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
			
			if (!isIOS) {
				replaceFullwidthColon();
			}
			updateButtonText('开始保存');
			button.disabled = true;

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
				button.textContent = '保存';
				button.disabled = false;
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
						throw new Error(`HTTP error! status: ${response.status}`);
					}
					updateButtonText('更新保存状态');
					const now = new Date().toLocaleString();
					document.title = `编辑已保存 ${now}`;
					updateStatus(`已保存 ${now}`);
				})
				.catch(error => {
					updateButtonText('处理错误');
					console.error('Save error:', error);
					updateStatus(`保存失败: ${error.message}`, true);
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
			button.textContent = '保存';
			button.disabled = false;
			const statusElem = document.getElementById('saveStatus');
			if (statusElem) {
				statusElem.textContent = `错误: ${error.message}`;
				statusElem.style.color = 'red';
			}
		}
	}

	textarea.addEventListener('blur', saveContent);
	textarea.addEventListener('input', () => {
		clearTimeout(timer);
		timer = setTimeout(saveContent, 5000);
	});
}

// 通知切换功能
function toggleNotice() {
	const noticeContent = document.getElementById('noticeContent');
	const noticeToggle = document.getElementById('noticeToggle');
	if (noticeContent.style.display === 'none' || noticeContent.style.display === '') {
		noticeContent.style.display = 'block';
		noticeToggle.textContent = '隐藏访客订阅∧';
	} else {
		noticeContent.style.display = 'none';
		noticeToggle.textContent = '查看访客订阅∨';
	}
}

// 链接管理功能
function addLink() {
	const nameInput = document.getElementById('linkName');
	const urlInput = document.getElementById('linkUrl');
	const name = nameInput.value.trim();
	const url = urlInput.value.trim();

	if (!name || !url) {
		alert('请输入链接名称和地址');
		return;
	}

	try {
		new URL(url);
	} catch {
		alert('请输入有效的链接地址');
		return;
	}

	let savedLinks = JSON.parse(localStorage.getItem('savedLinks') || '[]');
	
	if (savedLinks.some(link => link.name === name)) {
		if (!confirm('已存在相同名称的链接，是否覆盖？')) {
			return;
		}
		savedLinks = savedLinks.filter(link => link.name !== name);
	}

	savedLinks.push({ name, url, timestamp: Date.now() });
	localStorage.setItem('savedLinks', JSON.stringify(savedLinks));

	nameInput.value = '';
	urlInput.value = '';

	displaySavedLinks();
	alert('链接保存成功！');
}

function deleteLink(name) {
	if (!confirm('确定要删除这个链接吗？')) {
		return;
	}

	let savedLinks = JSON.parse(localStorage.getItem('savedLinks') || '[]');
	savedLinks = savedLinks.filter(link => link.name !== name);
	localStorage.setItem('savedLinks', JSON.stringify(savedLinks));
	displaySavedLinks();
}

function displaySavedLinks() {
	const container = document.getElementById('savedLinks');
	const savedLinks = JSON.parse(localStorage.getItem('savedLinks') || '[]');

	if (savedLinks.length === 0) {
		container.innerHTML = '<p style="text-align: center; color: #666; margin: 20px 0;">暂无保存的链接</p>';
		return;
	}

	savedLinks.sort((a, b) => b.timestamp - a.timestamp);

	container.innerHTML = savedLinks.map(link => `
		<div class="saved-link-item">
			<a href="${link.url}" target="_blank" title="${link.url}">${link.name}</a>
			<div>
				<button class="copy-link-btn" onclick="copyLinkToClipboard('${link.url}')" title="复制链接">📋</button>
				<button class="delete-link-btn" onclick="deleteLink('${link.name}')">删除</button>
			</div>
		</div>
	`).join('');
}

// 链接复制功能 - 移出displaySavedLinks函数
function copyLinkToClipboard(url) {
	navigator.clipboard.writeText(url).then(() => {
		alert('链接已复制到剪贴板');
	}).catch(err => {
		console.error('复制失败:', err);
		alert('复制失败，请手动复制');
	});
}

// 导出和导入功能 - 移出displaySavedLinks函数
function exportLinks() {
	const savedLinks = JSON.parse(localStorage.getItem('savedLinks') || '[]');
	if (savedLinks.length === 0) {
		alert('没有可导出的链接');
		return;
	}

	const dataStr = JSON.stringify(savedLinks, null, 2);
	const dataBlob = new Blob([dataStr], {type: 'application/json'});
	const url = URL.createObjectURL(dataBlob);
	const link = document.createElement('a');
	link.href = url;
	link.download = 'saved-links.json';
	link.click();
	URL.revokeObjectURL(url);
}

function importLinks() {
	const input = document.createElement('input');
	input.type = 'file';
	input.accept = '.json';
	input.onchange = function(e) {
		const file = e.target.files[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = function(e) {
			try {
				const importedLinks = JSON.parse(e.target.result);
				if (!Array.isArray(importedLinks)) {
					throw new Error('文件格式不正确');
				}

				const currentLinks = JSON.parse(localStorage.getItem('savedLinks') || '[]');
				const mergedLinks = [...currentLinks];
				
				importedLinks.forEach(importedLink => {
					if (!mergedLinks.some(link => link.name === importedLink.name)) {
						mergedLinks.push(importedLink);
					}
				});

				localStorage.setItem('savedLinks', JSON.stringify(mergedLinks));
				displaySavedLinks();
				alert(`成功导入 ${importedLinks.length} 个链接`);
			} catch (error) {
				alert('导入失败：' + error.message);
			}
		};
		reader.readAsText(file);
	};
	input.click();
}

// SOCKS转换功能
function switchConversionMode() {
	const subscriptionMode = document.querySelector('input[name="conversionMode"][value="subscription"]').checked;
	const yamlMode = document.querySelector('input[name="conversionMode"][value="yaml"]').checked;
	const base64Mode = document.querySelector('input[name="conversionMode"][value="base64decode"]').checked;
	
	const subscriptionInput = document.getElementById('subscriptionInput');
	const yamlInput = document.getElementById('yamlInput');
	const base64Input = document.getElementById('base64Input');
	
	if (subscriptionMode) {
		subscriptionInput.style.display = 'block';
		yamlInput.style.display = 'none';
		base64Input.style.display = 'none';
	} else if (yamlMode) {
		subscriptionInput.style.display = 'none';
		yamlInput.style.display = 'block';
		base64Input.style.display = 'none';
	} else if (base64Mode) {
		subscriptionInput.style.display = 'none';
		yamlInput.style.display = 'none';
		base64Input.style.display = 'block';
	}
}

async function fetchSubscription() {
	const url = document.getElementById('subscriptionUrl').value.trim();
	const infoDiv = document.getElementById('infoDiv');
	const inputYAML = document.getElementById('inputYAML');
	
	if (!url) {
		infoDiv.textContent = '请输入订阅链接';
		return;
	}
	
	try {
		infoDiv.textContent = '正在获取订阅内容...';
		infoDiv.style.color = '#17a2b8';
		
		let clashUrl = url;
		if (!url.includes('clash') && !url.includes('yaml')) {
			clashUrl = url + (url.includes('?') ? '&clash' : '?clash');
		}
		
		let content;
		
		try {
			const directResponse = await fetch(clashUrl, {
				mode: 'cors',
				headers: {
					'Accept': 'text/plain, application/x-yaml, text/yaml',
					'User-Agent': 'ClashforWindows/0.18.1'
				}
			});
			if (directResponse.ok) {
				content = await directResponse.text();
			} else {
				throw new Error('直接访问失败');
			}
		} catch (directError) {
			throw new Error('无法自动获取订阅内容，这可能是由于CORS限制。请手动复制订阅内容并切换到"YAML文件转换"模式进行转换。');
		}
			
		if (content.trim().startsWith('proxies:') || content.includes('proxies:')) {
			inputYAML.value = content;
			infoDiv.textContent = '订阅内容获取成功，已自动填入YAML配置区域';
			infoDiv.style.color = '#28a745';
			
			document.querySelector('input[name="conversionMode"][value="yaml"]').checked = true;
			switchConversionMode();
		} else {
			throw new Error('获取的内容不是有效的Clash YAML格式');
		}
	} catch (error) {
		console.error('获取订阅失败:', error);
		infoDiv.textContent = `获取订阅失败: ${error.message}`;
		infoDiv.style.color = '#dc3545';
	}
}

function processConversion() {
	const subscriptionMode = document.querySelector('input[name="conversionMode"][value="subscription"]').checked;
	const yamlMode = document.querySelector('input[name="conversionMode"][value="yaml"]').checked;
	const base64Mode = document.querySelector('input[name="conversionMode"][value="base64decode"]').checked;
	
	if (subscriptionMode) {
		fetchSubscription().then(() => {
			setTimeout(() => {
				processYAMLConversion();
			}, 1000);
		});
	} else if (yamlMode) {
		processYAMLConversion();
	} else if (base64Mode) {
		processBase64Conversion();
	}
}

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
		// 检查jsyaml是否可用
		if (typeof jsyaml === 'undefined') {
			throw new Error('YAML解析库未加载，请确保引入了js-yaml库');
		}
		
		const yamlData = jsyaml.load(inputYAML);
		
		if (!yamlData || !yamlData.proxies || !Array.isArray(yamlData.proxies)) {
			throw new Error('YAML格式错误：未找到有效的proxies数组');
		}
		
		const numProxies = yamlData.proxies.length;
		
		const socksConfig = {
			'allow-lan': true,
			dns: {
				enable: true,
				'enhanced-mode': 'fake-ip',
				'fake-ip-range': '198.18.0.1/16',
				'default-nameserver': ['114.114.114.114'],
				nameserver: ['https://doh.pub/dns-query']
			},
			listeners: [],
			proxies: yamlData.proxies
		};
		
		socksConfig.listeners = Array.from({length: numProxies}, (_, i) => ({
			name: `mixed${i}`,
			type: 'mixed',
			port: startPort + i,
			proxy: yamlData.proxies[i].name
		}));
		
		const socksYAMLString = jsyaml.dump(socksConfig);
		outputYAML.value = socksYAMLString;
		
		infoDiv.innerHTML = `共 ${numProxies} 个节点，端口范围：${startPort} - ${startPort + numProxies - 1}`;
		infoDiv.style.color = '#28a745';
		
		const blob = new Blob([socksYAMLString], {type: 'text/yaml'});
		const downloadUrl = URL.createObjectURL(blob);
		
		// 更新下载链接和启用按钮
		const downloadLink = document.getElementById('downloadLink');
		const copyButton = outputDiv.querySelector('.copy-text-btn');
		
		downloadLink.href = downloadUrl;
		downloadLink.style.pointerEvents = 'auto';
		downloadLink.style.opacity = '1';
		
		copyButton.disabled = false;
		copyButton.style.opacity = '1';
		
	} catch (error) {
		console.error('转换失败:', error);
		infoDiv.textContent = `转换失败: ${error.message}`;
		infoDiv.style.color = '#dc3545';
		outputYAML.value = '';
		
		// 重置按钮状态
		const downloadLink = document.getElementById('downloadLink');
		const copyButton = outputDiv.querySelector('.copy-text-btn');
		
		downloadLink.href = '#';
		downloadLink.style.pointerEvents = 'none';
		downloadLink.style.opacity = '0.5';
		
		copyButton.disabled = true;
		copyButton.style.opacity = '0.5';
	}
}

function processBase64Conversion() {
	const inputBase64 = document.getElementById('inputBase64').value.trim();
	const startPort = parseInt(document.getElementById('startPort').value);
	const infoDiv = document.getElementById('infoDiv');
	const outputYAML = document.getElementById('outputYAML');
	const outputDiv = document.getElementById('outputDiv');
	
	if (!inputBase64) {
		infoDiv.textContent = '请输入Base64编码内容';
		infoDiv.style.color = '#dc3545';
		return;
	}
	
	try {
		let decodedContent;
		try {
			decodedContent = atob(inputBase64);
		} catch (e) {
			throw new Error('Base64解码失败，请检查输入内容是否为有效的Base64编码');
		}
		
		const lines = decodedContent.split('\n').filter(line => line.trim());
		
		if (lines.length === 0) {
			throw new Error('解码后的内容为空');
		}
		
		const socksConfigLines = [];
		let validProxyCount = 0;
		
		lines.forEach((line, index) => {
			const trimmedLine = line.trim();
			if (trimmedLine && (trimmedLine.includes('://') || trimmedLine.startsWith('ss://') || trimmedLine.startsWith('vmess://') || trimmedLine.startsWith('vless://') || trimmedLine.startsWith('trojan://') || trimmedLine.startsWith('socks5://') || trimmedLine.startsWith('http://'))) {
				const socksConfig = convertProxyToSocks(trimmedLine, startPort + validProxyCount);
				if (socksConfig) {
					socksConfigLines.push(socksConfig);
					validProxyCount++;
				}
			}
		});
		
		if (socksConfigLines.length === 0) {
			throw new Error('未找到有效的代理配置');
		}
		
		const socksConfigContent = [
			'# SOCKS代理配置文件',
			'# 生成时间: ' + new Date().toLocaleString(),
			'# 节点数量: ' + validProxyCount,
			'# 端口范围: ' + startPort + ' - ' + (startPort + validProxyCount - 1),
			'',
			...socksConfigLines
		].join('\n');
		
		outputYAML.value = socksConfigContent;
		
		infoDiv.innerHTML = `共解析 ${validProxyCount} 个有效节点，端口范围：${startPort} - ${startPort + validProxyCount - 1}`;
		infoDiv.style.color = '#28a745';
		
		const blob = new Blob([socksConfigContent], {type: 'text/plain'});
		const downloadUrl = URL.createObjectURL(blob);
		
		// 更新下载链接和启用按钮
		const downloadLink = document.getElementById('downloadLink');
		const copyButton = outputDiv.querySelector('.copy-text-btn');
		
		downloadLink.href = downloadUrl;
		downloadLink.download = 'socks_config.txt';
		downloadLink.textContent = '📄 下载SOCKS配置文件';
		downloadLink.style.pointerEvents = 'auto';
		downloadLink.style.opacity = '1';
		
		copyButton.disabled = false;
		copyButton.style.opacity = '1';
		
		// 更新使用说明
		const usageDiv = outputDiv.querySelector('div[style*="background: #e9ecef"]');
		usageDiv.innerHTML = `
			<strong>使用说明：</strong><br>
			1. 下载生成的SOCKS配置文件<br>
			2. 每行包含一个代理节点的SOCKS配置信息<br>
			3. 可以根据需要选择对应端口的代理服务<br>
			4. 配置格式：节点名称 | 协议://地址:端口 | SOCKS端口
		`;
		
	} catch (error) {
		console.error('Base64转换失败:', error);
		infoDiv.textContent = `转换失败: ${error.message}`;
		infoDiv.style.color = '#dc3545';
		outputYAML.value = '';
		
		// 重置按钮状态
		const downloadLink = document.getElementById('downloadLink');
		const copyButton = outputDiv.querySelector('.copy-text-btn');
		
		downloadLink.href = '#';
		downloadLink.style.pointerEvents = 'none';
		downloadLink.style.opacity = '0.5';
		
		copyButton.disabled = true;
		copyButton.style.opacity = '0.5';
	}
}

function convertProxyToSocks(proxyUrl, socksPort) {
	try {
		let nodeName = 'Node-' + socksPort;
		if (proxyUrl.includes('#')) {
			nodeName = decodeURIComponent(proxyUrl.split('#')[1]) || nodeName;
		}
		
		if (proxyUrl.startsWith('socks5://') || proxyUrl.startsWith('socks4://')) {
			const url = new URL(proxyUrl);
			return `${nodeName} | ${url.protocol}//${url.hostname}:${url.port || (url.protocol === 'socks5:' ? '1080' : '1080')} | SOCKS端口: ${socksPort}`;
		} else if (proxyUrl.startsWith('http://') || proxyUrl.startsWith('https://')) {
			const url = new URL(proxyUrl);
			return `${nodeName} | ${url.protocol}//${url.hostname}:${url.port || (url.protocol === 'https:' ? '443' : '80')} | SOCKS端口: ${socksPort}`;
		} else if (proxyUrl.startsWith('ss://')) {
			return `${nodeName} | SS代理 | SOCKS端口: ${socksPort}`;
		} else if (proxyUrl.startsWith('vmess://')) {
			return `${nodeName} | VMess代理 | SOCKS端口: ${socksPort}`;
		} else if (proxyUrl.startsWith('vless://')) {
			return `${nodeName} | VLess代理 | SOCKS端口: ${socksPort}`;
		} else if (proxyUrl.startsWith('trojan://')) {
			return `${nodeName} | Trojan代理 | SOCKS端口: ${socksPort}`;
		} else {
			return `${nodeName} | 未知协议 | SOCKS端口: ${socksPort}`;
		}
	} catch (error) {
		console.error('解析代理URL失败:', error);
		return null;
	}
}

function copySOCKSConfig() {
	const outputYAML = document.getElementById('outputYAML');
	if (outputYAML.value) {
		navigator.clipboard.writeText(outputYAML.value).then(() => {
			alert('SOCKS配置已复制到剪贴板');
		}).catch(err => {
			console.error('复制失败:', err);
			alert('复制失败，请手动选择文本复制');
		});
	} else {
		alert('没有可复制的配置内容');
	}
}

function setupFileDrop() {
	const inputYAML = document.getElementById('inputYAML');
	if (inputYAML) {
		inputYAML.addEventListener('dragover', (e) => {
			e.preventDefault();
			e.stopPropagation();
			inputYAML.style.borderColor = '#667eea';
			inputYAML.style.backgroundColor = '#f8f9ff';
		});
		
		inputYAML.addEventListener('dragleave', (e) => {
			e.preventDefault();
			e.stopPropagation();
			inputYAML.style.borderColor = '#e0e0e0';
			inputYAML.style.backgroundColor = '';
		});
		
		inputYAML.addEventListener('drop', (e) => {
			e.preventDefault();
			e.stopPropagation();
			inputYAML.style.borderColor = '#e0e0e0';
			inputYAML.style.backgroundColor = '';
			
			const files = e.dataTransfer.files;
			if (files.length > 0) {
				const file = files[0];
				if (file.type === 'text/yaml' || file.name.endsWith('.yaml') || file.name.endsWith('.yml')) {
					const reader = new FileReader();
					reader.onload = (event) => {
						inputYAML.value = event.target.result;
						document.querySelector('input[name="conversionMode"][value="yaml"]').checked = true;
						switchConversionMode();
					};
					reader.readAsText(file);
				} else {
					alert('请拖拽YAML文件（.yaml或.yml格式）');
				}
			}
		});
	}
}

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
		return new Response("服务器错误: " + error.message, {
			status: 500,
			headers: { "Content-Type": "text/plain;charset=utf-8" }
		});
	}
}
