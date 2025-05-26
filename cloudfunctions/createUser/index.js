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
    const { nickName = '匿名用户', avatarUrl = '' } = event
    const now = new Date()
    
    // 检查用户是否已存在
    const userRes = await db.collection('users').where({
      _id: openid
    }).get()
    
    if (userRes.data.length === 0) {
      // 创建新用户
      await db.collection('users').add({
        data: {
          _id: openid,
          nickName: nickName,
          avatarUrl: avatarUrl,
          createTime: now,
          lastLoginTime: now
        }
      })
    } else {
      // 更新用户信息
      await db.collection('users').doc(openid).update({
        data: {
          nickName: nickName,
          avatarUrl: avatarUrl,
          lastLoginTime: now
        }
      })
    }
    
    return {
      code: 0,
      data: {
        openid: openid
      },
      message: '用户创建/更新成功'
    }
  } catch (error) {
    console.error('用户创建/更新失败', error)
    return {
      code: -1,
      message: '用户创建/更新失败: ' + error.message
    }
  }
} 