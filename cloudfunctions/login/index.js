// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const userCollection = db.collection('users')

// 云函数入口函数
exports.main = async (event, context) => {
  // 获取微信上下文
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  // 打印调试信息
  console.log('云函数login被调用', event)
  console.log('获取到openid:', openid)
  
  try {
    // 查询用户是否已注册
    const userResult = await userCollection.where({
      openid: openid
    }).get()
    
    // 用户基本信息
    let userInfo = event.wxUserInfo || {
      nickName: '微信用户',
      avatarUrl: '',
      gender: 0,
      province: '',
      city: '',
      country: ''
    }
    
    // 确保avatarUrl不为空
    if (!userInfo.avatarUrl) {
      userInfo.avatarUrl = '/images/default-avatar.png'; // 默认头像图片路径
    }
    
    if (userResult.data.length === 0) {
      // 用户不存在，自动注册
      const timestamp = Date.now()
      const randomNum = Math.floor(Math.random() * 1000)
      const uniqueId = `UID_${timestamp}_${randomNum}`
      
      console.log('新用户注册，分配ID:', uniqueId)
      
      // 创建新用户
      const addResult = await userCollection.add({
        data: {
          openid: openid,
          uniqueId: uniqueId,
          createTime: db.serverDate(),
          userInfo: userInfo,
          lastLogin: db.serverDate()
        }
      })
      
      console.log('新用户注册结果:', addResult)
      
      return {
        code: 0,
        data: {
          isNewUser: true,
          uniqueId: uniqueId,
          userInfo: userInfo
        }
      }
    } else {
      // 用户已存在，更新登录时间
      const userData = userResult.data[0]
      console.log('用户已存在:', userData)
      
      // 合并用户信息，允许前端更新头像等信息
      if (userData.userInfo) {
        if (userInfo.avatarUrl) {
          // 如果前端传了新头像，则更新
          userData.userInfo.avatarUrl = userInfo.avatarUrl;
        }
        if (userInfo.nickName) {
          // 如果前端传了新昵称，则更新
          userData.userInfo.nickName = userInfo.nickName;
        }
        userInfo = userData.userInfo;
      }
      
      await userCollection.doc(userData._id).update({
        data: {
          lastLogin: db.serverDate(),
          userInfo: userInfo
        }
      })
      
      return {
        code: 0,
        data: {
          isNewUser: false,
          uniqueId: userData.uniqueId,
          userInfo: userInfo
        }
      }
    }
  } catch (err) {
    console.error('云函数执行错误:', err)
    return {
      code: -1,
      msg: '登录失败',
      error: err
    }
  }
} 