/**
 * 权限验证工具类
 * 用于检查用户是否已登录，未登录则引导至登录页
 */

// 检查登录状态，未登录则跳转到登录页
const checkAuth = function(callback) {
  const app = getApp();
  
  if (app.checkLogin()) {
    // 已登录，执行回调
    if (callback && typeof callback === 'function') {
      callback();
    }
    return true;
  } else {
    // 未登录，提示并跳转登录页
    wx.showToast({
      title: '请先登录',
      icon: 'none'
    });
    
    setTimeout(() => {
      wx.navigateTo({
        url: '/pages/login/login'
      });
    }, 1000);
    
    return false;
  }
};

/**
 * 页面权限拦截器
 * 页面中使用：
 * const authInterceptor = require('../../utils/auth.js').authInterceptor;
 * Page(authInterceptor({
 *   // 页面正常配置
 * }));
 */
const authInterceptor = function(pageConfig) {
  // 保存原始onLoad方法
  const originalOnLoad = pageConfig.onLoad;
  
  // 重写onLoad
  pageConfig.onLoad = function(options) {
    const app = getApp();
    
    // 检查登录状态
    if (!app.checkLogin()) {
      // 未登录，跳转到登录页
      wx.navigateTo({
        url: '/pages/login/login'
      });
      return;
    }
    
    // 已登录，调用原始onLoad
    if (originalOnLoad) {
      originalOnLoad.call(this, options);
    }
  };
  
  return pageConfig;
};

module.exports = {
  checkAuth,
  authInterceptor
}; 