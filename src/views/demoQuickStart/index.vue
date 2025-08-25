<template>
  <div class="universheet-demo">
    <h2>Universheet 示例</h2>
    <!-- 添加获取数据按钮 -->
    <button @click="getData" class="getDataBtn">获取当前表格数据</button>
    <Universheet
      ref="universheetRef"
      :columns="columns"
      :data="tableData"
      :config="config"
      @updateData="handleDataChange"
      @tableInitialized="handleTableInitialized"
      @tableRefreshed="handleTableUpdated"
      @insertRow="handleInsertRow"
      @deleteRow="handleDeleteRow"
    />
    <!-- 显示获取的数据 -->
    <div v-if="displayData.length > 0" class="dataDisplay">
      <h3>当前表格数据：</h3>
      <pre>{{ JSON.stringify(displayData, null, 2) }}</pre>
    </div>
  </div>
</template>

<script>
import Universheet from '@/components/universheet/index.vue';

export default {
  name: 'demoQuickStart',
  components: {
    Universheet
  },
  data() {
    return {
      // 列配置
      columns: [
        { prop: 'jyz', label: '检验组', editor: { type: 'readonly' } },
        { prop: 'jyxm', label: '检验项目' },
        { prop: 'jybz', label: '检验标准' },
        { prop: 'fxff', label: '分析方法' },
        { prop: 'pd', label: '判定' },
        {
          prop: 'yb1',
          label: '样本1',
          children: [  // 嵌套表头
            { prop: 'yb1#jyz', label: '样本检验值' },
            { prop: 'yb1#ybbb', label: '样本编码' },
            { prop: 'yb1#jbbs', label: '样本标识' },
          ]
        },
        {
          prop: 'yb2',
          label: '样本2',
          children: [  // 嵌套表头
            { prop: 'yb2#jyz', label: '样本检验值' },
            { prop: 'yb2#ybbb', label: '样本编码' },
            { prop: 'yb2#jbbs', label: '样本标识' },
          ]
        },
        {
          prop: 'yb3',
          label: '样本3',
        },
        {
          prop: 'yb4',
          label: '样本4',
        },
        {
          prop: 'yb5',
          label: '样本5',
          children: [  // 嵌套表头
            { prop: 'yb5#jyz', label: '样本检验值' },
            { prop: 'yb5#ybbb', label: '样本编码' },
            { prop: 'yb5#jbbs', label: '样本标识' },
          ]
        },
        {
          prop: 'yb6',
          label: '样本6',
        },
        {
          prop: 'yb7',
          label: '样本7',
        }
      ],
      // 表格数据
      tableData: [
        {
          jyz: '尺寸检验',
          jyxm: '尺寸序号1',
          jybz: '23.9+0.05-1',
          fxff: '定量分析',
          pd: '合格',
          'yb1#jyz': 23.94,
          'yb1#ybbb': 123,
          'yb1#jbbs': 123,
          'yb2#jyz': 23.94,
          'yb2#ybbb': 123,
          'yb2#jbbs': 123,
          yb3: 23.94,
          yb4: 22,
          'yb5#jyz': 23.94,
          'yb5#ybbb': 123,
          'yb5#jbbs': 123,
          yb6: 22,
          yb7: 23.94
        },
        {
          jyz: '尺寸检验',
          jyxm: '尺寸序号2',
          jybz: '23.9+0.05-1',
          fxff: '定量分析',
          pd: '合格',
          'yb1#jyz': 23.94,
          'yb1#ybbb': 123,
          'yb1#jbbs': 123,
          'yb2#jyz': 23.94,
          'yb2#ybbb': 123,
          'yb2#jbbs': 123,
          yb3: 23.94,
          yb4: 22,
          'yb5#jyz': 23.94,
          'yb5#ybbb': 123,
          'yb5#jbbs': 123,
          yb6: 22,
          yb7: 23.94
        },
        {
          jyz: '尺寸检验',
          jyxm: '尺寸序号3',
          jybz: '23.9+0.05-1',
          fxff: '定量分析',
          pd: '合格',
          'yb1#jyz': 23.94,
          'yb1#ybbb': 123,
          'yb1#jbbs': 123,
          'yb2#jyz': 23.94,
          'yb2#ybbb': 123,
          'yb2#jbbs': 123,
          yb3: 23.94,
          yb4: 22,
          'yb5#jyz': 23.94,
          'yb5#ybbb': 123,
          'yb5#jbbs': 123,
          yb6: 22,
          yb7: 23.94
        }
      ],
      config: {
        defaultColumnWidth: 80,
        headerStyle: {
          backgroundColor: '#cfe2f3',
          fontWeight: 'bold',
          borderColor: '#ccc'
        },
        readonlyCellStyle: {
          backgroundColor: '#eee',
          fontWeight: 'bold',
          borderColor: '#ccc'
        },
        sheetName: 'Sheet1',
        allowInsertRow: true,
        allowDeleteRow: true
      },
      // 添加用于显示的数据属性
      displayData: []
    };
  },
  methods: {
    // 添加获取数据方法
    getData() {
      // 通过ref获取表格组件实例
      const universheet = this.$refs.universheetRef;
      if (universheet) {
        // 结束编辑
        universheet.exposed.methods.endEditing();
        // 调用表格组件的方法获取当前数据
        const currentData = universheet.exposed.methods.getCurrentTableData();
        // 更新显示数据
        this.displayData = currentData || [];
        console.log('获取到的表格数据:', currentData);
      } else {
        console.error('未找到表格组件实例');
      }
    },
    handleDataChange(params) {
      console.log('数据变更详情:', params);
      // 更新父组件数据
      // this.tableData = params.currentTableData;
    },
    handleTableInitialized({attributes: {univerAPIInstance}}) {
      console.log('数据初始化完成');
      // 这里添加数据初始化完成后的逻辑
      // univerAPIInstance.getActiveWorkbook().getActiveSheet().getRange('A1').setValue('hello world');
    },
    handleTableUpdated() {
      console.log('数据已更新');
      // 这里添加数据更新后的逻辑
    },
    handleInsertRow(params) {
      console.log('插入行详情:', params);
      // 可以根据需要更新父组件数据
      // this.tableData = params.currentTableData;
      // 或执行其他插入行后的操作
    },
    handleDeleteRow(params) {
      console.log('删除行详情:', params);
      // 可以根据需要更新父组件数据
      // this.tableData = params.currentTableData;
      // 或执行其他删除行后的操作
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
}

.getDataBtn:hover {
  background-color: #66b1ff;
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
</style>