const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({
  env: 'cloud1-3gi5qnd74be7e880'
})

const db = cloud.database()

// 测试数据
const testData = {
  conversations: [
    {
      title: '测试会话1',
      updateTime: new Date().getTime(),
      messages: [
        {
          role: 'user',
          content: '今天我要完成项目文档的编写'
        },
        {
          role: 'assistant',
          content: '好的，需要我帮你规划一下文档结构吗？'
        },
        {
          role: 'user',
          content: '是的，请帮我规划一下'
        },
        {
          role: 'assistant',
          content: '建议包含以下部分：1. 项目概述 2. 功能模块 3. 技术架构 4. 部署说明'
        }
      ]
    },
    {
      title: '测试会话2',
      updateTime: new Date().getTime() + 3600000, // 1小时后
      messages: [
        {
          role: 'user',
          content: '我还需要准备明天的会议'
        },
        {
          role: 'assistant',
          content: '好的，需要我帮你准备会议议程吗？'
        },
        {
          role: 'user',
          content: '是的，请帮我准备一下'
        },
        {
          role: 'assistant',
          content: '建议包含以下议程：1. 项目进度汇报 2. 问题讨论 3. 下一步计划'
        }
      ]
    }
  ]
}

// 测试函数
async function runTest() {
  try {
    console.log('=== 开始测试 ===')

    // 1. 插入测试数据
    console.log('\n1. 插入测试数据')
    for (const conv of testData.conversations) {
      const result = await db.collection('conversations').add({
        data: conv
      })
      console.log(`插入会话成功，ID: ${result._id}`)
    }
    console.log('测试数据插入完成')

    // 2. 调用云函数
    console.log('\n2. 调用云函数')
    const result = await cloud.callFunction({
      name: 'generateDailySummary'
    })
    console.log('云函数调用结果:', JSON.stringify(result, null, 2))

    // 3. 验证结果
    console.log('\n3. 验证结果')
    const summaries = await db.collection('summaries')
      .where({
        date: new Date().toISOString().split('T')[0]
      })
      .get()
    
    console.log('查询到的总结:', JSON.stringify(summaries.data, null, 2))

    // 4. 清理测试数据
    console.log('\n4. 清理测试数据')
    for (const conv of testData.conversations) {
      const deleteResult = await db.collection('conversations')
        .where({
          title: conv.title
        })
        .remove()
      console.log(`删除会话 ${conv.title} 结果:`, deleteResult)
    }
    
    const deleteSummaryResult = await db.collection('summaries')
      .where({
        date: new Date().toISOString().split('T')[0]
      })
      .remove()
    console.log('删除总结结果:', deleteSummaryResult)

    console.log('\n=== 测试完成 ===')
    return {
      success: true,
      message: '测试完成',
      result: result,
      summaries: summaries.data
    }
  } catch (error) {
    console.error('测试失败:', error)
    return {
      success: false,
      message: error.message
    }
  }
}

// 运行测试
console.log('开始执行测试...')
runTest().then(result => {
  console.log('\n最终测试结果:', JSON.stringify(result, null, 2))
}).catch(error => {
  console.error('测试执行出错:', error)
}) 