<template>
  <div class="lubanno7-univer-sheet-demo">
    <h2>Lubanno7UniverSheet 示例</h2>
    <!-- 新增获取变更数据按钮 -->
    <button @click="getRecordChanges" class="getDataBtn">获取变更数据</button>
    <!-- 新增添加记录按钮 -->
    <button @click="addNewRecordItem" class="addDataBtn">添加新记录</button>
    <!-- 新增刷新表格按钮 -->
    <button @click="refreshTableData" class="refreshBtn">刷新表格</button>
    <DemoStandardUsageTable
      ref="demoStandardUsageTableRef"
      :record-all-list="recordAllList"
      @itemNameClick="handleItemNameClick"
      title="记录所有样本值"
    />
    <!-- 显示获取的recordList数据 -->
    <div v-if="Object.keys(recordChanges).length > 0" class="dataDisplay">  
      <h3>变更数据：</h3>
      <pre>{{ JSON.stringify(recordChanges, null, 2) }}</pre>
    </div>

    <!-- Element UI Drawer 组件 -->
    <el-drawer
      title="行数据详情"
      :visible.sync="drawerVisible"
      direction="rtl"
      size="40%"
      :before-close="handleDrawerClose">
      <div class="drawer-content">
        <h3>行数据信息：</h3>
        <pre v-if="currentRow">{{ JSON.stringify(currentRow, null, 2) }}</pre>
        <p v-else>暂无数据</p>
      </div>
    </el-drawer>
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
      recordChanges: {},
      drawerVisible: false,
      currentRow: null
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
    getRecordChanges() {
      // 调用getRecordChanges方法获取变更数据
      const changes = this.$refs.demoStandardUsageTableRef.getRecordChanges();
      // 更新显示数据
      this.recordChanges = changes;
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
    },

    // 新增：刷新表格数据方法
    async refreshTableData() {
      try {
        // 显示加载状态（可选）
        console.log('正在刷新表格数据...');

        this.recordChanges = {};

        // 重新获取数据并更新
        const recordAllList = await getRecordAllList();
        this.recordAllList = recordAllList;

        console.log('表格数据刷新成功');
      } catch (error) {
        console.error('刷新表格数据失败:', error);
      }
    },
    handleItemNameClick(row) {
      console.log('点击行数据', row)
      this.currentRow = row;
      this.drawerVisible = true;
    },

    handleDrawerClose(done) {
      done();
    }
  },
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
}

pre {
  white-space: pre-wrap;
  word-wrap: break-word;
}

.getDataBtn, .addDataBtn, .refreshBtn {
  margin-right: 10px;
  margin-bottom: 16px;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.refreshBtn {
  background-color: #e6a23c;
  color: white;
}

.refreshBtn:hover {
  background-color: #ebb563;
}

/* Drawer 内容样式 */
.drawer-content h3 {
  margin: 0;
  padding: 16px;
}

.drawer-content pre {
  margin: 0;
  padding: 16px;
  background-color: #f5f5f5;
  border-radius: 4px;
  overflow: auto;
}

.drawer-content p {
  margin: 0;
}
</style>