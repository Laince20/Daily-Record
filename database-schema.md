# 微信小程序数据库结构

## 数据库概述

本文档记录了微信小程序云开发数据库的集合结构和字段说明。该数据库主要包含三个集合：用户(users)、会话(sessions)和消息(messages)。

## 用户集合 (users)

用于存储用户基本信息。

| 字段名 | 类型 | 说明 |
| ------ | ---- | ---- |
| _id | String | 用户唯一标识，使用微信OpenID |
| nickName | String | 用户昵称 |
| avatarUrl | String | 用户头像URL |
| createTime | Date | 用户创建时间 |
| updateTime | Date | 用户信息更新时间 |

### 索引

* _id: 主键索引 (系统自动创建)

## 会话集合 (sessions)

用于存储用户间的会话信息。

| 字段名 | 类型 | 说明 |
| ------ | ---- | ---- |
| _id | String | 会话唯一标识 (系统自动生成) |
| userIds | Array<String> | 参与会话的用户ID数组 |
| type | String | 会话类型，可选值：'single'(单聊)、'group'(群聊) |
| title | String | 会话标题，主要用于群聊 |
| createTime | Date | 会话创建时间 |
| updateTime | Date | 会话最后更新时间 |
| lastMessage | Object | 最后一条消息信息 |
| lastMessage.content | String | 最后一条消息内容 |
| lastMessage.timestamp | Date | 最后一条消息时间戳 |

### 索引

* _id: 主键索引 (系统自动创建)
* userIds: 普通索引，用于快速查询用户相关会话
* updateTime: 降序索引，用于按时间顺序获取会话列表

## 消息集合 (messages)

用于存储会话中的具体消息内容。

| 字段名 | 类型 | 说明 |
| ------ | ---- | ---- |
| _id | String | 消息唯一标识 (系统自动生成) |
| sessionId | String | 所属会话ID |
| senderId | String | 发送者用户ID |
| content | String | 消息内容 |
| contentType | String | 消息类型，可选值：'text'(文本)、'image'(图片)、'voice'(语音)等 |
| timestamp | Date | 消息发送时间戳 |
| status | String | 消息状态，可选值：'sending'(发送中)、'sent'(已发送)、'read'(已读) |
| isDeleted | Boolean | 是否已删除 |

### 索引

* _id: 主键索引 (系统自动创建)
* sessionId + timestamp: 复合索引，用于快速查询会话消息并按时间排序
* senderId: 普通索引，用于查询用户发送的消息

## 数据关系

1. 用户(users)与会话(sessions)：多对多关系，通过sessions集合中的userIds字段关联
2. 会话(sessions)与消息(messages)：一对多关系，通过messages集合中的sessionId字段关联
3. 用户(users)与消息(messages)：一对多关系，通过messages集合中的senderId字段关联

## 数据操作示例

### 获取用户的所有会话

```javascript
db.collection('sessions')
  .where({
    userIds: 'user_openid'
  })
  .orderBy('updateTime', 'desc')
  .get()
```

### 获取会话的所有消息

```javascript
db.collection('messages')
  .where({
    sessionId: 'session_id',
    isDeleted: false
  })
  .orderBy('timestamp', 'desc')
  .limit(20)
  .get()
```

### 发送新消息

```javascript
// 1. 添加新消息
const messageRes = await db.collection('messages').add({
  data: {
    sessionId: 'session_id',
    senderId: 'user_openid',
    content: '消息内容',
    contentType: 'text',
    timestamp: new Date(),
    status: 'sent',
    isDeleted: false
  }
})

// 2. 更新会话最后消息
await db.collection('sessions').doc('session_id').update({
  data: {
    updateTime: new Date(),
    lastMessage: {
      content: '消息内容',
      timestamp: new Date()
    }
  }
})
``` 