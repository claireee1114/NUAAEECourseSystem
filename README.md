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

## 不升级 Render 时的数据保存

Render 免费 Web Service 不能挂载持久磁盘。要在免费计划下长期保存课程数据，可以让服务器把 `courses.json` 同步写回 GitHub 仓库。

在 Render 的 Environment Variables 里增加：

```text
GITHUB_TOKEN=你的 GitHub fine-grained token
GITHUB_OWNER=你的 GitHub 用户名或组织名
GITHUB_REPO=你的仓库名
GITHUB_BRANCH=main
GITHUB_DATA_PATH=courses.json
```

`GITHUB_TOKEN` 需要能读写这个仓库的 Contents。配置后，管理员新增、编辑、上传课程，以及学生报名，都会同步更新 GitHub 仓库里的 `courses.json`。服务休眠或重启后，会先从 GitHub 读取最新课程数据。
