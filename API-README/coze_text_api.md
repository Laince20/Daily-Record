# 扣子API参考文档

## 创建会话接口

### 基本信息
- **请求方式**: POST
- **请求地址**: https://api.coze.cn/v1/conversation/create
- **所需权限**: createConversation

### 请求头参数
| 参数 | 取值 | 说明 |
|------|------|------|
| Authorization | Bearer ${Access_Token} | 用于验证客户端身份的访问令牌 |
| Content-Type | application/json | 解释请求正文的格式 |

### 请求体参数
| 参数 | 类型 | 是否必选 | 说明 |
|------|------|----------|------|
| bot_id | String | 可选 | 会话对应的智能体ID |
| meta_data | JSON Map | 可选 | 创建消息时的附加信息，自定义键值对 |
| messages | Array of EnterMessage | 可选 | 会话中的消息内容 |

### 消息结构(EnterMessage)
| 参数 | 类型 | 是否必选 | 说明 |
|------|------|----------|------|
| role | String | 必选 | 发送消息的实体：<br>- user: 用户发送<br>- assistant: Bot发送 |
| type | String | 可选 | 消息类型：question/answer/function_call等 |
| content | String | 可选 | 消息内容，支持纯文本或多模态内容 |
| content_type | String | 可选 | 内容类型：<br>- text: 文本<br>- object_string: 多模态内容<br>- card: 卡片(仅接口响应) |
| meta_data | JSON Map | 可选 | 消息附加信息 |

### 返回参数
| 参数 | 类型 | 说明 |
|------|------|------|
| data | ConversationData | 会话的基本信息 |
| detail | ResponseDetail | 响应的详细信息 |
| code | Long | 调用状态码，0表示成功 |
| msg | String | 状态信息 |

### ConversationData结构
| 参数 | 类型 | 说明 |
|------|------|------|
| id | String | 会话ID，即会话的唯一标识 |
| created_at | Long | 会话创建时间(Unix时间戳，单位秒) |
| meta_data | JSON Map | 附加信息 |

### 使用示例
```bash
curl --location --request POST "v1/conversation/create" \
--data-raw '{
  "meta_data": {
    "uuid": "newid1234"
  },
  "messages": [
    {
      "role": "user",
      "content": "[{\"type\":\"text\",\"text\":\"你好, 这是我的图片\"},{\"type\":\"image\",\"file_id\":\"{{FILE_ID}}\"}]",
      "content_type": "object_string"
    },
    {
      "role": "assistant",
      "content": "你好我是一个bot",
      "content_type": "text"
    }
  ]
}'
```

### 重要说明
1. 会话是智能体和用户之间基于主题的问答交互，一个会话包含一条或多条消息
2. 创建会话时，扣子会同时在会话中创建一个空白的上下文片段
3. 可以在创建会话时同步写入消息，也可以创建会话后另外调用API写入消息
4. 消息将作为上下文传递给模型，对话时将作为历史记录

## 在会话中发送消息

### 基本信息
- **请求方式**: POST
- **请求地址**: https://api.coze.cn/v1/conversation/message/create
- **所需权限**: createMessage

### 请求头参数
| 参数 | 取值 | 说明 |
|------|------|------|
| Authorization | Bearer ${Access_Token} | 用于验证客户端身份的访问令牌 |
| Content-Type | application/json | 解释请求正文的格式 |

### 查询参数
| 参数 | 类型 | 是否必选 | 说明 |
|------|------|----------|------|
| conversation_id | Integer | 必选 | Conversation ID，即会话的唯一标识 |

### 请求体参数
| 参数 | 类型 | 是否必选 | 说明 |
|------|------|----------|------|
| role | String | 必选 | 发送消息的实体：<br>- user: 用户发送<br>- assistant: Bot发送 |
| content | String | 必选 | 消息的内容，支持纯文本或多模态内容 |
| content_type | String | 必选 | 内容类型：<br>- text: 文本<br>- object_string: 多模态内容 |
| meta_data | JSON Map | 可选 | 创建消息时的附加信息 |

### 返回数据 - OpenMessageApi
| 参数 | 类型 | 示例 | 说明 |
|------|------|------|------|
| id | String | 738130009748252**** | Message ID，即消息的唯一标识 |
| conversation_id | String | 7379996104 79815**** | 此消息所在的会话ID |
| bot_id | String | 7473638344 93437**** | 编写此消息的智能体ID（仅对话产生的消息中返回） |
| chat_id | String | 7573638344 93437**** | Chat ID（仅对话产生的消息中返回） |
| meta_data | JSON Map | {} | 创建消息时的附加消息，获取消息时也会返回此附加消息 |
| role | String | user | 发送消息的实体 |
| content | String | 早上好，今天星期几? | 消息的内容 |
| content_type | String | text | 消息内容的类型 |
| created_at | Long | 1718592898 | 消息的创建时间（Unix时间戳，单位秒） |
| updated_at | Long | 1718592898 | 消息的更新时间（Unix时间戳，单位秒） |
| type | String | question | 消息类型 |

### 使用示例
```bash
curl --location --request POST "v1/conversation/message/create?conversation_id=\
--data-raw '{
  "role": "user",
  "content": "早上好，今天星期几",
  "content_type": "text"
}'
```

### 返回示例
```json
{
  "code": 0,
  "data": {
    "bot_id": "",
    "chat_id": "",
    "content": "早上好，今天星期几?",
    "content_type": "text",
    "conversation_id": "737999610479815****",
    "created_at": 1718592898,
    "id": "738130009748252****",
    "meta_data": {},
    "role": "user",
    "type": "question",
    "updated_at": 1718592898
  },
  "msg": "Success"
}
```

### 重要说明
1. 消息在服务端的保存时长为180天，到期后自动删除
2. 可以通过调用删除消息接口，手动从会话中删除消息
3. 可以通过查看消息列表来查询指定会话中的所有消息

## 聊天接口

### 发起聊天请求 (v3/chat)
- **请求方式**: POST
- **请求地址**: https://api.coze.cn/v3/chat
- **功能**: 创建聊天任务并获取任务ID与对话ID

#### 请求参数示例
```json
{
    "bot_id": "BOT_ID",
    "user_id": "USER_ID",
    "stream": false,
    "auto_save_history": true,
    "additional_messages": [
        {
            "role": "user",
            "content": "用户消息内容",
            "content_type": "text"
        }
    ]
}
```

### 检查任务状态 (v3/chat/retrieve)
- **请求方式**: GET
- **请求地址**: https://api.coze.cn/v3/chat/retrieve?chat_id=TASK_ID&conversation_id=CONVERSATION_ID
- **功能**: 轮询检查聊天任务的完成状态

#### 返回参数
任务完成时，返回包含以下内容的JSON：
```json
{
    "code": 0,
    "data": {
        "bot_id": "BOT_ID",
        "completed_at": 1746189431,
        "conversation_id": "CONVERSATION_ID",
        "created_at": 1746189426,
        "id": "TASK_ID",
        "status": "completed",
        "usage": {
            "input_count": 1266,
            "output_count": 53,
            "token_count": 1319
        }
    }
}
```

### 获取聊天内容 (open_api/v2/chat)
- **请求方式**: POST
- **请求地址**: https://api.coze.cn/open_api/v2/chat
- **功能**: 获取完整的聊天回复内容

#### 请求参数示例
```json
{
    "bot_id": "BOT_ID",
    "user": "USER_ID",
    "query": "用户消息内容",
    "stream": false
}
```

#### 返回参数
返回包含messages字段的JSON，其中包含机器人的回复内容。 