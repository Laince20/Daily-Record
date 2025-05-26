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
    const { conversationId } = event
    
    // 验证会话归属
    const conversation = await db.collection('conversations').doc(conversationId).get()
      .catch(err => {
        console.error('查询会话失败', err)
        throw new Error('会话不存在')
      })
    
    if (conversation.data.userId !== openid) {
      throw new Error('无权删除此会话')
    }
    
    // 逻辑删除会话（标记isDeleted为true）
    await db.collection('conversations').doc(conversationId).update({
      data: {
        isDeleted: true,
        updateTime: new Date()
      }
    })
    
    return {
      code: 0,
      message: '删除会话成功'
    }
  } catch (error) {
    console.error('删除会话失败', error)
    return {
      code: -1,
      message: '删除会话失败: ' + error.message
    }
  }
} 