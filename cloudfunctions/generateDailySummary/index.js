const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({
  env: 'cloud1-3gi5qnd74be7e880'
})

const db = cloud.database()
const _ = db.command

// 扣子API配置
const COZE_API = {
  BOT_ID: '7501259148005507111',
  API_KEY: 'pat_VPCHYnPhCMvIgqmFgpcC5lbtyp8lnEV5xkndHwc1xG4oJgT6UG6nNGuDHKZGZKxu',
  BASE_URL: 'https://api.coze.cn'
}

// 格式化日期为YYYY-MM-DD
function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 获取昨天的日期
function getYesterdayDate() {
  const date = new Date()
  date.setDate(date.getDate() - 1)
  return formatDate(date)
}

// 获取指定日期的所有会话
async function getDailyConversations(date) {
  const startTime = new Date(date + ' 00:00:00').getTime()
  const endTime = new Date(date + ' 23:59:59').getTime()

  try {
    const conversations = await db.collection('conversations')
      .where({
        updateTime: _.gte(startTime).and(_.lte(endTime))
      })
      .orderBy('updateTime', 'asc')
      .get()

    return conversations.data
  } catch (error) {
    console.error('获取会话失败:', error)
    return []
  }
}

// 格式化会话数据
function formatConversations(conversations) {
  return conversations.map(conv => ({
    title: conv.title || '未命名会话',
    timestamp: new Date(conv.updateTime).toISOString(),
    messages: conv.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))
  }))
}

// 调用扣子API生成总结
async function generateSummary(conversations) {
  if (!conversations || conversations.length === 0) {
    console.log('没有会话数据需要总结')
    return null
  }

  const formattedData = {
    conversations: formatConversations(conversations)
  }
  
  console.log('准备发送到扣子API的数据:', JSON.stringify(formattedData))

  try {
    console.log('开始调用扣子API...')
    // 第一步：创建会话
    const createResponse = await axios.post(
      `${COZE_API.BASE_URL}/v1/conversation/create`,
      {
        bot_id: COZE_API.BOT_ID,
        messages: [
          {
            role: 'user',
            content: JSON.stringify(formattedData),
            content_type: 'text'
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${COZE_API.API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )

    console.log('创建会话响应:', JSON.stringify(createResponse.data))

    if (!createResponse.data || !createResponse.data.data || !createResponse.data.data.id) {
      console.log('创建会话失败')
      return null
    }

    const conversationId = createResponse.data.data.id
    console.log('会话ID:', conversationId)

    // 第二步：发送消息
    const messageResponse = await axios.post(
      `${COZE_API.BASE_URL}/v1/conversation/message/create?conversation_id=${conversationId}`,
      {
        role: 'user',
        content: JSON.stringify(formattedData),
        content_type: 'text'
      },
      {
        headers: {
          'Authorization': `Bearer ${COZE_API.API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )

    console.log('发送消息响应:', JSON.stringify(messageResponse.data))

    if (!messageResponse.data || !messageResponse.data.data) {
      console.log('发送消息失败')
      return null
    }

    // 第三步：获取聊天内容
    const chatResponse = await axios.post(
      `${COZE_API.BASE_URL}/open_api/v2/chat`,
      {
        bot_id: COZE_API.BOT_ID,
        user: "system",
        query: "请帮我总结以下对话内容：" + JSON.stringify(formattedData),
        stream: false
      },
      {
        headers: {
          'Authorization': `Bearer ${COZE_API.API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )

    console.log('获取聊天内容响应:', JSON.stringify(chatResponse.data))

    if (chatResponse.data && chatResponse.data.messages) {
      return chatResponse.data.messages
    }

    return null
  } catch (error) {
    console.error('调用扣子API失败:', error.message)
    if (error.response) {
      console.error('错误响应数据:', JSON.stringify(error.response.data))
      console.error('错误状态码:', error.response.status)
      console.error('错误头信息:', JSON.stringify(error.response.headers))
    }
    return null
  }
}

// 保存总结到数据库
async function saveSummary(userId, date, summary) {
  try {
    await db.collection('summaries').add({
      data: {
        userId,
        date,
        summary,
        createTime: db.serverDate()
      }
    })
    return true
  } catch (error) {
    console.error('保存总结失败:', error)
    return false
  }
}

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    console.log('=== 开始执行云函数 ===')
    const { OPENID } = cloud.getWXContext()
    console.log('用户OPENID:', OPENID)
    
    const yesterday = getYesterdayDate()
    console.log('处理日期:', yesterday)
    
    // 获取昨天的所有会话
    console.log('开始获取会话数据...')
    const conversations = await getDailyConversations(yesterday)
    console.log('获取到的会话数量:', conversations ? conversations.length : 0)
    
    // 如果没有会话，直接返回
    if (!conversations || conversations.length === 0) {
      console.log('没有找到需要总结的会话')
      return {
        success: true,
        message: '没有需要总结的会话'
      }
    }

    // 生成总结
    console.log('开始生成总结...')
    const summary = await generateSummary(conversations)
    console.log('总结生成结果:', summary ? '成功' : '失败')
    
    if (summary) {
      // 保存总结
      console.log('开始保存总结...')
      const saved = await saveSummary(OPENID, yesterday, summary)
      console.log('总结保存结果:', saved ? '成功' : '失败')
      
      return {
        success: saved,
        message: saved ? '总结生成并保存成功' : '总结生成成功但保存失败'
      }
    }

    console.log('总结生成失败')
    return {
      success: false,
      message: '总结生成失败'
    }
  } catch (error) {
    console.error('云函数执行出错:', error)
    return {
      success: false,
      message: '云函数执行出错: ' + error.message
    }
  }
} 