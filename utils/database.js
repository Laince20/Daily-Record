// 数据库操作工具类
const db = wx.cloud.database();

// 用户集合操作
const users = {
  // 创建用户
  async createUser(userInfo) {
    try {
      // 获取用户openid作为唯一标识
      const { result } = await wx.cloud.callFunction({
        name: 'getOpenId'
      });
      
      const userId = result.openid;
      const now = new Date();
      
      // 添加用户到数据库
      const res = await db.collection('users').add({
        data: {
          _id: userId,
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl,
          createTime: now,
          updateTime: now
        }
      });
      
      return {
        userId,
        ...res
      };
    } catch (error) {
      console.error('创建用户失败', error);
      throw error;
    }
  },

  // 获取用户信息
  async getUserInfo(userId) {
    try {
      const res = await db.collection('users').doc(userId).get();
      return res.data;
    } catch (error) {
      console.error('获取用户信息失败', error);
      throw error;
    }
  },

  // 更新用户信息
  async updateUserInfo(userId, userInfo) {
    try {
      const now = new Date();
      const res = await db.collection('users').doc(userId).update({
        data: {
          ...userInfo,
          updateTime: now
        }
      });
      return res;
    } catch (error) {
      console.error('更新用户信息失败', error);
      throw error;
    }
  }
};

// 会话集合操作
const sessions = {
  // 创建新会话
  async createSession(userIds, type = 'single', title = '') {
    try {
      const now = new Date();
      
      // 添加会话到数据库
      const res = await db.collection('sessions').add({
        data: {
          userIds: userIds,
          type: type,
          title: title,
          createTime: now,
          updateTime: now,
          lastMessage: {
            content: '',
            timestamp: now
          }
        }
      });
      
      return res._id;
    } catch (error) {
      console.error('创建会话失败', error);
      throw error;
    }
  },

  // 获取用户的所有会话
  async getUserSessions(userId) {
    try {
      const res = await db.collection('sessions')
        .where({
          userIds: userId
        })
        .orderBy('updateTime', 'desc')
        .get();
      
      return res.data;
    } catch (error) {
      console.error('获取会话列表失败', error);
      throw error;
    }
  },

  // 获取会话详情
  async getSessionDetail(sessionId) {
    try {
      const res = await db.collection('sessions').doc(sessionId).get();
      return res.data;
    } catch (error) {
      console.error('获取会话详情失败', error);
      throw error;
    }
  },

  // 更新会话信息
  async updateSession(sessionId, data) {
    try {
      const now = new Date();
      const res = await db.collection('sessions').doc(sessionId).update({
        data: {
          ...data,
          updateTime: now
        }
      });
      return res;
    } catch (error) {
      console.error('更新会话失败', error);
      throw error;
    }
  }
};

// 消息集合操作
const messages = {
  // 发送新消息
  async sendMessage(sessionId, senderId, content, contentType = 'text') {
    try {
      const now = new Date();
      
      // 添加消息到数据库
      const res = await db.collection('messages').add({
        data: {
          sessionId: sessionId,
          senderId: senderId,
          content: content,
          contentType: contentType,
          timestamp: now,
          status: 'sent',
          isDeleted: false
        }
      });
      
      // 更新会话的最后消息和更新时间
      await db.collection('sessions').doc(sessionId).update({
        data: {
          updateTime: now,
          lastMessage: {
            content: content,
            timestamp: now
          }
        }
      });
      
      return res._id;
    } catch (error) {
      console.error('发送消息失败', error);
      throw error;
    }
  },

  // 获取会话的消息列表
  async getSessionMessages(sessionId, limit = 20, skip = 0) {
    try {
      const res = await db.collection('messages')
        .where({
          sessionId: sessionId,
          isDeleted: false
        })
        .orderBy('timestamp', 'desc')
        .skip(skip)
        .limit(limit)
        .get();
      
      return res.data.reverse(); // 按时间正序返回
    } catch (error) {
      console.error('获取消息列表失败', error);
      throw error;
    }
  },

  // 设置消息已读状态
  async setMessageRead(messageId) {
    try {
      const res = await db.collection('messages').doc(messageId).update({
        data: {
          status: 'read'
        }
      });
      return res;
    } catch (error) {
      console.error('设置消息已读失败', error);
      throw error;
    }
  },

  // 逻辑删除消息
  async deleteMessage(messageId) {
    try {
      const res = await db.collection('messages').doc(messageId).update({
        data: {
          isDeleted: true
        }
      });
      return res;
    } catch (error) {
      console.error('删除消息失败', error);
      throw error;
    }
  }
};

module.exports = {
  users,
  sessions,
  messages
}; 