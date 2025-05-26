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
    const { title = '', aiRole = '甜美小溪', cozeConversationId = '' } = event
    const now = new Date()
    
    // 创建会话
    const sessionRes = await db.collection('conversations').add({
      data: {
        userId: openid,
        title: title || `对话 ${now.toLocaleString()}`,
        createTime: now,
        updateTime: now,
        aiRole,
        cozeConversationId,
        isDeleted: false
      }
    })
    
    return {
      code: 0,
      data: {
        conversationId: sessionRes._id,
        openid: openid
      },
      message: '创建会话成功'
    }
  } catch (error) {
    console.error('创建会话失败', error)
    return {
      code: -1,
      message: '创建会话失败: ' + error.message
    }
  }
} 