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
    const { limit = 20, skip = 0 } = event
    
    // 获取用户的所有会话，按最后更新时间排序
    const conversationsRes = await db.collection('conversations')
      .where({
        userId: openid,
        isDeleted: false
      })
      .orderBy('updateTime', 'desc')
      .skip(skip)
      .limit(limit)
      .get()
    
    return {
      code: 0,
      data: {
        conversations: conversationsRes.data,
        total: conversationsRes.data.length
      },
      message: '获取会话列表成功'
    }
  } catch (error) {
    console.error('获取会话列表失败', error)
    return {
      code: -1,
      message: '获取会话列表失败: ' + error.message
    }
  }
} 