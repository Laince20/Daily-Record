App({
  globalData: {
    userInfo: null,
    isLogin: false,
    uniqueId: null,
    chatHistory: [],
    dailySummary: {},
    db: null // 数据库对象
  },
  onLaunch: function() {
    // 初始化应用
    this.loadChatHistory();
    
    // 检查登录状态
    this.checkLoginStatus();
    
    // 初始化云函数环境
    if (wx.cloud) {
      wx.cloud.init({
        env: wx.cloud.DYNAMIC_CURRENT_ENV,
        traceUser: true
      });
      
      // 初始化数据库
      this.globalData.db = wx.cloud.database();
    }
    
    // 初始化数据库集合结构
    this.initDatabaseCollections();
  },
  
  // 初始化数据库集合结构
  initDatabaseCollections: function() {
    // 获取数据库对象
    const db = this.globalData.db;
    if (!db) return;
    
    // 检查并创建集合
    this.checkAndCreateCollection('users');
    this.checkAndCreateCollection('sessions');
    this.checkAndCreateCollection('messages');
  },
  
  // 检查并创建集合
  checkAndCreateCollection: function(collectionName) {
    const db = this.globalData.db;
    if (!db) return;
    
    // 尝试查询集合信息，如果不存在则创建
    db.collection(collectionName)
      .limit(1)
      .get()
      .catch(err => {
        console.log(`集合 ${collectionName} 不存在，尝试创建...`);
        // 调用云函数创建集合
        wx.cloud.callFunction({
          name: 'initCollection',
          data: {
            collectionName: collectionName
          },
          success: function(res) {
            console.log(`创建集合 ${collectionName} 成功`, res);
          },
          fail: function(err) {
            console.error(`创建集合 ${collectionName} 失败`, err);
          }
        });
      });
  },
  
  // 检查登录状态
  checkLoginStatus: function() {
    const userInfo = wx.getStorageSync('userInfo');
    const uniqueId = wx.getStorageSync('uniqueId');
    
    if (userInfo && uniqueId) {
      this.globalData.userInfo = userInfo;
      this.globalData.uniqueId = uniqueId;
      this.globalData.isLogin = true;
    }
  },
  
  // 用户登录方法
  login: function(callback) {
    const that = this;
    
    wx.login({
      success: res => {
        if (res.code) {
          // 调用云函数登录
          wx.cloud.callFunction({
            name: 'login',
            data: {
              code: res.code,
              wxUserInfo: that.globalData.userInfo
            },
            success: function(result) {
              // 登录成功
              if (result.result && result.result.code === 0) {
                const userData = result.result.data;
                
                // 存储用户信息和唯一ID
                that.globalData.userInfo = userData.userInfo;
                that.globalData.uniqueId = userData.uniqueId;
                that.globalData.isLogin = true;
                
                // 本地持久化
                wx.setStorageSync('userInfo', userData.userInfo);
                wx.setStorageSync('uniqueId', userData.uniqueId);
                
                if (callback) callback(true);
              } else {
                wx.showToast({
                  title: '登录失败，请重试',
                  icon: 'none'
                });
                if (callback) callback(false);
              }
            },
            fail: function(err) {
              console.error('登录失败', err);
              wx.showToast({
                title: '网络错误，请重试',
                icon: 'none'
              });
              if (callback) callback(false);
            }
          });
        } else {
          wx.showToast({
            title: '登录失败: ' + res.errMsg,
            icon: 'none'
          });
          if (callback) callback(false);
        }
      }
    });
  },
  
  // 检查是否已登录
  checkLogin: function() {
    return this.globalData.isLogin;
  },
  
  // 加载历史记录
  loadChatHistory: function() {
    const chatHistory = wx.getStorageSync('chatHistory') || [];
    const dailySummary = wx.getStorageSync('dailySummary') || {};
    this.globalData.chatHistory = chatHistory;
    this.globalData.dailySummary = dailySummary;
  },
  
  // 保存对话记录
  saveChatRecord: function(chatSession) {
    let chatHistory = this.globalData.chatHistory;
    chatHistory.push(chatSession);
    this.globalData.chatHistory = chatHistory;
    wx.setStorageSync('chatHistory', chatHistory);
  },
  
  // 保存日常总结
  saveDailySummary: function(date, summary) {
    this.globalData.dailySummary[date] = summary;
    wx.setStorageSync('dailySummary', this.globalData.dailySummary);
  }
}) 