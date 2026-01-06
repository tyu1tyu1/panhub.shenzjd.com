# SQLite Docker 持久化问题完整排查指南

## 🔍 问题诊断

### 当前症状
根据你的反馈，系统显示：
```json
{
  "isMemoryMode": true,
  "dbExists": false,
  "mode": "memory"
}
```

这表明 **better-sqlite3 没有正确编译或加载**，导致系统回退到内存模式。

---

## 🎯 根本原因分析

better-sqlite3 是一个 **原生 Node.js 模块**，需要：
1. **编译工具链** (python3, make, g++, gcc, musl-dev)
2. **在目标平台上编译** (不能跨平台复制)
3. **正确的架构匹配** (amd64 vs arm64)

---

## 🚨 立即解决方案

### 步骤 1: 检查当前容器状态

```bash
# 1. 进入容器
docker exec -it panhub sh

# 2. 运行诊断脚本
node /app/scripts/diagnose-sqlite.js

# 3. 检查 better-sqlite3 是否能加载
node -e "console.log(require('better-sqlite3'))"

# 4. 检查编译文件
ls -la node_modules/better-sqlite3/build/Release/
```

### 步骤 2: 手动重新编译（临时方案）

如果诊断显示缺少编译文件，在容器内执行：

```bash
# 安装编译工具
apk add --no-cache python3 make g++ gcc libc-dev musl-dev

# 重新编译 better-sqlite3
cd /app
npm rebuild better-sqlite3

# 验证编译结果
ls -la node_modules/better-sqlite3/build/Release/

# 重启应用（保持容器运行）
# 或者退出容器后重启
docker restart panhub
```

### 步骤 3: 使用新镜像（推荐方案）

我已经更新了 Dockerfile 和 GitHub Actions，现在：

1. **Dockerfile** 使用单阶段构建，确保 better-sqlite3 在正确环境中编译
2. **GitHub Actions** 会在推送前测试 better-sqlite3 是否工作
3. **新增诊断脚本** 可以快速排查问题

**更新你的镜像：**

```bash
# 1. 拉取最新代码
cd /root/panhub.shenzjd.com
git pull origin main

# 2. 重新构建镜像（本地）
docker build -t panhub:latest .

# 3. 或者等待 GitHub Actions 构建新镜像后拉取
docker pull ghcr.io/wu529778790/panhub.shenzjd.com:latest

# 4. 重新创建容器
docker stop panhub
docker rm panhub
docker run -d \
  --name panhub \
  -p 3000:3000 \
  -v /root/panhub/data:/app/data \
  -e HOT_SEARCH_PASSWORD=admin123 \
  ghcr.io/wu529778790/panhub.shenzjd.com:latest
```

---

## 🔧 详细排查步骤

### 1. 检查编译工具是否安装

```bash
# 在容器内执行
which python3
which make
which g++
which gcc

# 应该都有输出路径，如果没有则需要安装
apk add --no-cache python3 make g++ gcc libc-dev musl-dev
```

### 2. 检查 better-sqlite3 安装状态

```bash
# 检查包是否存在
ls -la node_modules/better-sqlite3/

# 检查编译产物（关键）
ls -la node_modules/better-sqlite3/build/Release/

# 应该看到类似文件：
# -rwxr-xr-x 1 root root  123456 better_sqlite3.node
```

### 3. 检查架构匹配

```bash
# 检查容器架构
uname -m
# 应该是 x86_64 或 aarch64

# 检查 Node.js 架构
node -p "process.arch"
# 应该匹配上面的输出

# 检查 better-sqlite3 原生模块架构
file node_modules/better-sqlite3/build/Release/better_sqlite3.node
```

### 4. 运行完整测试

```bash
# 使用我提供的测试脚本
node /app/scripts/test-sqlite-persistence.js

# 预期输出：
# ✅ /app/data 目录可写
# ✅ 数据库打开成功
# ✅ 插入成功
# ✅ 数据持久化成功
# 🎉 所有测试通过！SQLite 持久化工作正常。
```

---

## 🐛 常见问题及解决

### 问题 1: `Cannot find module 'better-sqlite3'`

**原因**: npm install 没有成功执行

**解决**:
```bash
# 在容器内重新安装
cd /app
npm install better-sqlite3
```

### 问题 2: `The module was compiled against a different Node.js version`

**原因**: Node.js 版本不匹配

**解决**:
```bash
# 检查 Node 版本
node --version

# 重新编译
npm rebuild better-sqlite3
```

### 问题 3: `Error: Could not locate the bindings file`

**原因**: 缺少编译工具或编译失败

**解决**:
```bash
# 1. 安装编译工具
apk add --no-cache python3 make g++ gcc libc-dev musl-dev

# 2. 清理并重新安装
rm -rf node_modules/better-sqlite3
npm install better-sqlite3

# 3. 验证
node -e "require('better-sqlite3')"
```

### 问题 4: `EACCES: permission denied`

**原因**: /app/data 目录权限问题

**解决**:
```bash
# 在容器内执行
chmod 777 /app/data

# 或者在宿主机执行（如果使用了挂载）
chmod 777 /root/panhub/data
```

### 问题 5: 多架构镜像问题

**原因**: Docker Hub/GHCR 上的镜像是为不同架构构建的，可能编译有问题

**解决**:
```bash
# 检查当前架构
docker exec panhub uname -m

# 如果是 x86_64，确保使用 amd64 镜像
# 如果是 aarch64，确保使用 arm64 镜像

# 强制拉取特定架构
docker pull --platform linux/amd64 ghcr.io/wu529778790/panhub.shenzjd.com:latest
```

---

## 📋 验证修复

修复后，应该看到：

```bash
# 1. 检查 API 返回
curl http://localhost:3000/api/hot-search-stats

# 预期结果：
{
  "code": 0,
  "data": {
    "isMemoryMode": false,    # ✅ 不是内存模式
    "dbExists": true,         # ✅ 数据库文件存在
    "mode": "sqlite",         # ✅ 使用 SQLite
    "dbSizeMB": 0.01,         # ✅ 有文件大小
    ...
  }
}

# 2. 检查容器内文件
docker exec panhub ls -la /app/data/

# 应该看到：
# hot-searches.db

# 3. 重启测试
docker restart panhub
curl http://localhost:3000/api/hot-search-stats
# total 数量应该保持不变
```

---

## 🆘 如果以上都不行

### 方案 A: 使用 Debian 镜像（兼容性更好）

如果 Alpine 有问题，可以改用 Debian：

```dockerfile
FROM node:20-slim AS builder
WORKDIR /app

# Debian 的编译工具
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    gcc \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY . .
RUN npm ci --prefer-offline --no-audit
RUN NITRO_PRESET=node-server npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# 运行时依赖
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    gcc \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package.json ./

RUN mkdir -p /app/data && chmod 777 /app/data

CMD ["node", "--enable-source-maps", ".output/server/index.mjs"]
```

### 方案 B: 预编译 better-sqlite3

在构建镜像前，先在本地预编译：

```bash
# 在本地 Linux 环境
npm install better-sqlite3
# 这会生成 node_modules/better-sqlite3/build/Release/

# 然后构建镜像
docker build -t panhub:latest .
```

### 方案 C: 使用 Docker Buildx 本地构建

```bash
# 使用 buildx 为当前架构构建
docker buildx build \
  --platform linux/amd64 \
  -t panhub:latest \
  --load .
```

---

## 📊 诊断信息收集

如果问题仍然存在，请收集以下信息：

```bash
# 1. 容器架构
docker exec panhub uname -m

# 2. Node.js 版本和架构
docker exec panhub node -p "process.platform + ' ' + process.arch + ' ' + process.version"

# 3. better-sqlite3 状态
docker exec panhub node /app/scripts/diagnose-sqlite.js

# 4. 完整日志
docker logs panhub

# 5. 挂载检查
docker inspect panhub --format='{{.Mounts}}'

# 6. 宿主机目录权限
ls -la /root/panhub/data/
```

---

## ✅ 成功标准

修复后，系统应该：

1. ✅ `isMemoryMode: false`
2. ✅ `dbExists: true`
3. ✅ `mode: "sqlite"`
4. ✅ `dbSizeMB > 0`
5. ✅ 重启容器后数据不丢失
6. ✅ 日志显示 `✅ SQLite 数据库已初始化`

---

## 💡 预防措施

1. **使用新 Dockerfile**: 已优化为单阶段构建
2. **GitHub Actions 测试**: 推送前会验证 better-sqlite3
3. **诊断脚本**: 快速定位问题
4. **清晰日志**: 只显示用户搜索内容

---

## 📞 需要帮助？

如果按照以上步骤仍然无法解决，请提供：

1. `docker exec panhub node /app/scripts/diagnose-sqlite.js` 的完整输出
2. `docker exec panhub uname -m` 的输出
3. 1Panel 中的容器配置截图（特别是挂载部分）
4. `docker logs panhub` 的完整日志

我会根据这些信息帮你进一步排查！