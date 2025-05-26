const app = getApp();
const auth = require('../../utils/auth.js');

Page({
  data: {
    currentDate: '',
    randomGreeting: '',
    isLogin: false,
    userInfo: null
  },

  onLoad: function() {
    this.setCurrentDate();
    this.setRandomGreeting();
  },
  
  onShow: function() {
    // 页面显示时更新日期和问候语
    this.setCurrentDate();
    this.setRandomGreeting();
    
    // 检查登录状态
    this.checkLoginStatus();
  },
  
  // 检查登录状态
  checkLoginStatus: function() {
    const isLogin = app.checkLogin();
    const userInfo = app.globalData.userInfo;
    
    this.setData({
      isLogin: isLogin,
      userInfo: userInfo
    });
  },
  
  // 设置当前日期
  setCurrentDate: function() {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    this.setData({
      currentDate: `${year}年${month}月${day}日`
    });
  },
  
  // 设置随机问候语
  setRandomGreeting: function() {
    const hours = new Date().getHours();
    let timePrefix = '';
    
    if (hours >= 5 && hours < 12) {
      timePrefix = '早上好，';
    } else if (hours >= 12 && hours < 14) {
      timePrefix = '中午好，';
    } else if (hours >= 14 && hours < 18) {
      timePrefix = '下午好，';
    } else {
      timePrefix = '晚上好，';
    }
    
    const greetings = [
      '新的一天充满可能',
      '今天也要加油努力',
      '记录生活，发现美好',
      '记录当下，珍藏未来',
      '一起来回顾今天的收获吧',
      '复盘今日，规划明天',
      '所有努力都值得被记录',
      '继续前行，不负时光',
      '积跬步以至千里',
      '记录成长，见证蜕变'
    ];
    
    const randomIndex = Math.floor(Math.random() * greetings.length);
    this.setData({
      randomGreeting: timePrefix + greetings[randomIndex]
    });
  },
  
  // 处理头像点击事件
  handleAvatarTap: function() {
    wx.showModal({
      title: '提示',
      content: '是否退出登录？',
      success: (res) => {
        if (res.confirm) {
          this.logout();
        }
      }
    });
  },
  
  // 退出登录
  logout: function() {
    // 清除登录状态
    app.globalData.isLogin = false;
    app.globalData.userInfo = null;
    app.globalData.uniqueId = null;
    
    // 清除本地存储
    wx.removeStorageSync('userInfo');
    wx.removeStorageSync('uniqueId');
    
    // 更新页面显示
    this.setData({
      isLogin: false,
      userInfo: null
    });
    
    wx.showToast({
      title: '已退出登录',
      icon: 'success'
    });
  },
  
  // 导航到日常记录页面
  navigateToChat: function() {
    auth.checkAuth(() => {
      wx.navigateTo({
        url: '/pages/chat/chat'
      });
    });
  },
  
  // 导航到历史记录页面
  navigateToHistory: function() {
    auth.checkAuth(() => {
      wx.navigateTo({
        url: '/pages/history/history'
      });
    });
  },
  
  // 导航到总结分析页面
  navigateToSummary: function() {
    auth.checkAuth(() => {
      wx.navigateTo({
        url: '/pages/summary/summary'
      });
    });
  },
  
  // 导航到语音对话测试页面
  navigateToVoiceChat: function() {
    wx.navigateTo({
      url: '/pages/voice_chat/voice_chat'
    });
  },
  
  // 去登录
  goToLogin: function() {
    wx.navigateTo({
      url: '/pages/login/login'
    });
  }
}); 