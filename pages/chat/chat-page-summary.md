# AI日志聊天页面功能总结

## 页面概述

聊天页面(`pages/chat/chat`)是AI日志小程序的核心交互界面，用户可以在此与AI助手进行对话交流，实现日常复盘与记录。页面支持文字和语音双重输入方式，并提供历史对话管理功能。

## 主要功能

### 1. 对话交互
- **文字对话**：用户可通过输入框发送文字消息
- **语音对话**：支持语音录制、识别和语音转文字
- **AI响应**：调用扣子(Coze)API获取AI回复

### 2. 历史会话管理
- **查看历史**：侧边栏显示历史对话列表
- **新建对话**：创建新的对话会话
- **删除对话**：删除不需要的历史对话
- **切换对话**：在不同历史对话间切换

### 3. 辅助功能
- **语音模式切换**：支持文字/语音输入模式切换
- **状态提示**：显示录音、识别等操作状态

## 核心数据变量

| 变量名 | 类型 | 描述 |
|--------|------|------|
| `isVoiceMode` | Boolean | 是否为语音输入模式 |
| `isRecording` | Boolean | 是否正在录音 |
| `isMuted` | Boolean | 是否静音 |
| `inputValue` | String | 文本输入框的值 |
| `messages` | Array | 当前对话的消息列表 |
| `scrollToView` | String | 滚动到指定消息ID |
| `userId` | String | 用户唯一标识 |
| `conversationId` | String | 当前对话的ID |
| `isHistorySidebarOpen` | Boolean | 是否显示历史对话侧边栏 |
| `conversationList` | Array | 历史对话列表 |
| `statusText` | String | 状态提示文本 |
| `isAiResponding` | Boolean | AI是否正在回复 |
| `isSpeaking` | Boolean | 是否正在播放语音 |

## 扣子API参数

| 变量名 | 描述 |
|--------|------|
| `botId` | 扣子机器人ID |
| `accessToken` | 访问令牌 |
| `apiBaseUrl` | API基础URL |

## 核心逻辑流程

### 初始化流程
1. 页面加载(`onLoad`)时创建唯一用户ID
2. 初始化录音管理器(`initRecorderManager`)
3. 创建新会话(`createConversation`)
4. 加载历史对话列表(`loadConversationList`)

### 对话流程
1. 用户输入文字或通过语音转文字
2. 调用`sendMessage`发送消息
3. 消息添加到界面(`addMessage`)
4. 调用扣子API获取AI回复(`sendMessageToCoze`)
5. 获取AI回复后显示到界面(`getAiResponse`)
6. 保存对话到历史记录(`saveConversation`)

### 语音处理流程
1. 开始录音(`startRecording`)
2. 结束录音(`stopRecording`)
3. 录音文件处理及语音识别(`processAudioFile`)
4. 识别成功后自动发送消息

### 历史会话管理
1. 显示侧边栏(`showHistoryList`)
2. 加载历史对话(`loadConversationList`)
3. 选择对话(`selectConversation`)
4. 新建对话(`createNewConversation`)
5. 删除对话(`deleteConversation`)

## 对话存储机制

### 存储位置
对话数据使用微信小程序的本地存储(`wx.getStorageSync`/`wx.setStorageSync`)保存在用户设备本地。

### 数据结构
```javascript
// 对话列表数据结构
[
  {
    id: String,         // 对话唯一ID
    title: String,      // 对话标题
    date: String,       // 创建/更新日期
    messages: [         // 消息数组
      {
        role: String,   // 消息发送者角色(user/ai)
        content: String // 消息内容
      }
    ]
  }
]
```

### 存储过程
1. 每次对话结束或有新消息时，调用`saveConversation`方法
2. 检查是否存在相同ID的对话记录
   - 若不存在，创建新记录
   - 若存在，更新现有记录
3. 将完整对话列表保存到本地存储中

### 读取过程
1. 页面加载时调用`loadConversationList`读取本地存储
2. 格式化数据用于显示历史对话列表
3. 选择对话时，从本地存储加载完整对话内容

## 注意事项
1. 对话数据仅存储在本地，如需云端备份需另行开发
2. 录音功能需要用户授权
3. AI对话依赖扣子API服务，需确保网络连接
4. 用户ID和对话ID基于时间戳生成，确保唯一性 