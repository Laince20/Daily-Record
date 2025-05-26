const app = getApp();

Page({
  data: {
    isVoiceMode: false,   // 默认为文字输入模式
    isRecording: false,   // 是否正在录音
    isMuted: false,       // 是否静音
    inputValue: "",       // 文本输入框的值
    textFocus: false,     // 文本输入框是否获得焦点
    messages: [],         // 消息列表
    scrollToView: "",     // 滚动到指定消息
    selectedAssistant: "甜美小溪", // 默认AI角色
    timer: null,          // 无操作倒计时定时器
    inactiveTime: 60,     // 无操作自动结束时间（秒）
    statusText: "",       // 状态文本
    lastUserMessage: "",  // 最后一条用户消息
    isAiResponding: false, // AI是否正在回复
    isSpeaking: false,    // 是否正在播放语音
    userId: '',           // 用户唯一标识
    conversationId: '',   // 对话会话ID
    isHistorySidebarOpen: false, // 是否显示历史对话侧边栏
    conversationList: [], // 历史对话列表
    sessionId: '',        // 云数据库会话ID
    // 欢迎消息数组
    welcomeMessages: [
      "你好呀，今天过得怎么样呀？",
      "嗨，很高兴见到你！有什么我能帮到你的吗？",
      "你好啊，今天有什么想聊的吗？",
      "哈喽！有什么我可以帮你解决的问题吗？",
      "嗨，亲爱的朋友！今天想聊点什么呢？",
      "hey~有什么开心或不开心的事想和我分享吗？",
      "你好呀，我一直在等你来找我聊天呢！"
    ],
    // 扣子API相关信息
    botId: '7491502212876156962',
    accessToken: 'pat_VPCHYnPhCMvIgqmFgpcC5lbtyp8lnEV5xkndHwc1xG4oJgT6UG6nNGuDHKZGZKxu',
    apiBaseUrl: 'https://api.coze.cn',
  },

  /**
   * 生命周期函数
   */
  onLoad: function(options) {
    // 初始化云环境
    wx.cloud.init({
      env: wx.cloud.DYNAMIC_CURRENT_ENV,
      traceUser: true
    });
    
    // 创建唯一的user_id标记本次对话
    this.createUniqueUserId();
    
    // 初始化录音管理器
    this.initRecorderManager();
    
    // 创建新会话
    this.createConversation();
    
    // 加载历史对话列表
    this.loadConversationList();
  },
  
  /**
   * 创建唯一的用户ID
   */
  createUniqueUserId: function() {
    // 生成唯一的user_id: 时间戳+随机数
    const userId = `user_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    console.log('创建对话会话，用户ID:', userId);
    this.setData({
      userId: userId
    });
    
    // 获取用户OpenID
    wx.cloud.callFunction({
      name: 'getOpenId',
      success: res => {
        console.log('获取用户OpenID成功', res.result.openid);
        this.setData({
          openId: res.result.openid
        });
      },
      fail: err => {
        console.error('获取用户OpenID失败', err);
      }
    });
  },
  
  onUnload: function() {
    // 页面卸载，清除计时器
    this.clearInactiveTimer();
    
    // 停止录音和播放
    if (this.recorderManager) {
      this.recorderManager.stop();
    }
    if (this.innerAudioContext) {
      this.innerAudioContext.stop();
    }
  },
  
  /**
   * 初始化录音管理器
   */
  initRecorderManager: function() {
    // 初始化录音管理器
    this.recorderManager = wx.getRecorderManager();
    this.recorderManager.onStart(() => {
      console.log('录音开始');
      this.setData({
        isRecording: true
      });
      this.updateStatusText('正在录音...', 0); // 录音期间一直显示
    });
    
    this.recorderManager.onStop((res) => {
      console.log('录音结束', res);
      this.setData({
        isRecording: false
      });
      this.updateStatusText('录音结束，识别中...');
      
      // 如果录音时长太短，则忽略
      if (res.duration < 1000) {
        this.updateStatusText('录音时间太短，请重试');
        return;
      }
      
      // 处理录音文件，进行语音识别
      this.processAudioFile(res.tempFilePath);
    });
    
    this.recorderManager.onError((err) => {
      console.error('录音失败', err);
      this.setData({
        isRecording: false
      });
      this.updateStatusText('录音失败: ' + err.errMsg);
    });
    
    // 初始化音频播放器
    this.innerAudioContext = wx.createInnerAudioContext();
    this.innerAudioContext.onPlay(() => {
      console.log('开始播放');
      this.setData({
        isSpeaking: true
      });
    });
    
    this.innerAudioContext.onStop(() => {
      console.log('停止播放');
      this.setData({
        isSpeaking: false
      });
    });
    
    this.innerAudioContext.onEnded(() => {
      console.log('播放结束');
      this.setData({
        isSpeaking: false
      });
    });
    
    this.innerAudioContext.onError((err) => {
      console.error('播放错误', err);
      this.setData({
        isSpeaking: false
      });
    });
  },
  
  /**
   * 开始录音
   */
  startRecording: function(e) {
    console.log('触发开始录音', e);
    
    // 防止快速点击
    if (this.data.isRecording) {
      console.log('已经在录音中，忽略此次请求');
      return;
    }
    
    // 更新状态
    this.updateStatusText('按住说话，松开发送', 0);
    
    // 录音参数
    const options = {
      duration: 60000, // 最长录音时间，单位ms
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 48000,
      format: 'mp3', // 使用mp3格式，符合扣子API要求
      frameSize: 50
    };
    
    // 请求录音权限并开始录音
    wx.authorize({
      scope: 'scope.record',
      success: () => {
        // 有录音权限，开始录音
        this.recorderManager.start(options);
      },
      fail: () => {
        // 用户拒绝授权
        this.updateStatusText('需要录音权限才能使用语音功能');
        
        // 打开设置页面让用户授权
        wx.showModal({
          title: '需要授权',
          content: '使用语音功能需要录音权限，是否前往设置？',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting();
            }
          }
        });
      }
    });
  },
  
  /**
   * 结束录音
   */
  stopRecording: function(e) {
    console.log('触发结束录音', e);
    
    // 如果不在录音状态，忽略
    if (!this.data.isRecording) {
      console.log('没有在录音，忽略结束录音请求');
      return;
    }
    
    // 更新状态
    this.updateStatusText('正在处理语音...');
    
    // 停止录音
    this.recorderManager.stop();
  },
  
  /**
   * 切换输入模式（文字/语音）
   */
  switchMode: function() {
    this.setData({
      isVoiceMode: !this.data.isVoiceMode,
      textFocus: !this.data.isVoiceMode // 切换到文本模式时自动聚焦
    });
    
    // 重置无操作计时器
    this.startInactiveTimer();
  },
  
  /**
   * 切换静音
   */
  toggleMute: function() {
    this.setData({
      isMuted: !this.data.isMuted
    });
    
    // 如果正在播放语音且切换到静音，则停止播放
    if (this.data.isMuted && this.data.isSpeaking) {
      this.innerAudioContext.stop();
    }
    
    // 重置无操作计时器
    this.startInactiveTimer();
  },
  
  /**
   * 结束对话
   */
  finishConversation: function() {
    // 生成总结
    const summary = this.generateSummary();
    
    // 保存对话记录和总结
    const date = new Date().toISOString().split('T')[0]; // 格式：YYYY-MM-DD
    const sessionData = {
      date: date,
      messages: this.data.messages,
      summary: summary
    };
    
    // 保存到全局数据
    app.saveChatRecord(sessionData);
    app.saveDailySummary(date, summary);
    
    // 跳转到总结页面
    wx.navigateTo({
      url: '/pages/summary/summary?date=' + date
    });
  },
  
  /**
   * 生成对话总结
   */
  generateSummary: function() {
    // 模拟生成总结
    const summaries = [
      "今天你完成了重要工作，但感到有些疲惫。建议合理安排休息，保持工作与生活平衡。",
      "你今天的情绪整体平稳，工作上有一些小困扰。明天可以尝试优化工作流程，提高效率。",
      "今天你看起来心情不错，充满积极能量。这种状态有助于提高创造力和解决问题的能力。",
      "工作中的沟通似乎让你有些困扰。建议尝试更直接的表达方式，避免误解产生。",
      "你今天的状态显示出对自我提升的渴望。建议制定一个小目标，循序渐进地实现它。"
    ];
    
    return summaries[Math.floor(Math.random() * summaries.length)];
  },
  
  /**
   * 开始无操作计时器
   */
  startInactiveTimer: function() {
    // 清除现有计时器
    this.clearInactiveTimer();
    
    // 设置新计时器
    this.data.timer = setInterval(() => {
      let inactiveTime = this.data.inactiveTime - 1;
      
      if (inactiveTime <= 0) {
        // 时间到，自动结束对话
        this.clearInactiveTimer();
        this.finishConversation();
        return;
      }
      
      this.setData({
        inactiveTime: inactiveTime
      });
    }, 1000);
  },
  
  /**
   * 清除无操作计时器
   */
  clearInactiveTimer: function() {
    if (this.data.timer) {
      clearInterval(this.data.timer);
      this.setData({
        inactiveTime: 60 // 重置为60秒
      });
    }
  },
  
  /**
   * 处理录音文件 - 语音识别
   * 使用扣子ASR API进行语音转文本
   */
  processAudioFile: function(audioPath) {
    wx.showLoading({
      title: '语音识别中...',
    });
    
    // 上传录音文件到扣子ASR API
    wx.uploadFile({
      url: `${this.data.apiBaseUrl}/v1/audio/transcriptions`,
      filePath: audioPath,
      name: 'file',
      header: {
        'Authorization': `Bearer ${this.data.accessToken}`
      },
      success: (res) => {
        wx.hideLoading();
        
        // 解析返回结果
        try {
          const result = JSON.parse(res.data);
          console.log('语音识别结果:', result);
          
          if (result.code === 0 && result.data && result.data.text) {
            // 语音识别成功，获取文本内容
            const recognizedText = result.data.text;
            
            // 设置状态提示
            this.updateStatusText('识别成功: ' + recognizedText);
            
            // 设置输入框的值及最后用户消息
            this.setData({
              inputValue: recognizedText,
              lastUserMessage: recognizedText
            });
            
            // 发送消息
            this.sendMessage();
          } else {
            // 语音识别失败
            console.error('语音识别失败:', result);
            this.updateStatusText('语音识别失败: ' + (result.msg || '未知错误'));
          }
        } catch (error) {
          console.error('解析语音识别结果失败:', error);
          this.updateStatusText('解析语音识别结果失败');
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('语音识别请求失败:', err);
        this.updateStatusText('语音识别请求失败，请检查网络');
      }
    });
  },
  
  /**
   * 输入框内容变化
   */
  inputChange: function(e) {
    this.setData({
      inputValue: e.detail.value
    });
  },
  
  /**
   * 发送消息
   */
  sendMessage: function() {
    const content = this.data.inputValue.trim();
    if (!content) return;
    
    // 添加用户消息到界面
    this.addMessage({
      role: 'user',
      content: content
    });
    
    // 设置最后一条用户消息并清空输入框
    this.setData({
      inputValue: '',
      lastUserMessage: content
    });
    
    // 发送消息到扣子API
    this.sendMessageToCoze(content);
  },
  
  /**
   * 添加消息到列表
   */
  addMessage: function(message) {
    const messages = this.data.messages;
    messages.push(message);
    
    this.setData({
      messages: messages,
      scrollToView: `msg-${messages.length - 1}`
    });
  },
  
  /**
   * 创建扣子会话
   */
  createConversation: function() {
    wx.showLoading({
      title: '连接中...',
    });
    
    // 创建扣子API会话
    wx.request({
      url: `${this.data.apiBaseUrl}/v1/conversation/create`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${this.data.accessToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        bot_id: this.data.botId,
        meta_data: {
          uuid: this.data.userId
        }
      },
      success: (res) => {
        wx.hideLoading();
        console.log('创建会话成功:', res.data);
        
        if (res.data.code === 0) {
          // 保存会话ID
          this.setData({
            conversationId: res.data.data.id
          });
          
          // 添加初始欢迎消息
          this.addMessage({
            role: 'ai',
            content: this.data.welcomeMessages[Math.floor(Math.random() * this.data.welcomeMessages.length)]
          });
          
          // 创建云数据库会话
          this.createCloudSession();
        } else {
          wx.showToast({
            title: '创建会话失败: ' + res.data.msg,
            icon: 'none',
            duration: 2000
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('创建会话请求失败:', err);
        wx.showToast({
          title: '网络请求失败',
          icon: 'none',
          duration: 2000
        });
        
        // 添加备用欢迎消息，以免界面为空
        this.addMessage({
          role: 'ai',
          content: '网络连接失败，请稍后再试。'
        });
      }
    });
  },
  
  /**
   * 创建云数据库会话
   */
  createCloudSession: function() {
    // 调用云函数创建会话
    wx.cloud.callFunction({
      name: 'createSession',
      data: {
        title: `对话 ${new Date().toLocaleString()}`,
        aiRole: this.data.selectedAssistant,
        cozeConversationId: this.data.conversationId
      },
      success: res => {
        console.log('云数据库创建会话成功', res.result);
        if (res.result.code === 0) {
          this.setData({
            sessionId: res.result.data.conversationId
          });
        } else {
          console.error('云数据库创建会话失败', res.result.message);
        }
      },
      fail: err => {
        console.error('调用createSession云函数失败', err);
      }
    });
  },
  
  /**
   * 发送消息到扣子API
   */
  sendMessageToCoze: function(content) {
    // 检查会话ID是否存在
    if (!this.data.conversationId) {
      console.error('会话ID不存在，无法发送消息');
      return;
    }
    
    this.setData({ isAiResponding: true });
    
    wx.request({
      url: `${this.data.apiBaseUrl}/v1/conversation/message/create?conversation_id=${this.data.conversationId}`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${this.data.accessToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        role: 'user',
        content: content,
        content_type: 'text'
      },
      success: (res) => {
        console.log('发送消息成功:', res.data);
        
        if (res.data.code === 0) {
          // 消息发送成功，开始获取AI回复
          this.getAiResponse();
          
          // 同时保存消息到云数据库
          this.saveMessageToCloud(content, 'user');
        } else {
          this.setData({ isAiResponding: false });
          wx.showToast({
            title: '发送消息失败: ' + res.data.msg,
            icon: 'none',
            duration: 2000
          });
        }
      },
      fail: (err) => {
        console.error('发送消息请求失败:', err);
        this.setData({ isAiResponding: false });
        wx.showToast({
          title: '网络请求失败',
          icon: 'none',
          duration: 2000
        });
      }
    });
  },
  
  /**
   * 保存消息到云数据库
   */
  saveMessageToCloud: function(content, role) {
    // 检查会话ID是否存在
    if (!this.data.sessionId) {
      console.error('云数据库会话ID不存在，无法保存消息');
      return;
    }
    
    // 调用云函数保存消息
    wx.cloud.callFunction({
      name: 'sendMessage',
      data: {
        conversationId: this.data.sessionId,
        content: content,
        contentType: 'text',
        sender: role
      },
      success: res => {
        console.log('云数据库保存消息成功', res.result);
      },
      fail: err => {
        console.error('调用sendMessage云函数失败', err);
      }
    });
  },
  
  /**
   * 获取AI回复
   */
  getAiResponse: function() {
    // 修改获取聊天结果的方法，直接使用open_api/v2/chat接口
    wx.request({
      url: `${this.data.apiBaseUrl}/open_api/v2/chat`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${this.data.accessToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        bot_id: this.data.botId,
        user: this.data.userId,
        query: this.data.lastUserMessage || "你好",
        stream: false
      },
      success: (res) => {
        console.log('获取聊天结果:', res.data);
        
        if (res.data.code === 0 && res.data.messages && res.data.messages.length > 0) {
          // 只获取类型为answer的消息
          const answerMessages = res.data.messages.filter(msg => msg.type === 'answer');
          
          if (answerMessages.length > 0) {
            // 获取AI回复
            const aiResponse = answerMessages[0].content;
            
            // 添加AI回复到聊天界面
            this.addMessage({
              role: 'ai',
              content: aiResponse
            });
            
            // 保存AI消息到云数据库
            this.saveMessageToCloud(aiResponse, 'ai');
            
            // 保存对话到历史记录
            this.saveConversation();
          } else {
            console.warn('未找到answer类型的消息');
            wx.showToast({
              title: '未获取到有效回复',
              icon: 'none',
              duration: 2000
            });
          }
        } else {
          wx.showToast({
            title: '获取回复内容失败',
            icon: 'none',
            duration: 2000
          });
        }
        
        this.setData({ isAiResponding: false });
      },
      fail: (err) => {
        console.error('获取聊天结果失败:', err);
        this.setData({ isAiResponding: false });
        wx.showToast({
          title: '网络请求失败',
          icon: 'none',
          duration: 2000
        });
      }
    });
  },
  
  /**
   * 保存对话到历史记录
   */
  saveConversation: function() {
    // 获取现有的对话历史
    const conversations = wx.getStorageSync('conversations') || [];
    
    // 检查是否是新对话
    const existingIndex = conversations.findIndex(c => c.id === this.data.conversationId);
    
    if (existingIndex === -1) {
      // 创建新对话记录
      const newConversation = {
        id: this.data.conversationId,
        sessionId: this.data.sessionId, // 添加云数据库会话ID
        title: this.data.messages.length > 0 ? 
               (this.data.messages[0].role === 'user' ? this.data.messages[0].content : '新对话') : 
               '新对话',
        date: new Date().toLocaleDateString(),
        messages: this.data.messages
      };
      
      // 裁剪标题长度
      if (newConversation.title.length > 20) {
        newConversation.title = newConversation.title.substring(0, 20) + '...';
      }
      
      // 添加到历史记录
      conversations.unshift(newConversation);
    } else {
      // 更新现有对话
      conversations[existingIndex].messages = this.data.messages;
      conversations[existingIndex].sessionId = this.data.sessionId;
    }
    
    // 保存到本地存储
    wx.setStorageSync('conversations', conversations);
    
    // 更新历史对话列表
    this.loadConversationList();
  },
  
  /**
   * 加载历史对话列表
   */
  loadConversationList: function() {
    // 首先从本地存储中加载
    const conversations = wx.getStorageSync('conversations') || [];
    
    // 仅显示标题和日期
    const conversationList = conversations.map(c => ({
      id: c.id,
      sessionId: c.sessionId,
      title: c.title,
      date: c.date
    }));
    
    this.setData({
      conversationList: conversationList
    });
    
    // TODO: 未来可以从云数据库加载完整历史记录
  },
  
  /**
   * 选择历史对话
   */
  selectConversation: function(e) {
    const id = e.currentTarget.dataset.id;
    const conversations = wx.getStorageSync('conversations') || [];
    const conversation = conversations.find(c => c.id === id);
    
    if (conversation) {
      // 切换到选中的对话
      this.setData({
        messages: conversation.messages,
        conversationId: id,
        isHistorySidebarOpen: false
      });
      
      // 滚动到最后一条消息
      this.setData({
        scrollToView: `msg-${conversation.messages.length - 1}`
      });
    }
  },
  
  /**
   * 显示历史对话列表
   */
  showHistoryList: function() {
    this.setData({
      isHistorySidebarOpen: true
    });
  },
  
  /**
   * 隐藏历史对话列表
   */
  hideHistoryList: function() {
    this.setData({
      isHistorySidebarOpen: false
    });
  },
  
  /**
   * 新建对话
   */
  createNewConversation: function() {
    // 关闭侧边栏
    this.setData({
      isHistorySidebarOpen: false,
      messages: []
    });
    
    // 清空当前会话数据
    this.createUniqueUserId();
    
    // 创建新会话
    this.createConversation();
  },

  /**
   * 删除对话
   */
  deleteConversation: function(e) {
    // 微信小程序中不需要手动调用stopPropagation
    // 因为我们已经在视图层使用了catchtap而非bindtap
    
    const id = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个对话吗？',
      success: (res) => {
        if (res.confirm) {
          // 获取现有对话
          const conversations = wx.getStorageSync('conversations') || [];
          
          // 找到要删除的对话
          const targetConversation = conversations.find(c => c.id === id);
          
          // 过滤掉要删除的对话
          const updatedConversations = conversations.filter(c => c.id !== id);
          
          // 保存更新后的对话列表
          wx.setStorageSync('conversations', updatedConversations);
          
          // 刷新对话列表
          this.loadConversationList();
          
          // TODO: 从云数据库中删除对话(未来可实现)
          
          // 如果删除的是当前对话，则创建新对话
          if (id === this.data.conversationId) {
            this.createNewConversation();
          }
          
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
        }
      }
    });
  },
  
  /**
   * 更新状态文本并设置自动清除
   */
  updateStatusText: function(text, duration = 2000) {
    this.setData({
      statusText: text
    });
    
    // 自动清除状态文本
    if (duration > 0) {
      setTimeout(() => {
        this.setData({
          statusText: ''
        });
      }, duration);
    }
  },
  
  /**
   * 手指在录音按钮上移动
   * 用于实现滑动取消录音功能
   */
  moveRecording: function(e) {
    if (!this.data.isRecording) return;
    
    // 获取手指位置，判断是否移出按钮区域
    // 这里可以实现"上滑取消录音"的交互
    // 获取触摸点位置相对于按钮的偏移
    const touch = e.touches[0];
    const pageY = touch.pageY;
    
    // 获取按钮位置信息，但在小程序中我们需要通过createSelectorQuery获取
    if (!this.recordButtonTop) {
      // 延迟获取按钮位置
      wx.createSelectorQuery()
        .select('.press-talk-text')
        .boundingClientRect((rect) => {
          if (rect) {
            this.recordButtonTop = rect.top;
            this.recordButtonHeight = rect.height;
          }
        })
        .exec();
      return;
    }
    
    // 判断是否上滑超出一定距离（如按钮高度的一半）
    if (this.recordButtonTop && pageY < this.recordButtonTop - 50) {
      // 手指上滑，显示取消提示
      if (!this.isCancelHinted) {
        this.isCancelHinted = true;
        this.updateStatusText('松开手指取消录音', 0);
      }
    } else {
      // 手指回到按钮区域
      if (this.isCancelHinted) {
        this.isCancelHinted = false;
        this.updateStatusText('按住说话，松开发送', 0);
      }
    }
  },
  
  /**
   * 取消录音
   * 当触摸被打断或用户主动取消时调用
   */
  cancelRecording: function() {
    console.log('取消录音');
    
    if (this.data.isRecording) {
      // 停止录音但不处理
      this.recorderManager.stop();
      
      // 更新状态
      this.updateStatusText('录音已取消');
      
      // 重置状态
      this.isCancelHinted = false;
    }
  }
}); 