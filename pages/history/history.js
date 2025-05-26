const app = getApp();

Page({
  data: {
    weekdays: ['日', '一', '二', '三', '四', '五', '六'],
    days: [],              // 日历天数
    currentYear: 0,        // 当前显示的年
    currentMonth: 0,       // 当前显示的月
    selectedDate: '',      // 选中的日期
    selectedDateDisplay: '',// 显示的日期文本
    hasSummary: false,     // 是否有总结
    summaryContent: ''     // 总结内容
  },

  /**
   * 生命周期函数
   */
  onLoad: function() {
    // 初始化日历
    this.initCalendar();
  },
  
  onShow: function() {
    // 刷新日历和选中日期的内容
    this.refreshCalendar();
    if (this.data.selectedDate) {
      this.loadDateSummary(this.data.selectedDate);
    }
  },
  
  /**
   * 初始化日历
   */
  initCalendar: function() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    
    this.setData({
      currentYear: year,
      currentMonth: month
    });
    
    this.generateCalendarDays(year, month);
    
    // 默认选中今天
    const today = this.getDateString(now);
    this.selectDate({
      currentTarget: {
        dataset: {
          date: today
        }
      }
    });
  },
  
  /**
   * 刷新日历
   */
  refreshCalendar: function() {
    this.generateCalendarDays(this.data.currentYear, this.data.currentMonth);
  },
  
  /**
   * 生成日历天数
   */
  generateCalendarDays: function(year, month) {
    const days = [];
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startWeekday = firstDay.getDay();
    
    // 获取所有有总结的日期
    const dailySummary = app.globalData.dailySummary;
    
    // 添加上个月的日期
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevMonthYear = month === 1 ? year - 1 : year;
    const prevMonthDays = new Date(prevMonthYear, prevMonth, 0).getDate();
    
    for (let i = startWeekday - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      const date = `${prevMonthYear}-${prevMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      days.push({
        day: day,
        month: 'prev',
        date: date,
        hasSummary: !!dailySummary[date],
        isToday: this.isToday(prevMonthYear, prevMonth, day)
      });
    }
    
    // 添加当前月的日期
    for (let i = 1; i <= daysInMonth; i++) {
      const date = `${year}-${month.toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
      days.push({
        day: i,
        month: 'current',
        date: date,
        hasSummary: !!dailySummary[date],
        isToday: this.isToday(year, month, i)
      });
    }
    
    // 添加下个月的日期
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextMonthYear = month === 12 ? year + 1 : year;
    const totalDaysShown = Math.ceil((startWeekday + daysInMonth) / 7) * 7;
    
    for (let i = 1; days.length < totalDaysShown; i++) {
      const date = `${nextMonthYear}-${nextMonth.toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
      days.push({
        day: i,
        month: 'next',
        date: date,
        hasSummary: !!dailySummary[date],
        isToday: this.isToday(nextMonthYear, nextMonth, i)
      });
    }
    
    this.setData({
      days: days
    });
  },
  
  /**
   * 判断是否为今天
   */
  isToday: function(year, month, day) {
    const today = new Date();
    return today.getFullYear() === year && 
           today.getMonth() + 1 === month && 
           today.getDate() === day;
  },
  
  /**
   * 选择日期
   */
  selectDate: function(e) {
    const date = e.currentTarget.dataset.date;
    const displayDate = this.formatDateDisplay(new Date(date));
    
    this.setData({
      selectedDate: date,
      selectedDateDisplay: displayDate
    });
    
    // 加载选择日期的总结
    this.loadDateSummary(date);
  },
  
  /**
   * 加载日期总结
   */
  loadDateSummary: function(dateStr) {
    // 获取日期总结
    const dailySummary = app.globalData.dailySummary;
    const summary = dailySummary[dateStr] || '';
    
    this.setData({
      hasSummary: summary !== '',
      summaryContent: summary
    });
  },
  
  /**
   * 查看详细信息
   */
  viewDetail: function() {
    if (this.data.selectedDate) {
      wx.navigateTo({
        url: `/pages/summary/summary?selectedDate=${this.data.selectedDate}`
      });
    }
  },
  
  /**
   * 切换到上个月
   */
  prevMonth: function() {
    let { currentYear, currentMonth } = this.data;
    
    if (currentMonth === 1) {
      currentMonth = 12;
      currentYear -= 1;
    } else {
      currentMonth -= 1;
    }
    
    this.setData({
      currentYear,
      currentMonth
    });
    
    this.generateCalendarDays(currentYear, currentMonth);
  },
  
  /**
   * 切换到下个月
   */
  nextMonth: function() {
    let { currentYear, currentMonth } = this.data;
    
    if (currentMonth === 12) {
      currentMonth = 1;
      currentYear += 1;
    } else {
      currentMonth += 1;
    }
    
    this.setData({
      currentYear,
      currentMonth
    });
    
    this.generateCalendarDays(currentYear, currentMonth);
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