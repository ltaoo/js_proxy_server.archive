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
    // if (urlObj.pathname.endsWith("/x/space/v2/myinfo")) {
    //   const data = {
    //     code: 0,
    //     message: "OK",
    //     data: {
    //       profile: {
    //         mid: 94348159,
    //         name: "hahahhahahahahha",
    //         sex: "保密",
    //         face: "http://i0.hdslb.com/bfs/face/member/noface.jpg",
    //         sign: "",
    //         rank: 10000,
    //         level: 5,
    //         jointime: 0,
    //         moral: 70,
    //         silence: 0,
    //         email_status: 0,
    //         tel_status: 1,
    //         identification: 0,
    //         vip: {
    //           type: 1,
    //           status: 0,
    //           due_date: 1551974400000,
    //           vip_pay_type: 0,
    //           theme_type: 0,
    //           label: {
    //             path: "",
    //             text: "",
    //             label_theme: "",
    //             text_color: "",
    //             bg_style: 0,
    //             bg_color: "",
    //             border_color: "",
    //             use_img_label: true,
    //             img_label_uri_hans: "",
    //             img_label_uri_hant: "",
    //             img_label_uri_hans_static:
    //               "https://i0.hdslb.com/bfs/vip/d7b702ef65a976b20ed854cbd04cb9e27341bb79.png",
    //             img_label_uri_hant_static:
    //               "https://i0.hdslb.com/bfs/activity-plat/static/20220614/e369244d0b14644f5e1a06431e22a4d5/KJunwh19T5.png",
    //           },
    //           avatar_subscript: 0,
    //           nickname_color: "",
    //           role: 0,
    //           avatar_subscript_url: "",
    //           tv_vip_status: 0,
    //           tv_vip_pay_type: 0,
    //           tv_due_date: 0,
    //           avatar_icon: {
    //             icon_resource: {},
    //           },
    //         },
    //         pendant: {
    //           pid: 0,
    //           name: "",
    //           image: "",
    //           expire: 0,
    //           image_enhance: "",
    //           image_enhance_frame: "",
    //           n_pid: 0,
    //         },
    //         nameplate: {
    //           nid: 0,
    //           name: "",
    //           image: "",
    //           image_small: "",
    //           level: "",
    //           condition: "",
    //         },
    //         official: {
    //           role: 0,
    //           title: "",
    //           desc: "",
    //           type: -1,
    //         },
    //         birthday: 315504000,
    //         is_tourist: 0,
    //         is_fake_account: 0,
    //         pin_prompting: 0,
    //         is_deleted: 0,
    //         in_reg_audit: 0,
    //         is_rip_user: false,
    //         profession: {
    //           id: 0,
    //           name: "",
    //           show_name: "",
    //           is_show: 0,
    //           category_one: "",
    //           realname: "",
    //           title: "",
    //           department: "",
    //           certificate_no: "",
    //           certificate_show: false,
    //         },
    //         face_nft: 0,
    //         face_nft_new: 0,
    //         is_senior_member: 0,
    //         honours: {
    //           mid: 94348159,
    //           colour: {
    //             dark: "#CE8620",
    //             normal: "#F0900B",
    //           },
    //           tags: null,
    //           is_latest_100honour: 0,
    //         },
    //         digital_id: "",
    //         digital_type: -2,
    //         attestation: {
    //           type: 0,
    //           common_info: {
    //             title: "",
    //             prefix: "",
    //             prefix_title: "",
    //           },
    //           splice_info: {
    //             title: "",
    //           },
    //           icon: "",
    //           desc: "",
    //         },
    //         expert_info: {
    //           title: "",
    //           state: 0,
    //           type: 0,
    //           desc: "",
    //         },
    //         name_render: null,
    //         country_code: "86",
    //       },
    //       level_exp: {
    //         current_level: 5,
    //         current_min: 10800,
    //         current_exp: 11076,
    //         next_exp: 28800,
    //         level_up: 1705551728,
    //       },
    //       coins: 1134.2,
    //       following: 2,
    //       follower: 100000000,
    //     },
    //     ttl: 1,
    //   };
    //   res.writeHead(200, {
    //     "Content-Type": "application/json",
    //     "Content-Length": Buffer.byteLength(JSON.stringify(data)),
    //   });
    //   return res.end(JSON.stringify(data));
    // }
    // 检查是否匹配 /index.js
    // if (urlObj.pathname.endsWith("/index.js")) {
    //   console.log("Intercepting index.js request:", urlObj.pathname);
    //   res.writeHead(200, {
    //     "Content-Type": "application/javascript",
    //     "Content-Length": Buffer.byteLength('alert("hello")'),
    //   });
    //   return res.end('alert("hello")');
    // }

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
