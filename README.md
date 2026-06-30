# Daily Plan

一个 Obsidian 插件，在 Markdown 笔记中嵌入交互式每日计划表格。

## 功能

- 📋 **交互式表格** — 直接在笔记中编辑任务、选择时间、标记完成状态
- ⏱ **自动计算时长** — 填入开始和结束时间后自动显示单任务用时和总用时
- ✅ **三态完成标记** — 未开始（虚线圆）→ 已完成（绿色 ✓）→ 未完成（红色 ✕）
- 🎯 **一键插入** — 通过命令或侧边栏图标快速插入今日计划

## 安装

### 手动安装

1. 下载 `main.js`、`manifest.json`、`styles.css`
2. 放入 vault 的 `.obsidian/plugins/obsidian-daily-plan/` 目录
3. 在 Obsidian 设置中启用插件

### 通过 BRAT

通过 [BRAT](https://github.com/TfTHacker/obsidian42-brat) 插件安装，使用仓库地址：

```
Doozool/obsidian-daily-plan
```

## 使用

### 插入每日计划

- 点击侧边栏日历图标
- 或使用命令面板：`Insert today's daily plan`

### 编辑任务

- 点击任务名称直接编辑
- 点击时间格打开时间选择器
- 填入开始和结束时间后，总用时自动计算
- 点击完成状态栏切换：虚线圆 → ✓ → ✕

### 代码块格式

```daily-plan
tasks:
  - name: "写报告"
    start: "09:00"
    end: "10:30"
    done: Y
  - name: "开会"
    start: "14:00"
    end: "15:00"
    done: N
```

## 开发

```bash
# 安装依赖
npm install

# 开发模式（自动 watch）
npm run dev

# 生产构建
npm run build
```

## 许可

MIT
