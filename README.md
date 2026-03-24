# Animated ML Book

一个交互式机器学习教学项目。

它把算法内容组织成“章节 + 页面 + 主图 + 公式 + 数据流 + 逐步推导”的阅读方式，帮助用户一边读、一边看、一边操作。

## 项目简介

Animated ML Book 不是单纯的参数面板或静态可视化页面。它把机器学习算法拆成可阅读的章节内容，并把同一份实验状态同步到不同界面里：

- 正文页面
- 主图
- 焦点提示
- 当前公式
- 数据流面板
- 逐步推导面板
- 内部状态面板

当前项目已经包含完整的本地前后端、内容构建脚本、实验快照生成逻辑，以及基础回归测试。

## 主要功能

### 1. 章节化阅读
项目把算法讲解组织成书页结构，而不是只给一组控件。每一页可以包含：

- openingQuestion
- coreIdea
- figureCaption
- walkthrough
- 关键公式
- vocabulary
- misconceptions
- furtherInspection
- sourceNotes

### 2. 交互式实验快照
后端会根据算法、数据集和学习率生成快照。前端可以按步骤查看：

- forward
- loss
- backward
- update

并支持：

- 上一步 / 下一步
- 自动播放
- 回到本页起点
- 当前样本切换
- 学习率调整

### 3. 多个联动面板
同一个步骤会同步更新：

- 主图
- focus guide
- live formula board
- flow
- trace
- stats

### 4. 自定义数据
支持通过 CSV 导入自定义数据，并重新生成当前算法的实验内容。

### 5. Mermaid 导出
支持将当前算法流程导出为 Mermaid 文本。

## 当前内容

### Book-first 章节
当前首页主阅读区包含 5 个章节：

1. 第 1 章 线性回归
2. 第 2 章 CNN
3. 第 3 章 RNN
4. 第 4 章 ResNet
5. 第 5 章 Transformer

### 支持的实验算法
项目当前支持以下算法实验：

- Linear Regression
- Logistic Regression
- Two-Layer Neural Network
- Convolutional Neural Network
- Recurrent Neural Network
- ResNet Block
- Linear SVM
- Decision Tree
- Random Forest
- Gradient Boosting
- K-Means Clustering
- PCA Projection
- Transformer Attention

## 技术结构

### 内容层
- `content/chapters/*/chapter.json`：章节内容源文件
- `scripts/build-content.js`：内容构建脚本
- `src/generated/book-content.generated.js`：生成后的运行时内容

### 实验层
- `src/experiment-builders/`：各算法快照生成逻辑
- `src/datasets.js` / `src/algorithm-catalog.js`：数据集与算法定义
- `server/metadata.js`：算法元信息

### 前端层
- `src/main.js`：前端入口
- `src/main-reader.js`：阅读区渲染
- `src/main-experiment.js`：实验状态与交互
- `src/plots/`：SVG 主图渲染
- `src/notebook/`：公式板与焦点说明
- `src/ui/`：flow / trace / stats 面板

### 服务层
- `server/app.js`：HTTP 服务入口
- `server/requests.js`：请求解析
- `server/exporters.js`：导出逻辑
- `server/http.js`：静态资源与响应封装

## 目录结构

```text
.
├─ content/
├─ scripts/
├─ server/
├─ src/
│  ├─ experiment-builders/
│  ├─ notebook/
│  ├─ plots/
│  ├─ reader/
│  ├─ ui/
│  └─ generated/
├─ tests/
├─ index.html
├─ server.js
└─ README.md
```

## 本地运行

### 环境要求
- Node.js 18+

### 安装依赖

```bash
npm install
```

### 构建内容

```bash
npm run build:content
```

### 启动项目

```bash
npm start
```

启动后访问：

```text
http://127.0.0.1:3000
```

## 可用脚本

```bash
npm run build:content
npm start
node --test tests/book-regression.test.js
```

如果本机没有 Playwright 浏览器，可额外执行：

```bash
npx playwright install
```

## API

### 获取元信息

```http
GET /api/metadata
```

返回：
- 可用算法
- 数据集列表
- 自定义数据格式说明
- 默认配置

### 获取实验快照

```http
GET /api/experiment?algorithmId=transformer_attention&learningRate=0.12
```

### 使用自定义数据生成实验

```http
POST /api/experiment/custom
Content-Type: application/json
```

### 导出 Mermaid

```http
GET /api/export/mermaid?algorithmId=transformer_attention&learningRate=0.12
```

### 使用自定义数据导出 Mermaid

```http
POST /api/export/custom
Content-Type: application/json
```

> 当前 `POST /api/export/custom` 主要用于 Mermaid 导出。

## 测试

当前仓库包含书页回归测试，重点检查：

- 页面是否出现横向溢出
- 关键面板是否互相遮挡
- flow / trace / symbol / focus 是否保持联动
- Transformer 相关页面是否稳定

运行方式：

```bash
node --test tests/book-regression.test.js
```

## 当前状态

项目已经具备：

- 本地可运行的前后端
- 可构建的章节内容系统
- 多算法实验快照生成
- 书页式阅读界面
- 可交互的主图 / 公式 / 数据流 / 推导面板
- 基础回归测试

目前仍在继续完善 Transformer 章节内容与相关联动细节。
