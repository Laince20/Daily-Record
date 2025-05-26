// pages/voice_chat/voice_chat.js
Page({
  data: {
    logs: [],
    wsConnected: false,
    isRecording: false,
    chatActive: false,
    audioChunks: []
  },

  onLoad: function() {
    this.addLog('页面加载完成', 'info');
  },

  onUnload: function() {
    this.closeSocket();
    this.stopRecordingManager();
  },

  // 添加日志
  addLog: function(msg, type = 'info') {
    const time = this.formatTime(new Date());
    const logs = this.data.logs;
    logs.push({
      time,
      msg,
      type
    });
    
    // 保留最多100条日志
    if (logs.length > 100) {
      logs.shift();
    }
    
    this.setData({
      logs: logs
    });
    
    console.log(`[${type.toUpperCase()}] ${msg}`);
  },

  // 格式化时间
  formatTime: function(date) {
    const hour = date.getHours();
    const minute = date.getMinutes();
    const second = date.getSeconds();
    const millisecond = date.getMilliseconds();

    return [hour, minute, second].map(this.formatNumber).join(':') + '.' + millisecond;
  },

  formatNumber: function(n) {
    n = n.toString();
    return n[1] ? n : '0' + n;
  },

  // 开始对话
  startChat: function() {
    console.log('开始对话按钮点击');
    this.addLog('准备开始对话', 'info');
    
    // 检查授权状态
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.record']) {
          this.addLog('请求麦克风权限', 'warning');
          wx.authorize({
            scope: 'scope.record',
            success: () => {
              this.addLog('麦克风权限已授权', 'success');
              this.initRecorderManager();
              this.connectWebSocket();
            },
            fail: (err) => {
              this.addLog(`麦克风权限授权失败: ${JSON.stringify(err)}`, 'error');
              // 引导用户打开设置页面
              wx.showModal({
                title: '提示',
                content: '需要麦克风权限才能使用语音功能，是否前往设置页面授权？',
                success: (modalRes) => {
                  if (modalRes.confirm) {
                    wx.openSetting();
                  }
                }
              });
            }
          });
        } else {
          this.addLog('麦克风权限已授权', 'success');
          this.initRecorderManager();
          this.connectWebSocket();
        }
      },
      fail: (err) => {
        this.addLog(`获取设置失败: ${JSON.stringify(err)}`, 'error');
      }
    });
  },

  // 初始化录音管理器
  initRecorderManager: function() {
    this.addLog('初始化录音管理器', 'info');
    
    this.recorderManager = wx.getRecorderManager();
    
    this.recorderManager.onStart(() => {
      this.addLog('录音开始', 'success');
      this.setData({
        isRecording: true
      });
    });
    
    this.recorderManager.onPause(() => {
      this.addLog('录音暂停', 'warning');
    });
    
    this.recorderManager.onResume(() => {
      this.addLog('录音继续', 'info');
    });
    
    this.recorderManager.onStop((res) => {
      const { tempFilePath } = res;
      this.addLog(`录音结束，文件路径: ${tempFilePath}`, 'info');
      this.setData({
        isRecording: false
      });
      
      // 读取录音文件并发送
      this.sendRecordedAudio(tempFilePath);
    });
    
    this.recorderManager.onError((err) => {
      this.addLog(`录音错误: ${JSON.stringify(err)}`, 'error');
      this.setData({
        isRecording: false
      });
    });
    
    this.addLog('录音管理器初始化完成', 'success');
  },

  // 停止录音管理器
  stopRecordingManager: function() {
    if (this.recorderManager && this.data.isRecording) {
      this.recorderManager.stop();
      this.addLog('录音管理器已停止', 'info');
    }
  },

  // 连接WebSocket
  connectWebSocket: function() {
    this.addLog('开始连接WebSocket', 'info');
    
    const token = "pat_VPCHYnPhCMvIgqmFgpcC5lbtyp8lnEV5xkndHwc1xG4oJgT6UG6nNGuDHKZGZKxu";
    const botId = "7491502212876156962";
    
    this.socketTask = wx.connectSocket({
      url: `wss://ws.coze.cn/v1/chat?bot_id=${botId}`,
      header: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      success: () => {
        this.addLog('WebSocket连接请求已发送', 'info');
      },
      fail: (err) => {
        this.addLog(`WebSocket连接请求失败: ${JSON.stringify(err)}`, 'error');
      }
    });
    
    this.socketTask.onOpen(() => {
      this.addLog('WebSocket连接已建立', 'success');
      this.setData({
        wsConnected: true,
        chatActive: true
      });
      
      // 发送配置信息
      this.sendChatConfig();
    });
    
    this.socketTask.onMessage((res) => {
      try {
        const message = JSON.parse(res.data);
        this.handleSocketMessage(message);
      } catch (err) {
        this.addLog(`解析消息失败: ${err.message}`, 'error');
      }
    });
    
    this.socketTask.onClose(() => {
      this.addLog('WebSocket连接已关闭', 'warning');
      this.setData({
        wsConnected: false,
        chatActive: false
      });
    });
    
    this.socketTask.onError((err) => {
      this.addLog(`WebSocket错误: ${JSON.stringify(err)}`, 'error');
    });
  },

  // 关闭WebSocket
  closeSocket: function() {
    if (this.socketTask) {
      this.socketTask.close({
        success: () => {
          this.addLog('WebSocket已手动关闭', 'info');
        },
        fail: (err) => {
          this.addLog(`关闭WebSocket失败: ${JSON.stringify(err)}`, 'error');
        },
        complete: () => {
          this.setData({
            wsConnected: false,
            chatActive: false
          });
        }
      });
    }
  },

  // 发送对话配置
  sendChatConfig: function() {
    this.addLog('发送对话配置', 'info');
    
    const config = {
      id: "event_" + Date.now(),
      event_type: "chat.update",
      data: {
        chat_config: {
          auto_save_history: true,
          user_id: "user_" + Date.now(),
          meta_data: {},
          custom_variables: {}
        },
        input_audio: {
          format: "wav",
          codec: "pcm",
          sample_rate: 16000,
          channel: 1,
          bit_depth: 16
        },
        output_audio: {
          codec: "pcm",
          pcm_config: {
            sample_rate: 24000,
            frame_size_ms: 50
          },
          speech_rate: 0,
          voice_id: "7426720361733046281"
        },
        turn_detection: {
          type: "client_interrupt"
        }
      }
    };
    
    this.sendSocketMessage(config);
  },

  // 发送WebSocket消息
  sendSocketMessage: function(data) {
    if (!this.socketTask || !this.data.wsConnected) {
      this.addLog('WebSocket未连接，无法发送消息', 'error');
      return;
    }
    
    const message = JSON.stringify(data);
    this.socketTask.send({
      data: message,
      success: () => {
        this.addLog(`消息发送成功: ${data.event_type}`, 'success');
      },
      fail: (err) => {
        this.addLog(`消息发送失败: ${JSON.stringify(err)}`, 'error');
      }
    });
  },

  // 处理接收的WebSocket消息
  handleSocketMessage: function(message) {
    this.addLog(`收到消息: ${message.event_type}`, 'info');
    
    switch(message.event_type) {
      case "chat.created":
        this.addLog("对话连接成功", 'success');
        break;
        
      case "chat.updated":
        this.addLog("对话配置更新成功", 'success');
        break;
        
      case "conversation.chat.created":
        this.addLog("对话开始", 'success');
        break;
        
      case "conversation.audio.delta":
        // 处理增量音频数据
        this.handleAudioDelta(message.data);
        break;
        
      case "conversation.audio.completed":
        this.addLog("语音回复完成", 'success');
        this.playAudio();
        break;
        
      case "conversation.chat.completed":
        this.addLog("对话完成", 'success');
        break;
        
      case "input_audio_buffer.completed":
        this.addLog("音频输入完成", 'success');
        break;
        
      case "error":
        this.addLog(`发生错误: ${JSON.stringify(message.data)}`, 'error');
        break;
        
      default:
        this.addLog(`收到其他类型消息: ${message.event_type}`, 'info');
    }
  },

  // 处理增量音频数据
  handleAudioDelta: function(data) {
    this.addLog(`收到音频数据，长度: ${data.content ? data.content.length : 0}`, 'info');
    
    if (data.content) {
      try {
        // 将Base64音频数据转换为ArrayBuffer
        const arrayBuffer = wx.base64ToArrayBuffer(data.content);
        let audioChunks = this.data.audioChunks;
        audioChunks.push(arrayBuffer);
        
        this.setData({
          audioChunks: audioChunks
        });
      } catch (err) {
        this.addLog(`处理音频数据失败: ${err.message}`, 'error');
      }
    }
  },

  // 开始录音
  startRecording: function() {
    if (!this.recorderManager) {
      this.addLog('录音管理器未初始化', 'error');
      return;
    }
    
    const options = {
      duration: 60000, // 最长录音时间，单位ms
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 48000,
      format: 'wav',
      frameSize: 50
    };
    
    this.addLog('开始录音', 'info');
    this.recorderManager.start(options);
  },

  // 停止录音
  stopRecording: function() {
    if (!this.recorderManager || !this.data.isRecording) {
      this.addLog('没有正在进行的录音', 'warning');
      return;
    }
    
    this.addLog('停止录音', 'info');
    this.recorderManager.stop();
  },

  // 发送录音文件
  sendRecordedAudio: function(filePath) {
    this.addLog(`正在读取录音文件: ${filePath}`, 'info');
    
    // 读取录音文件
    wx.getFileSystemManager().readFile({
      filePath: filePath,
      success: (res) => {
        this.addLog(`读取录音文件成功，大小: ${res.data.byteLength} 字节`, 'success');
        
        // 确认是否是WAV格式
        const isWav = filePath.toLowerCase().endsWith('.wav');
        if (!isWav) {
          this.addLog('警告：文件可能不是WAV格式，可能会导致服务器拒绝', 'warning');
        }
        
        // 将音频数据转为Base64
        const base64Audio = wx.arrayBufferToBase64(res.data);
        
        // 向服务器发送新的对话消息
        const chatEvent = {
          id: "chat_" + Date.now(),
          event_type: "conversation.chat.create",
          data: {
            message: {
              role: "user",
              content: ""
            }
          }
        };
        
        this.sendSocketMessage(chatEvent);
        
        // 分片发送音频数据
        setTimeout(() => {
          this.sendAudioChunks(base64Audio);
        }, 500);
      },
      fail: (err) => {
        this.addLog(`读取录音文件失败: ${JSON.stringify(err)}`, 'error');
      }
    });
  },

  // 分片发送音频数据
  sendAudioChunks: function(base64Audio) {
    this.addLog(`准备分片发送音频数据，总长度: ${base64Audio.length}`, 'info');
    
    // 将音频分成多个块发送
    const chunkSize = 8192; // 每个块的大小
    const totalChunks = Math.ceil(base64Audio.length / chunkSize);
    
    this.addLog(`分为 ${totalChunks} 个块发送`, 'info');
    
    // 先发送开始事件
    const startEvent = {
      id: "audio_start_" + Date.now(),
      event_type: "input_audio_buffer.start"
    };
    
    this.sendSocketMessage(startEvent);
    
    // 然后分块发送音频数据
    for (let i = 0; i < base64Audio.length; i += chunkSize) {
      const chunk = base64Audio.slice(i, i + chunkSize);
      
      const audioEvent = {
        id: "audio_chunk_" + Date.now() + "_" + i,
        event_type: "input_audio_buffer.append",
        data: {
          delta: chunk
        }
      };
      
      this.sendSocketMessage(audioEvent);
    }
    
    // 发送音频完成事件
    this.completeAudioBuffer();
  },

  // 发送音频完成事件
  completeAudioBuffer: function() {
    this.addLog('发送音频完成事件', 'info');
    
    const completeEvent = {
      id: "complete_" + Date.now(),
      event_type: "input_audio_buffer.completed"
    };
    
    this.sendSocketMessage(completeEvent);
  },

  // 播放接收到的音频
  playAudio: function() {
    const audioChunks = this.data.audioChunks;
    
    if (audioChunks.length === 0) {
      this.addLog('没有音频数据可播放', 'warning');
      return;
    }
    
    this.addLog(`准备播放音频，有 ${audioChunks.length} 个音频块`, 'info');
    
    // 合并所有音频块
    const totalLength = audioChunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
    const mergedArray = new Uint8Array(totalLength);
    
    let offset = 0;
    for (const chunk of audioChunks) {
      mergedArray.set(new Uint8Array(chunk), offset);
      offset += chunk.byteLength;
    }
    
    // 将合并后的音频数据保存为临时文件
    const fs = wx.getFileSystemManager();
    const tempFilePath = `${wx.env.USER_DATA_PATH}/temp_audio_${Date.now()}.wav`;
    
    this.addLog(`保存音频数据到临时文件: ${tempFilePath}`, 'info');
    
    try {
      fs.writeFileSync(tempFilePath, mergedArray.buffer, 'binary');
      
      // 创建音频实例并播放
      const innerAudioContext = wx.createInnerAudioContext();
      innerAudioContext.src = tempFilePath;
      
      innerAudioContext.onPlay(() => {
        this.addLog('开始播放音频', 'success');
      });
      
      innerAudioContext.onEnded(() => {
        this.addLog('音频播放结束', 'info');
        innerAudioContext.destroy();
        
        // 播放完成后清空音频块缓存
        this.setData({
          audioChunks: []
        });
      });
      
      innerAudioContext.onError((err) => {
        this.addLog(`播放音频错误: ${JSON.stringify(err)}`, 'error');
        innerAudioContext.destroy();
      });
      
      innerAudioContext.play();
    } catch (err) {
      this.addLog(`保存或播放音频文件失败: ${err.message}`, 'error');
    }
  },

  // 打断智能体输出
  cancelChat: function() {
    this.addLog('发送打断请求', 'warning');
    
    const cancelEvent = {
      id: "cancel_" + Date.now(),
      event_type: "conversation.chat.cancel"
    };
    
    this.sendSocketMessage(cancelEvent);
  },

  // 清除对话上下文
  clearConversation: function() {
    this.addLog('清除对话上下文', 'warning');
    
    const clearEvent = {
      id: "clear_" + Date.now(),
      event_type: "conversation.clear"
    };
    
    this.sendSocketMessage(clearEvent);
  },

  // 关闭对话
  closeChat: function() {
    this.addLog('关闭对话连接', 'warning');
    this.closeSocket();
    this.stopRecordingManager();
    
    this.setData({
      audioChunks: []
    });
  }
}); 