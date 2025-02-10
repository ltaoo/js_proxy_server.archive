const http = require("http");
const https = require("https");
const net = require("net");
const fs = require("fs");
const url = require("url");

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
    console.log("\n=== HTTPS Request ===");
    console.log(`Method: ${req.method}`);
    console.log(`URL: ${req.url}`);
    console.log("Headers:", req.headers);
    console.log("Body:", requestBody);
    console.log("==================\n");

    // 检查是否匹配 /index.js
    if (urlObj.pathname.endsWith("/index.js")) {
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
      res.writeHead(proxyRes.statusCode, proxyRes.headers);

      // 收集响应体
      let responseBody = "";
      proxyRes.on("data", (chunk) => {
        responseBody += chunk.toString();
      });

      proxyRes.on("end", () => {
        console.log("\n=== HTTPS Response ===");
        console.log(`Status: ${proxyRes.statusCode}`);
        console.log("Headers:", proxyRes.headers);
        console.log("Body:", responseBody);
        console.log("==================\n");
      });

      proxyRes.pipe(res);
    });

    proxyReq.write(requestBody);
    proxyReq.end();

    proxyReq.on("error", (err) => {
      console.error("HTTPS Proxy error:", err);
      res.writeHead(500);
      res.end("Proxy Error");
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
