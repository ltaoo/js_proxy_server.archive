const https = require("https");
const http = require("http");
const url = require("url");
const net = require("net");

// 代理服务器的配置
const proxyHost = "127.0.0.1";
const proxyPort = 7890;

// 目标URL
const targetUrl = "https://www.v2ex.com/";
const parsedUrl = new url.URL(targetUrl);

// 首先创建到代理服务器的 CONNECT 隧道
const req = http.request({
  host: proxyHost,
  port: proxyPort,
  method: 'CONNECT',
  path: `${parsedUrl.hostname}:${parsedUrl.port || 443}`
});

req.on('connect', (res, socket, head) => {
  console.log('代理隧道已建立');

  // 通过隧道发送 HTTPS 请求
  const options = {
    socket: socket, // 使用已建立的隧道
    agent: false,   // 禁用默认的 agent
    hostname: parsedUrl.hostname,
    path: parsedUrl.pathname + parsedUrl.search,
    method: "GET",
    headers: {
      Host: parsedUrl.host,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
      cookie: 'V2EX_LANG=zhcn; _ga=GA1.2.2004398187.1733893180; A2="2|1:0|10:1733893191|2:A2|48:ZjQ1MjAzYmQtZWIyMC00OGE1LWEzZjktMzczOGVlZjUyN2Vi|c4489663151fcc7184f13f07626ff418ad6e488f65d9038a3fbe62e67a0c623a"; _gid=GA1.2.735409265.1738511674; V2EX_REFERRER="2|1:0|10:1739104734|13:V2EX_REFERRER|16:SGFycGVyTHVja3k=|2f01bfea667026a8ec7c2fa555a7223d221b572a865f324a23ccca2d937418b7"; PB3_SESSION="2|1:0|10:1739168643|11:PB3_SESSION|36:djJleDoxMjguMS4yNDguMTAzOjcwMDQ2Mjc5|49d8e85cabc75f8f2762bc1734fc2a7921763ff6cbdc9019d7b737f3dc8fcf3d"; A2O="2|1:0|10:1739190060|3:A2O|48:ZjQ1MjAzYmQtZWIyMC00OGE1LWEzZjktMzczOGVlZjUyN2Vi|7ad17283be6a0af921c51388d22c245bba574d9022b2e3f887d7b2e3d4f1fb5b"; V2EX_TAB="2|1:0|10:1739190060|8:V2EX_TAB|4:YWxs|965f30d6a5d3dabb04cfdf2c4dfb5462b5029bd474694253d687dc3288c42752"; _ga_5RR9SH3ZV1=GS1.2.1739188390.300.1.1739190061.0.0.0; FCNEC=%5B%5B%22AKsRol_sFHfD2TTJx5UEaf8GULxTlUwjzADoBuXYiABaKpo4vRggpKcobMJmTpEVQL1nyVqYrkN8BJkW99tan4Gg96ymGd-l0gDMezACdBE8eLO4eRzH1zp4h_X2tqxZhZAZ_u3MZOq9nx2RHnBxFvhcFDg3yuvdYQ%3D%3D%22%5D%5D',
      priority: "u=0, i",
      "sec-ch-ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"macOS"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "none",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    }
  };

  const httpsReq = https.request(options, (res) => {
    console.log(`状态码: ${res.statusCode}`);
    console.log(`响应头: ${JSON.stringify(res.headers)}`);

    let data = "";
    res.setEncoding("utf8");

    res.on("data", (chunk) => {
      data += chunk;
    });

    res.on("end", () => {
      console.log("响应数据接收完成");
      console.log("数据长度:", data.length);
      // console.log('响应内容:', data);  // 如果需要查看响应内容，取消注释
    });
  });

  httpsReq.on("error", (e) => {
    console.error(`HTTPS 请求出错: ${e.message}`);
  });

  httpsReq.end();
});

req.on("error", (e) => {
  console.error(`建立代理隧道时出错: ${e.message}`);
});

req.end();
