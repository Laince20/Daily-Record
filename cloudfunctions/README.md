# 微信小程序云函数说明文档

本文档记录了项目中所有云函数的功能和用途，便于开发者了解和维护。

## 云函数列表

### 1. getOpenId

**功能**：获取用户的微信OpenID、APPID和UnionID信息

**主要作用**：
- 返回当前用户的OpenID，用于唯一标识微信用户
- 返回小程序的APPID
- 在满足条件的情况下返回UnionID

**使用场景**：
- 用户身份验证
- 数据关联到特定用户

### 2. createUser

**功能**：创建或更新用户信息

**主要作用**：
- 检查用户是否已存在
- 新用户自动注册并使用OpenID作为唯一标识
- 更新用户昵称、头像和登录时间
- 返回用户OpenID

**使用场景**：
- 用户首次登录小程序
- 用户信息更新

### 3. createSession

**功能**：创建用户会话

**主要作用**：
- 创建新的会话记录到conversations集合
- 存储会话的创建时间、标题和AI角色信息
- 关联外部API会话ID
- 返回会话ID

**使用场景**：
- 用户创建新对话
- 系统自动创建会话

### 4. sendMessage

**功能**：发送消息并更新会话

**主要作用**：
- 将新消息存储到messages集合
- 更新对应会话的最后更新时间
- 支持指定发送者类型(用户/AI)
- 返回消息ID

**使用场景**：
- 用户在聊天中发送消息
- AI回复消息

### 5. getConversations

**功能**：获取用户会话列表

**主要作用**：
- 返回当前用户的所有未删除会话
- 按最后更新时间排序
- 支持分页查询

**使用场景**：
- 显示用户的历史对话列表
- 查询用户会话记录

### 6. getMessages

**功能**：获取会话消息列表

**主要作用**：
- 验证会话归属权限
- 返回指定会话的所有消息
- 按时间顺序排列
- 支持分页查询

**使用场景**：
- 查看历史对话内容
- 加载对话消息记录

### 7. deleteConversation

**功能**：逻辑删除会话

**主要作用**：
- 验证会话归属权限
- 将会话标记为已删除
- 不物理删除数据，便于恢复

**使用场景**：
- 用户删除不需要的对话
- 清理历史会话

### 8. initCollection

**功能**：初始化数据库集合和索引

**主要作用**：
- 创建指定的数据库集合
- 根据集合类型设置合适的索引
- 优化数据库查询性能

**使用场景**：
- 小程序首次部署
- 数据库结构更新

### 9. login

**功能**：处理用户登录并生成唯一标识

**主要作用**：
- 检查用户是否已注册
- 新用户自动注册并生成唯一ID
- 更新用户信息和登录时间
- 返回用户信息和登录状态

**使用场景**：
- 用户首次登录小程序
- 用户重新进入小程序

## 数据库集合说明

项目使用以下几个主要集合：

1. **users** - 存储用户信息
   - _id: 用户OpenID (主键)
   - nickName: 用户昵称
   - avatarUrl: 头像URL
   - createTime: 用户创建时间
   - lastLoginTime: 最后登录时间

2. **conversations** - 存储会话信息
   - _id: 会话ID (自动生成)
   - userId: 用户OpenID
   - title: 会话标题
   - createTime: 创建时间
   - updateTime: 最后更新时间
   - aiRole: AI角色名称
   - cozeConversationId: 外部API会话ID
   - isDeleted: 是否已删除

3. **messages** - 存储消息记录
   - _id: 消息ID (自动生成)
   - conversationId: 会话ID
   - senderId: 发送者OpenID
   - sender: 发送者类型 ('user'或'ai')
   - content: 消息内容
   - contentType: 内容类型 ('text', 'voice'等)
   - timestamp: 发送时间
   - status: 消息状态 ('sent', 'read'等)
   - isDeleted: 是否已删除

## 云函数输入输出变量及关系

### 1. getOpenId
**输入参数**：
- 无需参数

**返回值**：
- `event`: 事件对象
- `openid`: 用户的OpenID
- `appid`: 小程序的APPID
- `unionid`: 用户的UnionID（如果满足条件）

**关联集合**：无

**关系**：为其他云函数提供用户身份标识，是用户鉴权的基础

### 2. createUser
**输入参数**：
- `nickName`: 用户昵称，默认为"匿名用户"
- `avatarUrl`: 用户头像URL，默认为空

**返回值**：
- `code`: 状态码，0表示成功
- `data.openid`: 用户OpenID
- `message`: 操作结果描述

**关联集合**：users

**关系**：
- 创建或更新用户信息
- 与login功能相似但更简洁，只存储基础用户信息

### 3. createSession
**输入参数**：
- `title`: 会话标题，默认为空
- `aiRole`: AI角色名称，默认为"甜美小溪"
- `cozeConversationId`: 外部API会话ID，默认为空

**返回值**：
- `code`: 状态码，0表示成功
- `data.conversationId`: 创建的会话ID
- `data.openid`: 用户OpenID
- `message`: 操作结果描述

**关联集合**：conversations

**关系**：
- 创建对话的入口点
- 为后续sendMessage提供会话容器
- 返回的conversationId用于消息关联

### 4. sendMessage
**输入参数**：
- `conversationId`: 会话ID
- `content`: 消息内容
- `contentType`: 内容类型，默认为"text"
- `sender`: 发送者类型，默认为"user"

**返回值**：
- `code`: 状态码，0表示成功
- `data.messageId`: 创建的消息ID
- `message`: 操作结果描述

**关联集合**：
- messages (写入消息)
- conversations (更新会话)

**关系**：
- 依赖createSession创建的会话ID
- 更新conversations集合中会话的最后更新时间
- 为getMessages提供数据来源

### 5. getConversations
**输入参数**：
- `limit`: 返回结果数量限制，默认为20
- `skip`: 分页跳过数量，默认为0

**返回值**：
- `code`: 状态码，0表示成功
- `data.conversations`: 会话列表数组
- `data.total`: 返回的会话数量
- `message`: 操作结果描述

**关联集合**：conversations

**关系**：
- 展示createSession创建的会话
- 提供conversationId供getMessages使用

### 6. getMessages
**输入参数**：
- `conversationId`: 会话ID
- `limit`: 返回结果数量限制，默认为50
- `skip`: 分页跳过数量，默认为0

**返回值**：
- `code`: 状态码，0表示成功
- `data.messages`: 消息列表数组
- `data.total`: 返回的消息数量
- `message`: 操作结果描述

**关联集合**：
- conversations (权限验证)
- messages (查询消息)

**关系**：
- 使用getConversations返回的conversationId
- 读取sendMessage保存的消息
- 验证会话归属权限

### 7. deleteConversation
**输入参数**：
- `conversationId`: 会话ID

**返回值**：
- `code`: 状态码，0表示成功
- `message`: 操作结果描述

**关联集合**：conversations

**关系**：
- 处理getConversations返回的会话
- 逻辑删除而非物理删除，保留数据完整性

### 8. initCollection
**输入参数**：
- `collectionName`: 集合名称

**返回值**：
- `code`: 状态码，0表示成功
- `message`: 操作结果描述

**关联集合**：
- 根据参数创建指定的集合
- 支持users、conversations、messages

**关系**：
- 为其他所有云函数提供数据存储基础
- 应在使用其他云函数前调用

### 9. login
**输入参数**：
- `code`: 微信登录code
- `wxUserInfo`: 微信用户信息

**返回值**：
- `code`: 状态码，0表示成功
- `data.isNewUser`: 是否为新用户
- `data.uniqueId`: 用户唯一标识
- `data.userInfo`: 用户详细信息

**关联集合**：users

**关系**：
- 与createUser功能类似但更复杂
- 生成额外的uniqueId标识
- 存储更多用户信息

## 数据流关系

1. **用户认证流程**：
   - getOpenId → login/createUser → 获取用户身份

2. **会话创建及消息流程**：
   - createSession → 获取conversationId
   - sendMessage → 使用conversationId发送消息
   - getMessages → 使用conversationId获取消息列表

3. **会话管理流程**：
   - getConversations → 获取会话列表
   - deleteConversation → 删除指定会话

4. **数据初始化流程**：
   - initCollection → 创建必要的数据集合和索引

## 调用示例

```javascript
// 调用getOpenId云函数示例
wx.cloud.callFunction({
  name: 'getOpenId',
  success: res => {
    const openid = res.result.openid
    console.log('用户openid:', openid)
  },
  fail: err => {
    console.error('调用失败', err)
  }
})

// 创建会话示例
wx.cloud.callFunction({
  name: 'createSession',
  data: {
    title: '新对话',
    aiRole: '甜美小溪',
    cozeConversationId: 'external_session_id'
  },
  success: res => {
    const conversationId = res.result.data.conversationId
    console.log('创建会话成功:', res.result)
  }
})

// 发送消息示例
wx.cloud.callFunction({
  name: 'sendMessage',
  data: {
    conversationId: 'conversation_id',
    content: '你好，AI助手',
    contentType: 'text',
    sender: 'user'
  },
  success: res => {
    console.log('发送消息成功:', res.result)
  }
})

// 获取会话列表示例
wx.cloud.callFunction({
  name: 'getConversations',
  data: {
    limit: 10,
    skip: 0
  },
  success: res => {
    console.log('获取会话列表成功:', res.result)
  }
})
``` 