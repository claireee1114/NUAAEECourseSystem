# 课程统计系统

这是一个可多人共享的课程报名系统原型。学生报名会写入服务器上的 `courses.json`，管理员后台会通过实时连接自动刷新报名数据。

## 本地运行

```bash
npm start
```

打开：

```text
http://localhost:3000
```

管理员账号：

```text
admin / admin123
```

## 部署

需要部署到支持 Node.js 的平台，例如 Render、Railway、Fly.io、VPS 或学校服务器。部署后，平台给出的 `https://...` 地址就是可以分享给所有人的链接。

生产环境建议设置环境变量：

```text
ADMIN_USER=你的管理员账号
ADMIN_PASSWORD=你的强密码
DATA_DIR=持久化存储目录，例如 /data
PORT=平台自动提供或自定义端口
```

如果部署平台使用临时文件系统，请开启持久化存储，并把挂载目录填到 `DATA_DIR`。否则学生报名数据可能会在服务重启或重新部署后恢复为初始数据。
