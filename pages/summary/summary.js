const app = getApp();

Page({
  data: {
    fromChat: false,          // 是否来自对话页面
    chatMessages: [],         // 对话消息
    todayDate: '',            // 今天日期
    selectedDate: '',         // 选择的日期
    selectedDateDisplay: '',  // 显示的日期文本
    hasSummary: false,        // 是否有总结
    summaryContent: null,     // 总结内容
    summaryStatus: '',        // 总结状态：'generated', 'pending', 'generating'
    dayChatSessions: []       // 当日对话列表
  },

  /**
   * 生命周期函数
   */
  onLoad: function(options) {
    // 是否来自对话页面
    const fromChat = options.fromChat === 'true';
    
    // 获取今天日期
    const today = new Date();
    const todayStr = this.getDateString(today);
    const todayDisplay = this.formatDateDisplay(today);
    
    this.setData({
      fromChat: fromChat,
      todayDate: todayStr,
      selectedDate: todayStr,
      selectedDateDisplay: todayDisplay
    });
    
    if (fromChat) {
      // 显示最近一次对话记录
      this.loadLatestChatSession();
    } else {
      // 加载选择日期的总结
      this.loadDateSummary(todayStr);
    }
  },
  
  /**
   * 页面显示时执行
   */
  onShow: function() {
    // 如果不是从对话页面来，每次显示页面时刷新数据
    if (!this.data.fromChat) {
      this.loadDateSummary(this.data.selectedDate);
    }
  },
  
  /**
   * 加载最近一次对话
   */
  loadLatestChatSession: function() {
    const chatHistory = app.globalData.chatHistory || [];
    
    if (chatHistory && chatHistory.length > 0) {
      // 获取最新的一条对话记录
      const latestChat = chatHistory[chatHistory.length - 1];
      
      this.setData({
        chatMessages: latestChat.messages
      });
      
      // 调用云函数生成总结
      this.generateSummary(latestChat);
    }
  },
  
  /**
   * 调用云函数生成总结
   */
  generateSummary: function(chatSession) {
    wx.showLoading({
      title: '生成总结中...',
    });

    // 调用云函数
    wx.cloud.callFunction({
      name: 'generateDailySummary',
      data: {
        date: chatSession.date,
        userId: app.globalData.userInfo._id,
        conversations: this.formatConversations(chatSession.messages)
      },
      success: res => {
        if (res.result && res.result.success) {
          // 更新状态
          this.setData({
            summaryContent: res.result.summary,
            hasSummary: true,
            summaryStatus: 'generated'
          });
        } else {
          wx.showToast({
            title: '生成总结失败',
            icon: 'error'
          });
        }
      },
      fail: err => {
        console.error('生成总结失败：', err);
        wx.showToast({
          title: '生成总结失败',
          icon: 'error'
        });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },
  
  /**
   * 格式化对话内容
   */
  formatConversations: function(messages) {
    return messages.map(msg => {
      return `${msg.role === 'user' ? '用户' : 'AI'}: ${msg.content}`;
    }).join('\n');
  },
  
  /**
   * 加载选择日期的总结和对话
   */
  loadDateSummary: function(dateStr) {
    wx.showLoading({
      title: '加载中...',
    });

    // 模拟数据
    const mockSummary = {
      overview: "今天是一个充实的工作日，主要围绕项目开发和团队协作展开。通过多轮对话，我们深入讨论了技术方案和实现细节。",
      items: [
        {
          title: "项目开发进展",
          description: "完成了核心功能模块的开发，包括用户认证和数据同步功能。解决了几个关键的技术难题，提升了系统性能。",
          userThoughts: "通过这次开发，我对分布式系统的设计有了更深的理解，特别是在数据一致性方面。"
        },
        {
          title: "团队协作",
          description: "与团队成员进行了深入的技术交流，分享了各自的经验和见解。通过代码审查，发现并解决了一些潜在问题。",
          userThoughts: "团队协作真的很重要，通过交流可以学到很多新的思路和方法。"
        },
        {
          title: "技术学习",
          description: "研究了一些新的技术方案，包括微服务架构和容器化部署。这些知识对未来的项目开发很有帮助。",
          userThoughts: "需要持续学习新技术，保持技术敏感度，这对职业发展很重要。"
        }
      ],
      insights: "通过今天的对话，我意识到技术深度和广度都很重要。在保持技术深度的同时，也要关注新技术的发展。",
      suggestions: "建议制定一个系统的学习计划，定期进行技术分享，这样可以促进团队共同进步。"
    };

    // 模拟对话记录
    const mockSessions = [
      {
        sessionId: 'session1',
        timestamp: new Date().getTime(),
        title: '微服务架构讨论',
        preview: '讨论了微服务架构的优势和挑战，包括服务拆分、数据一致性、服务治理等方面的问题。',
        timeString: '14:30',
        tag: '技术讨论'
      },
      {
        sessionId: 'session2',
        timestamp: new Date().getTime() - 3600000,
        title: '系统性能优化',
        preview: '针对当前系统的性能瓶颈进行了分析，提出了具体的优化方案，包括缓存策略、数据库优化等。',
        timeString: '13:30',
        tag: '性能优化'
      },
      {
        sessionId: 'session3',
        timestamp: new Date().getTime() - 7200000,
        title: '代码重构方案',
        preview: '讨论了现有代码模块的重构方案，重点关注代码质量、可维护性和可扩展性的提升。',
        timeString: '12:30',
        tag: '代码质量'
      },
      {
        sessionId: 'session4',
        timestamp: new Date().getTime() - 10800000,
        title: '团队协作经验',
        preview: '分享了团队协作中的经验和教训，讨论了如何提高开发效率，改善团队沟通。',
        timeString: '11:30',
        tag: '团队建设'
      },
      {
        sessionId: 'session5',
        timestamp: new Date().getTime() - 14400000,
        title: 'Docker实践分享',
        preview: '分享了Docker容器化部署的实践经验，包括环境配置、镜像优化、部署流程等。',
        timeString: '10:30',
        tag: 'DevOps'
      }
    ];

    // 判断总结状态
    let summaryStatus = 'generated';
    const now = new Date();
    const nowDateStr = this.getDateString(now);
    
    // 设置数据
    this.setData({
      hasSummary: true,
      summaryContent: mockSummary,
      summaryStatus: summaryStatus,
      dayChatSessions: mockSessions
    });

    wx.hideLoading();
  },
  
  /**
   * 日期选择变更
   */
  dateChange: function(e) {
    const date = e.detail.value;
    const displayDate = this.formatDateDisplay(new Date(date));
    
    this.setData({
      selectedDate: date,
      selectedDateDisplay: displayDate
    });
    
    // 加载选择日期的总结
    this.loadDateSummary(date);
  },
  
  /**
   * 查看某个对话详情
   */
  viewSession: function(e) {
    const index = e.currentTarget.dataset.index;
    const session = this.data.dayChatSessions[index];
    
    // 将选中的会话保存到临时存储
    wx.setStorageSync('tempViewSession', session);
    
    // 导航到对话查看页面
    wx.navigateTo({
      url: '/pages/chat/chat?sessionId=' + session.sessionId
    });
  },
  
  /**
   * 刷新总结内容
   */
  refreshSummary: function() {
    this.loadDateSummary(this.data.selectedDate);
  },
  
  /**
   * 分享总结内容
   */
  shareSummary: function() {
    if (!this.data.hasSummary) {
      wx.showToast({
        title: '暂无总结内容',
        icon: 'none'
      });
      return;
    }
    
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
  },
  
  /**
   * 返回上一页
   */
  goBack: function() {
    wx.navigateBack();
  },
  
  /**
   * 返回首页
   */
  gotoHome: function() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },
  
  /**
   * 工具函数：获取日期字符串 YYYY-MM-DD
   */
  getDateString: function(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  },
  
  /**
   * 工具函数：格式化日期显示
   */
  formatDateDisplay: function(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    // 判断是否为今天
    const today = new Date();
    if (year === today.getFullYear() && month === today.getMonth() + 1 && day === today.getDate()) {
      return '今天';
    }
    
    // 判断是否为昨天
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (year === yesterday.getFullYear() && month === yesterday.getMonth() + 1 && day === yesterday.getDate()) {
      return '昨天';
    }
    
    // 其他日期显示完整日期
    return `${year}年${month}月${day}日`;
  }
}) 