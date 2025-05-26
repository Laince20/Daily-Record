Page({
  data: {
    canIUseGetUserProfile: false,
    loading: false
  },
  
  onLoad: function() {
    // 检查API是否可用
    if (wx.getUserProfile) {
      this.setData({
        canIUseGetUserProfile: true
      });
    }
  },
  
  // 用户点击登录按钮
  handleLogin: function() {
    const app = getApp();
    
    // 显示加载状态
    this.setData({
      loading: true
    });
    
    if (this.data.canIUseGetUserProfile) {
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: (res) => {
          // 将用户信息保存，用于后续传给服务端
          const userInfo = res.userInfo;
          console.log('获取用户信息成功', userInfo);
          
          // 将用户信息保存到全局
          app.globalData.userInfo = userInfo;
          
          // 调用全局登录方法
          app.login((success) => {
            this.setData({
              loading: false
            });
            
            if (success) {
              wx.showToast({
                title: '登录成功',
                icon: 'success'
              });
              
              // 返回上一页或跳转到首页
              setTimeout(() => {
                const pages = getCurrentPages();
                if (pages.length > 1) {
                  wx.navigateBack({
                    delta: 1,
                    success: () => {
                      // 通知上一页刷新用户信息
                      const prevPage = pages[pages.length - 2];
                      if (prevPage && prevPage.checkLoginStatus) {
                        prevPage.checkLoginStatus();
                      }
                    }
                  });
                } else {
                  wx.reLaunch({
                    url: '/pages/index/index'
                  });
                }
              }, 1500);
            }
          });
        },
        fail: (err) => {
          console.error('获取用户信息失败', err);
          this.setData({
            loading: false
          });
          
          wx.showToast({
            title: '您已拒绝授权',
            icon: 'none'
          });
        }
      });
    } else {
      // 兼容旧版API
      this.handleLegacyLogin();
    }
  },
  
  // 兼容旧版本的登录方式
  handleLegacyLogin: function() {
    const app = getApp();
    
    // 获取用户信息
    wx.getSetting({
      success: res => {
        if (res.authSetting['scope.userInfo']) {
          // 已经授权，可以直接调用 getUserInfo 获取头像昵称
          wx.getUserInfo({
            success: res => {
              const userInfo = res.userInfo;
              console.log('旧API获取用户信息成功', userInfo);
              
              // 将用户信息保存到全局
              app.globalData.userInfo = userInfo;
              
              // 调用全局登录方法
              app.login((success) => {
                this.setData({
                  loading: false
                });
                
                if (success) {
                  wx.showToast({
                    title: '登录成功',
                    icon: 'success'
                  });
                  
                  setTimeout(() => {
                    const pages = getCurrentPages();
                    if (pages.length > 1) {
                      wx.navigateBack({
                        delta: 1,
                        success: () => {
                          // 通知上一页刷新用户信息
                          const prevPage = pages[pages.length - 2];
                          if (prevPage && prevPage.checkLoginStatus) {
                            prevPage.checkLoginStatus();
                          }
                        }
                      });
                    } else {
                      wx.reLaunch({
                        url: '/pages/index/index'
                      });
                    }
                  }, 1500);
                }
              });
            },
            fail: err => {
              console.error('旧API获取用户信息失败', err);
              this.setData({
                loading: false
              });
            }
          });
        } else {
          // 未授权，显示授权按钮
          this.setData({
            loading: false
          });
          
          wx.showModal({
            title: '提示',
            content: '需要您授权才能使用小程序的完整功能',
            showCancel: false,
            confirmText: '我知道了'
          });
        }
      },
      fail: err => {
        console.error('获取设置失败', err);
        this.setData({
          loading: false
        });
      }
    });
  }
}); 