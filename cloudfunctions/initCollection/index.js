// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云函数入口函数
exports.main = async (event, context) => {
  const { collectionName } = event
  const db = cloud.database()
  
  try {
    // 创建集合
    await db.createCollection(collectionName)
    
    // 根据不同集合设置索引
    switch (collectionName) {
      case 'users':
        // 用户集合，_id 已是主键(openid)
        break
      case 'conversations':
        // 会话集合设置索引
        await db.collection('conversations').createIndex({
          keys: { userId: 1 },
          name: 'userId_index'
        })
        await db.collection('conversations').createIndex({
          keys: { updateTime: -1 },
          name: 'updateTime_index'
        })
        break
      case 'messages':
        // 消息集合设置索引
        await db.collection('messages').createIndex({
          keys: { conversationId: 1, timestamp: 1 },
          name: 'conversationId_timestamp_index'
        })
        await db.collection('messages').createIndex({
          keys: { senderId: 1 },
          name: 'senderId_index'
        })
        break
    }
    
    return {
      code: 0,
      message: `成功创建集合 ${collectionName}`
    }
  } catch (error) {
    console.error(`创建集合 ${collectionName} 失败`, error)
    return {
      code: -1,
      message: `创建集合失败: ${error.message}`
    }
  }
} 