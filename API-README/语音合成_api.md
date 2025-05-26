# 扣子语音合成（TTS）API

## 接口描述

此API用于将指定文本内容合成为自然流畅的音频，同步返回合成的音频文件。合成音频文件之前，可以先调用查看音色列表API，选择音频使用的音色。

## 基础信息

| 项目 | 内容 |
| --- | --- |
| 请求方式 | POST |
| 请求地址 | https://api.coze.cn/v1/audio/speech |
| 权限 | createSpeech |

## 请求参数

### Header 参数

| 参数 | 取值 | 说明 |
| --- | --- | --- |
| Authorization | Bearer $Access_Token | 用于验证客户端身份的访问令牌。你可以在扣子平台中生成访问令牌，详细信息参考准备工作 |
| Content-Type | application/json | 解释请求正文的方式 |

### Body 参数

| 参数 | 类型 | 是否必选 | 示例 | 说明 |
| --- | --- | --- | --- | --- |
| input | String | 必选 | 今天天气怎么样 | 合成语音的文本，经由 UTF-8 编码。长度限制为 1024 字节 |
| voice_id | String | 必选 | 742894******* | 音频文件使用的音色 ID。调用查看音色列表 API，可查看所有可用音色 |
| response_format | String | 可选 | mp3 | 音频文件的编码格式，支持设置为：<br>• wav：返回二进制 wav 音频<br>• pcm：返回二进制 pcm 音频<br>• ogg_opus：返回多段含 opus 压缩分片音频<br>• mp3：（默认）返回二进制 mp3 音频 |
| speed | Double | 可选 | 1 | 语速，取值范围为 0.2~3，通常保留一位小数即可。<br>其中 0.2 表示 0.2 倍速，3 表示 3 倍速。默认为 1，表示 1 倍速 |
| sample_rate | Integer | 可选 | 24000 | 音频采样率，单位为 Hz。<br>• 8000: 8k<br>• 16000: 16k<br>• 22050: 22.05k<br>• 24000: （默认）24k<br>• 32000: 32k |

## 返回参数

如果成功调用此 API，接口会直接返回语音文件的内容。

## 请求示例

```bash
curl --location --request POST 'https://api.coze.cn/v1/audio/speech' \
--header 'Authorization: Bearer pat_OYDacMzM3WyOWV3Dtj2bHRMymzxP****' \
--header 'Content-Type: application/json' \
--data '{
    "input": "你好呀",
    "voice_id": "742894*********",
    "response_format": "wav"
}' \
--output speech.wav
```

## 错误码

接口可能返回的错误码及说明（从截图中未完全看到，但通常会有此部分）。

## 使用说明

1. 确保已获取有效的访问令牌（Access Token）
2. 通过查看音色列表API获取可用的音色ID
3. 准备需要合成的文本内容，注意长度限制
4. 选择合适的音频格式和参数（如语速、采样率等）
5. 发送POST请求，获取生成的音频文件
6. 将返回的二进制内容保存为音频文件 