<template>
  <div class="universheet-demo">
    <div>
      {{ title }}（共:<span style="color:#1890FF">{{ tableLength }}</span>个）
    </div>
    <Universheet 
      v-if="isComponentActive"
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
import { deepEqual, findDifferences } from '@/utils/deepCompare.js'

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
      originalTableData: [],
      originalRecordList: [],
      isComponentActive: true,
      config: {
        allowInsertRow: false
      }
    };
  },
  computed: {
    tableLength() {
      return this.tableData.length
    }
  },
  watch: {
    recordAllList: {
      handler: function (newRecordAllList) {
        const recordList = JSON.parse(JSON.stringify(newRecordAllList));
        this.generateColumnsAndData(recordList);
        this.recordList = recordList;
        this.originalTableData = JSON.parse(JSON.stringify(this.tableData));
        this.originalRecordList = JSON.parse(JSON.stringify(this.recordList));
        const universheet = this.$refs.universheetRef;
        if (universheet) {
          universheet.exposed.methods.refreshTable(true);
        }
      },
      deep: true
    }
  },
  async mounted() {
    try {
      const recordList = JSON.parse(JSON.stringify(this.recordAllList))
      this.generateColumnsAndData(recordList);
      this.recordList = recordList;
      // 初始化时深拷贝保存副本
      this.originalTableData = JSON.parse(JSON.stringify(this.tableData));
      this.originalRecordList = JSON.parse(JSON.stringify(this.recordList));
      const universheet = this.$refs.universheetRef;
      if (universheet) {
        universheet.exposed.methods.refreshTable();
      }
    } catch (error) {
      console.error('获取数据失败:', error);
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
            { prop: `sample${i + 1}_numItemId`, label: '样本组id' },
            { prop: `sample${i + 1}_id`, label: '样本id' },
            { prop: `sample${i + 1}_inspectValue`, label: '样本检验值' },
            { prop: `sample${i + 1}_checkConclusion`, label: '样本编码' },
            { prop: `sample${i + 1}_sampleIdentification`, label: '样本标识' }
          ]
        });
      }

      // 4. 合并所有列
      this.columns = [...baseColumns, ...sampleColumns];

      // 5. 生成表格数据 - 使用公共方法
      this.tableData = recordList.map(record => this.convertRecordToTableRow(record));

      console.log('生成的列配置:', this.columns);
      console.log('生成的表格数据:', this.tableData);
    },

    // 提取的公共方法：将记录数据转换为表格行数据
    convertRecordToTableRow(record) {
      const rowData = {};
      rowData.id = record.id;

      // 填充基础字段
      columnList.forEach(col => {
        rowData[col.prop] = record[col.prop] ?? '';
      });

      // 填充样本字段
      if (record.itemValues && Array.isArray(record.itemValues)) {
        record.itemValues.forEach((sample, index) => {
          rowData[`sample${index + 1}_numItemId`] = sample.numItemId ?? '';
          rowData[`sample${index + 1}_id`] = sample.id ?? '';
          rowData[`sample${index + 1}_inspectValue`] = sample.inspectValue ?? '';
          rowData[`sample${index + 1}_checkConclusion`] = sample.checkConclusion ?? '';
          rowData[`sample${index + 1}_sampleIdentification`] = sample.sampleIdentification ?? '';
        });
      }

      return rowData;
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

    // 获取记录变更
    getRecordChanges() {
      const universheet = this.$refs.universheetRef;
      if (universheet) {
        universheet.exposed.methods.endEditing();
        const currentData = universheet.exposed.methods.getCurrentTableData();
        this.tableData = currentData;
        this.updateRecordFromTableData(this.tableData);

        const result = {
          add: { originRecordList: [], currentRecordList: [] },
          change: { originRecordList: [], currentRecordList: [] },
          delete: { originRecordList: [], currentRecordList: [] },
          originRecordList: this.originalRecordList || [],
          currentRecordList: this.recordList
        };

        const originRecordMap = new Map();
        (this.originalRecordList || []).forEach(record => {
          if (record && record.id) originRecordMap.set(record.id, record);
        });

        this.recordList.forEach(currentRecord => {
          if (!currentRecord || !currentRecord.id) return;

          const originRecord = originRecordMap.get(currentRecord.id);
          if (!originRecord) {
            result.add.originRecordList.push(null);
            result.add.currentRecordList.push(currentRecord);
          } else {
            if (!deepEqual(currentRecord, originRecord)) {
              const differences = findDifferences(originRecord, currentRecord);
              console.log(`记录 ${currentRecord.id} 发生变化，差异如下:`);
              differences.forEach(diff => {
                console.log(`- 属性: ${diff.path}`);
                console.log(`  原始值: ${JSON.stringify(diff.original)}`);
                console.log(`  当前值: ${JSON.stringify(diff.current)}`);
              });

              result.change.originRecordList.push(originRecord);
              result.change.currentRecordList.push(currentRecord);
            }
            originRecordMap.delete(currentRecord.id);
          }
        });

        originRecordMap.forEach(originRecord => {
          result.delete.originRecordList.push(originRecord);
          result.delete.currentRecordList.push(null);
        });

        return result;
      } else {
        console.error('未找到表格组件实例');
        return {
          add: { originRecordList: [], currentRecordList: [] },
          change: { originRecordList: [], currentRecordList: [] },
          delete: { originRecordList: [], currentRecordList: [] },
          originRecordList: [],
          currentRecordList: []
        };
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

      // 1. 先将新记录添加到recordList中
      this.recordList.push(newRecordItem);

      // 2. 生成对应的表格行数据 - 使用公共方法
      const rowData = this.convertRecordToTableRow(newRecordItem);

      // 3. 将行数据添加到tableData中
      this.tableData.push(rowData);

      // 4. 如果需要，通知表格组件刷新数据
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