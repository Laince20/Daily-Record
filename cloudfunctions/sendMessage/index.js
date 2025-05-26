// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  try {
    const { conversationId, content, contentType = 'text', sender = 'user' } = event
    const now = new Date()
    
    // 1. 添加消息到数据库
    const messageRes = await db.collection('messages').add({
      data: {
        conversationId: conversationId,
        senderId: openid,
        sender, // 'user' 或 'ai'
        content,
        contentType,
        timestamp: now,
        status: 'sent',
        isDeleted: false
      }
    })
    
    // 2. 更新会话的最后更新时间
    await db.collection('conversations').doc(conversationId).update({
      data: {
        updateTime: now,
        // 如果是第一条消息，并且是用户发送的，更新会话标题
        ...(sender === 'user' && content.length > 0 ? { 
          title: content.length > 20 ? content.substring(0, 20) + '...' : content 
        } : {})
      }
    })
    
    return {
      code: 0,
      data: {
        messageId: messageRes._id
      },
      message: '发送消息成功'
    }
  } catch (error) {
    console.error('发送消息失败', error)
    return {
      code: -1,
      message: '发送消息失败: ' + error.message
    }
  }
} 