<template>
  <div class="universheet-demo">
    <h2>Universheet 示例</h2>
    <Universheet
      :columns="columns"
      :data="tableData"
      :config="config"
      @updateData="handleDataChange"
      @tableInitialized="handleTableInitialized"
      @tableRefreshed="handleTableUpdated"
      @insertRow="handleInsertRow"
      @deleteRow="handleDeleteRow"
    />
  </div>
</template>

<script>
import Universheet from '@/components/universheet.vue';

export default {
  name: 'DemoQuickStart',
  components: {
    Universheet
  },
  data() {
    return {
      // 列配置
      columns: [
        { prop: 'jyz', label: '检验组' },
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
        headerBackgroundColor: '#cfe2f3',
        borderColor: '#000000',
        sheetName: 'Sheet1',
        allowInsertRow: true,
        allowDeleteRow: true
      }
    };
  },
  methods: {
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