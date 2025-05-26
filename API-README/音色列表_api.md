# 扣子音色列表 API

## 接口描述

查看可用的音色列表，包括系统预置音色和自定义音色。

## 基础信息

| 项目 | 内容 |
| --- | --- |
| 请求方式 | GET |
| 请求地址 | https://api.coze.cn/v1/audio/voices |
| 权限 | listVoice |

## 接口说明

调用此 API 可查看当前扣子用户可使用的音色列表，包括：
* 系统预置音色：扣子平台提供的默认音色
* 自定义音色：当前扣子用户通过复刻音色 API 复刻的音色、当前账号加入的所有空间中其他扣子用户复刻的音色

## 请求参数

### Header 参数

| 参数 | 取值 | 说明 |
| --- | --- | --- |
| Authorization | Bearer $Access_Token | 用于验证客户端身份的访问令牌。你可以在扣子平台中生成访问令牌，详细信息参考准备工作 |
| Content-Type | application/json | 解释请求正文的方式 |

### Query 参数

| 参数 | 类型 | 是否必选 | 示例 | 说明 |
| --- | --- | --- | --- | --- |
| filter_system_voice | Boolean | 可选 | false | 查看音色列表时是否过滤系统音色<br>• true: 过滤系统音色<br>• false: （默认）不过滤系统音色 |
| model_type | String | 可选 | big | 音色模型的类型，如果不填，默认都返回。可选值包括：<br>• big: 大模型<br>• small: 小模型 |
| page_num | Integer | 可选 | 1 | 查询结果分页展示时，此参数用于设置查看的页码。最小值为 1，默认为 1 |
| page_size | Integer | 可选 | 100 | 查询结果分页展示时，此参数用于设置每页返回的数据量。取值范围为 1~100，默认为 100 |

## 返回参数

| 参数 | 类型 | 示例 | 说明 |
| --- | --- | --- | --- |
| code | Long | 0 | 状态码。0 代表调用成功 |
| msg | String | "" | 状态信息。API 调用失败时可通过此字段查看详细错误信息 |
| data | Object of ListVoiceData | 参见响应参数 | 音色的详细信息 |
| detail | Object of ResponseDetail | { "logid": "20241029163557....." } | 本次请求的详细信息 |

### ListVoiceData

| 参数 | 类型 | 示例 | 说明 |
| --- | --- | --- | --- |
| has_more | Boolean | false | 是否还有未返回的音色 |
| voice_list | Array of OpenAPIVoiceData | 参见响应参数 | 音色列表详情 |

### OpenAPIVoiceData

| 参数 | 类型 | 示例 | 说明 |
| --- | --- | --- | --- |
| name | String | 开朗大男孩 | 音色的名称 |
| voice_id | String | 73482933344593***** | 音色的 ID |
| model_type | String | big | 音色的模型类型，big是大模型，small是小模型 |
| create_time | Integer | 1729686510 | 音色的创建时间，格式为 11 位的 Unixtime 时间戳 |
| update_time | Integer | 1729686510 | 音色的更新时间，格式为 11 位的 Unixtime 时间戳 |
| preview_text | String | 你好呀 | 此音色预览音频的文案 |
| language_code | String | zh | 此音色的语种代号 |
| language_name | String | 中文 | 此音色的语种名称 |
| preview_audio | String | 未显示完整 | 音色预览音频URL（从截图中未完全显示）|
| is_system_voice | Boolean | false | 是否是系统音色（从返回示例中推断）|
| available_training_times | Integer | 6 | 当前音色还可以训练的次数（从返回示例中推断）|

## 请求示例

```bash
curl --location --request GET 'https://api.coze.cn/v1/audio/voices?filter_system_voice=false&page_num=1&page_size=10' \
--header 'Authorization: Bearer pat_OYDacMzM3WyOWV3Dtj2bHRMymzxP****' \
--header 'Content-Type: application/json'
```

## 返回示例

```json
{
  "detail": {
    "logid": "2024102916355736DC98FBC4D32FD7E59C"
  },
  "data": {
    "voice_list": [
      {
        "preview_audio": "https://lf3-appstore-sign.oceancloudapi.com/ocean-cloud-tos/VolcanoUserVoice/xxxxxx.mp3",
        "language_name": "中文",
        "is_system_voice": false,
        "preview_text": "你好，欢迎来到AI世界，我是你的专属AI克隆声音，希望未来可以一起好好相处。",
        "create_time": 1729686510,
        "update_time": 1729686510,
        "name": "jay", // 音色名称
        "language_code": "zh",
        "voice_id": "12344",
        "available_training_times": 6, // 当前音色还可以训练的次数
        "model_type": "big"
      }
    ]
  }
}
```

## 使用说明

1. 确保已获取有效的访问令牌（Access Token）
2. 根据需要设置查询参数，如是否过滤系统音色、模型类型、分页信息等
3. 发送GET请求获取音色列表
4. 解析返回的JSON数据，获取音色信息（ID、名称、预览文本等）
5. 使用获取到的voice_id调用语音合成API 