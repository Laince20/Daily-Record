# 扣子语音识别（ASR）API

## 接口描述

此API用于将音频文件转录为文本。支持上传音频文件并获取识别后的文本内容。

## 基础信息

| 项目 | 内容 |
| --- | --- |
| 请求方式 | POST |
| 请求地址 | https://api.coze.cn/v1/audio/transcriptions |
| 权限 | createTranscription |

## 文件限制

| 限制 | 说明 |
| --- | --- |
| 文件格式 | 支持的文件格式包括 ogg、mp3 和 wav |
| 文件大小 | 每个音频文件最大 512 MB |

## 请求参数

### Header 参数

| 参数 | 取值 | 说明 |
| --- | --- | --- |
| Authorization | Bearer $Access_Token | 用于验证客户端身份的访问令牌。你可以在扣子平台中生成访问令牌，详细信息参考准备工作 |
| Content-Type | multipart/form-data | 解释请求正文的方式 |

### Body 参数

| 参数 | 类型 | 是否必选 | 示例 | 说明 |
| --- | --- | --- | --- | --- |
| body | File | 必选 | - | 文件二进制数据，音频文件的详细限制可参考接口说明部分 |

## 返回参数

| 参数 | 类型 | 示例 | 说明 |
| --- | --- | --- | --- |
| code | Long | 0 | 状态码。0 代表调用成功 |
| msg | String | "" | 状态信息。API 调用失败时可通过此字段查看详细错误信息 |
| data | Object | { "text": "xxx" } | 音频文件对应的文本内容 |
| detail | Object | { "logid": "202410242028595CCF353CEC86A8******" } | 本次请求的详细信息 |

### AudioTranscriptionsData

| 参数 | 类型 | 示例 | 说明 |
| --- | --- | --- | --- |
| text | String | "你好" | 语音文件对应的文本内容 |

### ResponseDetail

| 参数 | 类型 | 示例 | 说明 |
| --- | --- | --- | --- |
| logid | String | 20241210152726467C48D89D6DB2**** | 本次请求的日志 ID。如果遇到异常报错场景，且反复重试仍然报错，可以根据此 logid 及错误码联系扣子团队获取帮助。详细说明可参考获取帮助和技术支持 |

## 请求示例

```bash
curl --location --request POST 'https://api.coze.cn/v1/audio/transcriptions' \
--header 'Authorization: Bearer pat_OYDacMzM3WyOWV3Dtj2bHRMymzxP****' \
--header 'Content-Type: multipart/form-data' \
--form 'file=@"/xx/xx/xx/jay.MP3"'
```

## 使用说明

1. 确保已获取有效的访问令牌（Access Token）
2. 确保音频文件符合格式要求（ogg、mp3、wav）
3. 文件大小不超过512MB限制
4. 发送POST请求，将音频文件作为表单数据上传
5. 解析返回的JSON数据，获取转录文本 