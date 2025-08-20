<template>
  <div class="universheet-demo">
    <h2>Universheet 示例</h2>
    <Universheet
      :columns="columns"
      :data="tableData"
      @updateData="handleDataChange"
    />
  </div>
</template>

<script>
import Universheet from '@/components/universheet.vue';
import { fetchInspectionData } from './api.js';
import { LIST as columnList } from './constant.js'

export default {
  name: 'DemoStandardUsage',
  components: {
    Universheet
  },
  data() {
    return {
      columns: [],
      tableData: [],
      apiData: []
    };
  },
  async mounted() {
    try {
      const apiData = await fetchInspectionData();
      this.generateColumnsAndData(apiData);
      this.apiData = apiData;
    } catch (error) {
      console.error('获取数据失败:', error);
    }
  },
  methods: {
    generateColumnsAndData(apiData) {
      if (!apiData || !Array.isArray(apiData)) {
        console.error('数据格式不正确');
        return;
      }

      // 1. 根据constant.js动态生成基础列
      const baseColumns = columnList.map(item => ({
        prop: item.prop,
        label: item.label,
        width: item.width
      }));

      // 2. 计算最大样本数量
      const maxSamples = Math.max(...apiData.map(item => 
        item.itemValues ? item.itemValues.length : 0
      ));

      // 3. 生成样本嵌套列
      const sampleColumns = [];
      for (let i = 0; i < maxSamples; i++) {
        sampleColumns.push({
          prop: `sample${i + 1}`,
          label: `样本${i + 1}`,
          children: [
            {
              prop: `sample${i + 1}_inspectValue`,
              label: '样本检验值'
            },
            {
              prop: `sample${i + 1}_checkConclusion`,
              label: '样本编码'
            },
            {
              prop: `sample${i + 1}_sampleIdentification`,
              label: '样本标识'
            }
          ]
        });
      }

      // 4. 合并所有列
      this.columns = [...baseColumns, ...sampleColumns];

      // 5. 生成表格数据
      this.tableData = apiData.map(item => {
        const rowData = {};
        
        rowData.id = item.id

        // 基础数据
        columnList.forEach(col => {
          rowData[col.prop] = item[col.prop] || '';
        });

        // 样本数据
        if (item.itemValues && Array.isArray(item.itemValues)) {
          item.itemValues.forEach((sample, index) => {
            rowData[`sample${index + 1}_inspectValue`] = sample.inspectValue || '';
            rowData[`sample${index + 1}_checkConclusion`] = sample.checkConclusion || '';
            rowData[`sample${index + 1}_sampleIdentification`] = sample.sampleIdentification || '';
          });
        }

        return rowData;
      });

      console.log('生成的列配置:', this.columns);
      console.log('生成的表格数据:', this.tableData);
    },

    handleDataChange(params) {
      console.log('数据变更详情:', params);
      
      const { changedRow, changedRowIndex, changedColumn, newVal } = params;
      
      // 1. 局部更新 tableData
      if (this.tableData[changedRowIndex]) {
        this.$set(this.tableData[changedRowIndex], changedColumn, newVal);
      }

      // 2. 同步更新 apiData
      const targetId = this.tableData[changedRowIndex]?.id;
      if (targetId) {
        const apiIndex = this.apiData.findIndex(item => item.id === targetId);
        if (apiIndex !== -1) {
          // 找到对应的api数据项
          const apiItem = this.apiData[apiIndex];
          
          // 判断是哪个样本字段被修改
          const sampleMatch = changedColumn.match(/^sample(\d+)_(.+)$/);
          if (sampleMatch) {
            const sampleIndex = parseInt(sampleMatch[1]) - 1;
            const fieldName = sampleMatch[2];
            
            if (apiItem.itemValues && apiItem.itemValues[sampleIndex]) {
              // 更新对应的样本字段
              this.$set(apiItem.itemValues[sampleIndex], fieldName, newVal);
            }
          } else {
            // 基础字段更新
            this.$set(apiItem, changedColumn, newVal);
          }
        }
      }

      console.log('更新后的apiData:', this.apiData);
      console.log('更新后的tableData:', this.tableData);
    }
  }
};
</script>