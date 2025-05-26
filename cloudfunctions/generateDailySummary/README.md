# 每日总结生成云函数 (generateDailySummary)

## 功能概述

该云函数用于自动生成用户前一天的对话总结。它会收集用户在前一天的所有对话记录，通过扣子API生成一个总结性的内容，并将结果保存到数据库中。

## 技术栈

- 微信小程序云开发
- 扣子API (Coze API)
- Node.js
- Axios

## 配置参数

### 扣子API配置
```javascript
const COZE_API = {
  BOT_ID: '7501259148005507111',
  API_KEY: 'pat_VPCHYnPhCMvIgqmFgpcC5lbtyp8lnEV5xkndHwc1xG4oJgT6UG6nNGuDHKZGZKxu',
  BASE_URL: 'https://api.coze.cn'
}
```

## 核心功能模块

### 1. 日期处理
- `formatDate(date)`: 将日期格式化为YYYY-MM-DD格式
- `getYesterdayDate()`: 获取昨天的日期

### 2. 数据获取
- `getDailyConversations(date)`: 获取指定日期的所有会话记录
  - 参数：日期字符串 (YYYY-MM-DD)
  - 返回：会话记录数组

### 3. 数据格式化
- `formatConversations(conversations)`: 格式化会话数据
  - 参数：原始会话数据
  - 返回：格式化后的会话数据，包含标题、时间戳和消息内容

### 4. 总结生成
- `generateSummary(conversations)`: 调用扣子API生成总结
  - 参数：会话数据数组
  - 返回：AI生成的总结内容

### 5. 数据存储
- `saveSummary(userId, date, summary)`: 保存总结到数据库
  - 参数：
    - userId: 用户ID
    - date: 日期
    - summary: 总结内容
  - 返回：保存是否成功

## API调用流程

1. 创建会话
```javascript
POST /v1/conversation/create
{
  bot_id: COZE_API.BOT_ID,
  messages: [{
    role: 'user',
    content: formattedData,
    content_type: 'text'
  }]
}
```

2. 发送消息
```javascript
POST /v1/conversation/message/create
{
  role: 'user',
  content: formattedData,
  content_type: 'text'
}
```

3. 获取回复
```javascript
POST /open_api/v2/chat
{
  bot_id: COZE_API.BOT_ID,
  user: "system",
  query: "请帮我总结以下对话内容：" + formattedData,
  stream: false
}
```

## 数据库结构

### summaries集合
```javascript
{
  userId: String,    // 用户ID
  date: String,      // 日期 (YYYY-MM-DD)
  summary: Object,   // 总结内容
  createTime: Date   // 创建时间
}
```

## 错误处理

1. 会话获取失败
   - 记录错误日志
   - 返回空数组

2. API调用失败
   - 记录详细的错误信息
   - 返回null

3. 数据保存失败
   - 记录错误日志
   - 返回false

## 日志记录

函数包含详细的日志记录，包括：
- API调用开始和结束
- 请求和响应数据
- 错误信息和堆栈跟踪
- 处理状态和结果

## 使用示例

```javascript
// 调用云函数
wx.cloud.callFunction({
  name: 'generateDailySummary',
  success: res => {
    console.log('总结生成结果:', res.result)
  },
  fail: err => {
    console.error('生成总结失败:', err)
  }
})
```

## 返回结果格式

成功：
```javascript
{
  success: true,
  message: '总结生成并保存成功'
}
```

失败：
```javascript
{
  success: false,
  message: '错误信息'
}
```

## 注意事项

1. 确保扣子API的配置正确
2. 需要适当的数据库权限
3. 建议在非高峰期执行
4. 注意API调用频率限制
5. 确保数据格式的一致性

## 维护建议

1. 定期检查API密钥的有效性
2. 监控API调用成功率
3. 定期清理过期的总结数据
4. 优化数据查询性能
5. 添加更多的错误处理机制 