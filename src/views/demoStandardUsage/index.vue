<template>
  <div class="universheet-demo">
    <h2>Universheet 示例</h2>
    <!-- 添加获取数据按钮 -->
    <button @click="fetchAndDisplayRecordList" class="getDataBtn">获取当前表格的recordList数据</button>
    <!-- 新增添加记录按钮 -->
    <button @click="addNewRecordItem" class="addDataBtn">添加新记录</button>
    <DemoStandardUsageTable
      ref="demoStandardUsageTableRef"
      :record-all-list="recordAllList"
      title="记录所有样本值"
    />
    <!-- 显示获取的recordList数据 -->
    <div v-if="displayedRecordList.length > 0" class="dataDisplay">
      <h3>当前表格的recordList数据：</h3>
      <pre>{{ JSON.stringify(displayedRecordList, null, 2) }}</pre>
    </div>
  </div>
</template>

<script>
import { getRecordAllList, addRecordItem } from './api.js';
import DemoStandardUsageTable from './components/demoStandardUsageTable.vue';

export default {
  name: 'demoAdvancedUsage',
  components: {
    DemoStandardUsageTable
  },
  data() {
    return {
      recordAllList: [],
      // 添加用于显示的recordList数据属性
      displayedRecordList: []
    };
  },
  async mounted() {
    try {
      const recordAllList = await getRecordAllList();
      this.recordAllList = recordAllList;
    } catch (error) {
      console.error('获取数据失败:', error);
    }
  },
  methods: {
    // 添加按钮点击事件处理方法
    fetchAndDisplayRecordList() {
      // 调用已有的getCurrentRecordList方法获取数据
      const currentRecordList = this.$refs.demoStandardUsageTableRef.getCurrentRecordList();
      // 更新显示数据
      this.displayedRecordList = currentRecordList;
    },
    
    // 新增方法：添加新记录
    async addNewRecordItem() {
      try {
        // 调用addRecordItem获取新增的项
        const newItem = await addRecordItem();
        console.log('新增记录', newItem);
        // 通过ref调用子组件的addRecordItem方法添加新项
        this.$refs.demoStandardUsageTableRef.addRecordItem(newItem);
      } catch (error) {
        console.error('添加新记录失败:', error);
      }
    }
  }
};
</script>

<style scoped>
/* 添加按钮和数据显示区域的样式 */
.getDataBtn {
  margin-bottom: 16px;
  padding: 8px 16px;
  background-color: #409eff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 10px;
}

.getDataBtn:hover {
  background-color: #66b1ff;
}

/* 新增添加记录按钮样式 */
.addDataBtn {
  margin-bottom: 16px;
  padding: 8px 16px;
  background-color: #67c23a;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.addDataBtn:hover {
  background-color: #85ce61;
}

.dataDisplay {
  margin-top: 20px;
  padding: 16px;
  background-color: #f5f5f5;
  border-radius: 4px;
  overflow: auto;
  max-height: 400px;
}

pre {
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>