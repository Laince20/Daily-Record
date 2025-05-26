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
    const { conversationId, limit = 50, skip = 0 } = event
    
    // 验证会话归属
    const conversation = await db.collection('conversations').doc(conversationId).get()
      .catch(err => {
        console.error('查询会话失败', err)
        throw new Error('会话不存在')
      })
    
    if (conversation.data.userId !== openid) {
      throw new Error('无权访问此会话')
    }
    
    // 获取会话的消息列表，按时间排序
    const messagesRes = await db.collection('messages')
      .where({
        conversationId: conversationId,
        isDeleted: false
      })
      .orderBy('timestamp', 'asc')
      .skip(skip)
      .limit(limit)
      .get()
    
    return {
      code: 0,
      data: {
        messages: messagesRes.data,
        total: messagesRes.data.length
      },
      message: '获取消息列表成功'
    }
  } catch (error) {
    console.error('获取消息列表失败', error)
    return {
      code: -1,
      message: '获取消息列表失败: ' + error.message
    }
  }
} 