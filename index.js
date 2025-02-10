const http = require("http");
const https = require("https");
const net = require("net");
const fs = require("fs");
const url = require("url");
const zlib = require("zlib");

const forge = require("node-forge");

// 读取根证书和私钥
const ca_cert_pem = fs.readFileSync("./cert/certificate.crt", "utf8");
const ca_key_pem = fs.readFileSync("./cert/private.key", "utf8");
const ca_cert = forge.pki.certificateFromPem(ca_cert_pem);
const ca_key = forge.pki.privateKeyFromPem(ca_key_pem);

// 创建 HTTP 代理服务器
const server = http.createServer();
server.on("connect", (req, clientSocket, head) => {
  const [hostname, port] = req.url.split(":");
  const targetPort = parseInt(port) || 443;

  console.log(`HTTPS CONNECT request for: ${hostname}:${targetPort}`);

  // 生成域名证书
  const { key, cert } = generate_certificate(hostname);

  // 创建 HTTPS 服务器
  const httpsServer = https.createServer(
    {
      key: key,
      cert: cert,
      rejectUnauthorized: false,
    },
    handleHttpsRequest
  );

  httpsServer.listen(0, () => {
    const serverPort = httpsServer.address().port;

    // 连接到本地 HTTPS 服务器
    const serverSocket = net.connect(serverPort, "localhost", () => {
      clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
      serverSocket.write(head);
      serverSocket.pipe(clientSocket);
      clientSocket.pipe(serverSocket);
    });

    serverSocket.on("error", (err) => {
      console.error("Server socket error:", err);
      clientSocket.end();
    });
  });

  clientSocket.on("error", (err) => {
    console.error("Client socket error:", err);
    httpsServer.close();
  });
});
server.listen(8080, () => {
  console.log("Proxy server listening on port 8080");
});

// 处理 HTTPS 请求
function handleHttpsRequest(req, res) {
  const urlObj = url.parse(req.url);

  // 收集请求体数据
  let requestBody = "";
  req.on("data", (chunk) => {
    requestBody += chunk.toString();
  });

  req.on("end", () => {
    // 打印请求信息
    // console.log("\n=== HTTPS Request ===");
    // console.log(`Method: ${req.method}`);
    // console.log(`URL: ${req.url}`);
    // console.log("Headers:", req.headers);
    // console.log("Body:", requestBody);
    // console.log("==================\n");
    // console.log(urlObj.pathname);
    // 检查是否匹配 /some_special_path.js
    if (urlObj.pathname.endsWith("/some_special_path.js")) {
      console.log("Intercepting index.js request:", urlObj.pathname);
      res.writeHead(200, {
        "Content-Type": "application/javascript",
        "Content-Length": Buffer.byteLength('alert("hello")'),
      });
      return res.end('alert("hello")');
    }

    // 代理服务器的配置
    const proxyServer = null;
    // const proxyServer = {
    //   host: "127.0.0.1",
    //   port: 7890,
    // };

    // 转发请求到目标服务器
    const options = proxyServer
      ? {
          // 暂时不支持
        }
      : {
          hostname: req.headers.host.split(":")[0],
          port: 443,
          path: req.url,
          method: req.method,
          headers: req.headers,
          rejectUnauthorized: false,
        };

    const proxyReq = https.request(options, (proxyRes) => {
      let responseBody = "";
      let rawBody = Buffer.from([]);

      // proxyRes.on("error", (err) => {
      //   console.error("Proxy response error:", err);
      //   if (!res.headersSent) {
      //     res.writeHead(502, {
      //       "Content-Type": "application/json",
      //     });
      //     res.end(JSON.stringify({ error: "Proxy Response Error" }));
      //   }
      // });
      proxyRes.on("data", (chunk) => {
        responseBody += chunk.toString();
        rawBody = Buffer.concat([rawBody, chunk]);
      });

      proxyRes.on("end", () => {
        console.log("\n=== HTTPS Response ===");
        console.log(`ContentType: ${proxyRes.headers["content-type"]}`);
        console.log(
          `ContentEncoding: ${proxyRes.headers["content-encoding"] || "none"}`
        );
        console.log("==================\n");

        // 修改响应头
        const modifiedHeaders = {
          ...proxyRes.headers,
          __extra_from_proxy_server: "true",
        };

        // 如果是 JSON 响应，可以修改响应体
        if (proxyRes.headers["content-type"]?.includes("application/json")) {
          try {
            // 根据 Content-Encoding 解码响应体
            let decodedBody = rawBody;
            const contentEncoding = proxyRes.headers["content-encoding"];

            if (contentEncoding) {
              if (contentEncoding.includes("gzip")) {
                decodedBody = zlib.gunzipSync(rawBody);
              } else if (contentEncoding.includes("deflate")) {
                decodedBody = zlib.inflateSync(rawBody);
              } else if (contentEncoding.includes("br")) {
                decodedBody = zlib.brotliDecompressSync(rawBody);
              }
            }
            console.log("Before parse Body", decodedBody.toString());
            let jsonBody = JSON.parse(decodedBody.toString());
            // 修改 JSON 数据
            jsonBody.modified = true;

            // 转换回字符串
            const modifiedBody = JSON.stringify(jsonBody);

            // 更新 content-length 并移除 content-encoding
            modifiedHeaders["content-length"] = Buffer.byteLength(modifiedBody);
            delete modifiedHeaders["content-encoding"];

            // 发送修改后的响应
            res.writeHead(proxyRes.statusCode, modifiedHeaders);
            res.end(modifiedBody);
            return;
          } catch (e) {
            console.error("Error processing response:", e);
          }
        }
        // 如果不是 JSON 或解析失败，发送原始响应
        res.writeHead(proxyRes.statusCode, modifiedHeaders);
        res.end(rawBody);
      });

      // proxyRes.pipe(res);

      // proxyReq.write(requestBody);
      // proxyReq.end();
    });

    // 添加超时处理
    const TIMEOUT = 5000; // 增加超时时间到5秒
    const timeoutId = setTimeout(() => {
      if (!res.headersSent) {
        proxyReq.destroy(new Error("Request timeout"));
        console.log(`Request timeout for: ${req.url}`);
        res.writeHead(504, {
          "Content-Type": "application/json",
        });
        res.end(JSON.stringify({ error: "Request timeout" }));
      }
    }, TIMEOUT);

    // 在请求成功时清除超时计时器
    proxyReq.on("response", () => {
      clearTimeout(timeoutId);
    });

    proxyReq.write(requestBody);
    proxyReq.end();

    // 添加错误处理
    proxyReq.on("error", (err) => {
      clearTimeout(timeoutId);
      console.error("HTTPS Proxy error:", err);
      if (!res.headersSent) {
        res.writeHead(502, {
          "Content-Type": "application/json",
        });
        res.end(
          JSON.stringify({ error: "Proxy Request Error", msg: err.message })
        );
      }
    });
  });
}

// 生成域名证书
function generate_certificate(domain) {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();

  cert.publicKey = keys.publicKey;
  cert.serialNumber = `${Date.now()}`;
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

  const attrs = [
    {
      name: "commonName",
      value: domain,
    },
  ];

  cert.setSubject(attrs);
  cert.setIssuer(ca_cert.subject.attributes);

  cert.setExtensions([
    {
      name: "basicConstraints",
      cA: false,
    },
    {
      name: "keyUsage",
      keyCertSign: false,
      digitalSignature: true,
      nonRepudiation: false,
      keyEncipherment: true,
      dataEncipherment: true,
    },
    {
      name: "subjectAltName",
      altNames: [
        {
          type: 2, // DNS
          value: domain,
        },
      ],
    },
  ]);

  cert.sign(ca_key, forge.md.sha256.create());

  return {
    key: forge.pki.privateKeyToPem(keys.privateKey),
    cert: forge.pki.certificateToPem(cert),
  };
}
