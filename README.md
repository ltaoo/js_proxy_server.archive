# JS 代理服务器

演示了如何通过 `js` 代码创建代理服务器，并支持对请求、响应进行查看及修改。

## 修改响应头

```js
        const modifiedHeaders = {
          ...proxyRes.headers,
          __extra_from_proxy_server: "true",
        };

	// ...
	// ...
	res.writeHead(proxyRes.statusCode, modifiedHeaders);
```


## 修改 JSON 响应

```js
 	let jsonBody = JSON.parse(decodedBody.toString());
	// 可在此打印 JSON，并修改 JSON 数据
	jsonBody.modified = true;
```

## 不请求直接响应

```js
    if (urlObj.pathname.endsWith("/some_special_path.js")) {
      console.log("Intercepting index.js request:", urlObj.pathname);
      res.writeHead(200, {
        "Content-Type": "application/javascript",
        "Content-Length": Buffer.byteLength('alert("hello")'),
      });
      return res.end('alert("hello")');
    }
```

## 使用方法

安装依赖后 `node index.js`，将系统代理设置为 `127.0.0.1:8080`，当访问任意满足 `/some_special_path.js` 结尾的请求，均返回 `alert("hello")`。

查看控制台，所有响应头都增加了 `__extra_from_proxy_server`；以及所有 `Content-Type` 为 `application/json` 的响应，都增加了 `modified: true` 字段。