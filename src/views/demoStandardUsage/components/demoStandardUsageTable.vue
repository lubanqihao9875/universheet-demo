<template>
  <div class="universheet-demo">
    <div>
      {{ title }}（共:<span style="color:#1890FF">{{ listLength }}</span>个）
    </div>
    <Universheet
      ref="universheetRef"
      :columns="columns"
      :data="tableData"
      :config="config"
      @updateData="handleDataChange"
    />
  </div>
</template>

<script>
import Universheet from '@/components/universheet.vue';
import { LIST as columnList } from './constant.js'

export default {
  name: 'DemoStandardUsageTable',
  props: {
    recordAllList: {
      type: Array,
      required: true
    },
    title: {
      type: String,
      default: ''
    }
  },
  components: {
    Universheet
  },
  data() {
    return {
      columns: [],
      tableData: [],
      recordList: [],
      config: {
        allowInsertRow: false
      }
    };
  },
  computed: {
    listLength() {
      return this.recordList.length
    }
  },
  async mounted() {
    try {
      const recordList = this.recordAllList
      this.generateColumnsAndData(recordList);
      this.recordList = recordList;
      const universheet = this.$refs.universheetRef;
      if (universheet) {
        universheet.exposed.methods.refreshTable();
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    }
  },
  // 添加对recordAllList的监听器
  watch: {
    recordAllList: {
      handler: function(newRecordAllList) {
        const recordList = newRecordAllList
        this.generateColumnsAndData(recordList);
        this.recordList = recordList;
        const universheet = this.$refs.universheetRef;
        if (universheet) {
          universheet.exposed.methods.refreshTable();
        }
      },
      deep: true // 深度监听，确保数组内部的变化也能被捕获
    }
  },
  methods: {
    generateColumnsAndData(recordList) {
      if (!recordList || !Array.isArray(recordList)) {
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
      const maxSamples = Math.max(...recordList.map(item => 
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
              prop: `sample${i + 1}_numItemId`,
              label: '样本组id'
            },
            {
              prop: `sample${i + 1}_id`,
              label: '样本id'
            },
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
      this.tableData = recordList.map(item => {
        const rowData = {};
        
        rowData.id = item.id

        // 基础数据
        columnList.forEach(col => {
          rowData[col.prop] = item[col.prop] ?? '';
        });

        // 样本数据
        if (item.itemValues && Array.isArray(item.itemValues)) {
          item.itemValues.forEach((sample, index) => {
            rowData[`sample${index + 1}_numItemId`] = sample.numItemId ?? '';
            rowData[`sample${index + 1}_id`] = sample.id ?? '';
            rowData[`sample${index + 1}_inspectValue`] = sample.inspectValue ?? '';
            rowData[`sample${index + 1}_checkConclusion`] = sample.checkConclusion ?? '';
            rowData[`sample${index + 1}_sampleIdentification`] = sample.sampleIdentification ?? '';
          });
        }

        return rowData;
      });

      console.log('生成的列配置:', this.columns);
      console.log('生成的表格数据:', this.tableData);
    },

    // 提取的公共方法：从tableData更新recordList数据
    updateRecordFromTableData(newTableData) {
      // 创建一个map用于快速查找现有记录
      const recordMap = new Map();
      this.recordList.forEach(record => {
        if (record.id) {
          recordMap.set(record.id, record);
        }
      });
      
      // 用于存储更新后的记录列表
      const updatedRecords = [];
      
      // 处理新的表格数据中的每一行
      newTableData.forEach(rowData => {
        const targetId = rowData.id;
        let recordItem;
        
        // 如果记录已存在，则获取现有记录；否则创建新记录
        if (targetId && recordMap.has(targetId)) {
          recordItem = recordMap.get(targetId);
          recordMap.delete(targetId); // 从map中移除，剩下的就是需要删除的记录
        } else {
          // 创建新记录
          recordItem = { id: rowData.id ?? '', itemValues: [] };
        }
        
        // 更新基础字段
        columnList.forEach(col => {
          this.$set(recordItem, col.prop, rowData[col.prop] ?? '');
        });
        
        // 初始化itemValues数组如果不存在
        if (!recordItem.itemValues) {
          this.$set(recordItem, 'itemValues', []);
        }
        
        // 收集所有样本字段信息
        const sampleFields = {};
        Object.keys(rowData).forEach(key => {
          const sampleMatch = key.match(/^sample(\d+)_(.+)$/);
          if (sampleMatch) {
            const sampleIndex = parseInt(sampleMatch[1]) - 1;
            const fieldName = sampleMatch[2];
            
            if (!sampleFields[sampleIndex]) {
              sampleFields[sampleIndex] = {};
            }
            sampleFields[sampleIndex][fieldName] = rowData[key];
          }
        });
        
        // 更新样本数据，确保与表格数据完全一致
        Object.keys(sampleFields).forEach(sampleIndex => {
          const index = parseInt(sampleIndex);
          const fields = sampleFields[index];
          
          // 确保样本项存在
          if (!recordItem.itemValues[index]) {
            this.$set(recordItem.itemValues, index, {});
          }
          
          // 更新该样本的所有字段
          Object.keys(fields).forEach(fieldName => {
            this.$set(recordItem.itemValues[index], fieldName, fields[fieldName]);
          });
        });
        
        // 添加到更新后的列表中
        updatedRecords.push(recordItem);
      });
      
      // 完全替换recordList，确保与tableData完全同步
      this.recordList = updatedRecords;
      
      console.log('更新后的recordList:', this.recordList);
    },
    
    // 修改后的handleDataChange方法
    handleDataChange(params) {
      console.log('数据变更详情:', params);
      
      const { changedRow, changedRowIndex, changedColumn, newVal } = params;
      
      // 1. 局部更新 tableData
      if (this.tableData[changedRowIndex]) {
        this.$set(this.tableData[changedRowIndex], changedColumn, newVal);
        
        // 2. 由于可能涉及到行的结构变化，直接调用完整的更新方法
        this.updateRecordFromTableData(this.tableData);
      }
      
      console.log('更新后的tableData:', this.tableData);
    },
    
    // 修改后的getCurrentRecordList方法
    getCurrentRecordList() {
      // 通过ref获取表格组件实例
      const universheet = this.$refs.universheetRef;
      if (universheet) {
        // 结束编辑
        universheet.exposed.methods.endEditing();
        // 调用表格组件的方法获取当前数据
        const currentData = universheet.exposed.methods.getCurrentTableData();
        console.log('获取到的表格数据:', currentData);
        this.tableData = currentData;
        
        // 使用公共方法完全同步recordList
        this.updateRecordFromTableData(this.tableData);
        
        console.log('同步后的recordList:', this.recordList);
        return this.recordList;
      } else {
        console.error('未找到表格组件实例');
        return [];
      }
    },
    
    // 添加记录项的方法
    addRecordItem(newRecordItem) {
      if (!newRecordItem) {
        console.error('新增记录项不能为空');
        return;
      }
      
      // 为新记录生成唯一ID（如果没有提供）
      if (!newRecordItem.id) {
        newRecordItem.id = 'record_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      }
      
      // 确保itemValues数组存在
      if (!newRecordItem.itemValues) {
        newRecordItem.itemValues = [];
      }
      
      // console.log(newRecordItem, this.recordList)

      // 1. 先将新记录添加到recordList中
      this.recordList.push(newRecordItem);
      
      // 2. 生成对应的表格行数据
      const rowData = {};
      rowData.id = newRecordItem.id;
      
      // 填充基础字段
      columnList.forEach(col => {
        rowData[col.prop] = newRecordItem[col.prop] ?? '';
      });
      
      // 填充样本字段
      if (newRecordItem.itemValues && Array.isArray(newRecordItem.itemValues)) {
        newRecordItem.itemValues.forEach((sample, index) => {
          rowData[`sample${index + 1}_numItemId`] = sample.numItemId ?? '';
          rowData[`sample${index + 1}_id`] = sample.id ?? '';
          rowData[`sample${index + 1}_inspectValue`] = sample.inspectValue ?? '';
          rowData[`sample${index + 1}_checkConclusion`] = sample.checkConclusion ?? '';
          rowData[`sample${index + 1}_sampleIdentification`] = sample.sampleIdentification ?? '';
        });
      }
      
      // 3. 将行数据添加到tableData中
      this.tableData.push(rowData);
      
      // 4. 如果需要，通知表格组件刷新数据
      // 注意：这里假设Universheet组件会响应tableData的变化而更新UI
      // 如果需要显式触发刷新，可以调用组件的方法
      const universheet = this.$refs.universheetRef;
      if (universheet) {
        universheet.exposed.methods.refreshTable();
      }
      
      console.log('新增记录成功:', newRecordItem);
      console.log('当前recordList:', this.recordList);
      console.log('当前tableData:', this.tableData);
    }
  }
};
</script>