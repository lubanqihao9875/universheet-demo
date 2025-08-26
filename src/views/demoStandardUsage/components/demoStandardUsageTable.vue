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
import Universheet from '@/components/universheet/index.vue';
import { LIST as columnList } from './constant.js';
import { deepEqual } from '@/utils/deepCompare.js';

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
      return this.tableData.length;
    },
    maxSamples() {
      return this.recordList.length 
        ? Math.max(...this.recordList.map(item => item.itemValues?.length || 0)) 
        : 0;
    }
  },
  watch: {
    recordAllList: {
      handler: 'handleRecordAllListChange', // 提取为独立方法
      deep: true
    }
  },
  async mounted() {
    try {
      await this.initData(this.recordAllList);
    } catch (error) {
      console.error('初始化数据失败:', error);
    }
  },
  methods: {
    deepClone(obj) {
      return JSON.parse(JSON.stringify(obj));
    },

    // 初始化表格数据（通用入口）
    async initData(records) {
      const recordList = this.deepClone(records);
      this.generateColumnsAndData(recordList);
      this.recordList = recordList;
      // 保存原始数据副本
      this.originalTableData = this.deepClone(this.tableData);
      this.originalRecordList = this.deepClone(this.recordList);
      // 刷新表格
      await this.refreshUniversheet(false);
    },

    // 处理recordAllList变化
    handleRecordAllListChange(newRecordAllList) {
      const recordList = this.deepClone(newRecordAllList);
      this.generateColumnsAndData(recordList);
      this.recordList = recordList;
      this.originalTableData = this.deepClone(this.tableData);
      this.originalRecordList = this.deepClone(this.recordList);
      this.refreshUniversheet(true);
    },

    // 生成列配置和表格数据
    generateColumnsAndData(recordList) {
      if (!recordList || !Array.isArray(recordList)) {
        console.error('数据格式不正确');
        return;
      }

      const baseColumns = this.generateBaseColumns();
      const sampleColumns = this.generateSampleColumns();
      this.columns = [...baseColumns, ...sampleColumns];
      this.tableData = recordList.map(record => this.convertRecordToTableRow(record));
    },

    // 生成基础列配置
    generateBaseColumns() {
      return columnList.map(item => ({
        prop: item.prop,
        label: item.label,
        width: item.width,
        editor: item.editor
      }));
    },

    // 生成样本嵌套列配置
    generateSampleColumns() {
      const sampleColumns = [];
      for (let i = 0; i < this.maxSamples; i++) {
        sampleColumns.push({
          prop: `sample${i + 1}`,
          label: `样本${i + 1}`,
          children: [
            { prop: `sample${i + 1}_numItemId`, label: '样本组id', editor: { type: 'readonly' } },
            { prop: `sample${i + 1}_id`, label: '样本id', editor: { type: 'readonly' } },
            { prop: `sample${i + 1}_inspectValue`, label: '样本检验值' },
            { prop: `sample${i + 1}_checkConclusion`, label: '样本编码' },
            { prop: `sample${i + 1}_sampleIdentification`, label: '样本标识' }
          ]
        });
      }
      return sampleColumns;
    },

    // 将记录数据转换为表格行数据
    convertRecordToTableRow(record) {
      const rowData = { id: record.id };

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

    // 从tableData更新recordList数据
    updateRecordFromTableData(newTableData) {
      const recordMap = new Map();
      this.recordList.forEach(record => record.id && recordMap.set(record.id, record));

      const updatedRecords = newTableData.map(rowData => {
        const targetId = rowData.id;
        let recordItem = targetId && recordMap.get(targetId) 
          ? recordMap.get(targetId) 
          : { id: rowData.id ?? '', itemValues: [] };

        // 更新基础字段
        columnList.forEach(col => {
          this.$set(recordItem, col.prop, rowData[col.prop] ?? '');
        });

        // 初始化itemValues
        if (!recordItem.itemValues) this.$set(recordItem, 'itemValues', []);

        // 收集样本字段
        const sampleFields = this.extractSampleFields(rowData);
        
        // 更新样本数据
        Object.keys(sampleFields).forEach(sampleIndex => {
          const index = parseInt(sampleIndex);
          const fields = sampleFields[index];
          
          if (!recordItem.itemValues[index]) {
            this.$set(recordItem.itemValues, index, {});
          }
          
          Object.keys(fields).forEach(fieldName => {
            this.$set(recordItem.itemValues[index], fieldName, fields[fieldName]);
          });
        });

        recordMap.delete(targetId);
        return recordItem;
      });

      this.recordList = updatedRecords;
    },

    // 提取表格行数据中的样本字段
    extractSampleFields(rowData) {
      const sampleFields = {};
      Object.keys(rowData).forEach(key => {
        const sampleMatch = key.match(/^sample(\d+)_(.+)$/);
        if (sampleMatch) {
          const sampleIndex = parseInt(sampleMatch[1]) - 1;
          const fieldName = sampleMatch[2];
          
          if (!sampleFields[sampleIndex]) sampleFields[sampleIndex] = {};
          sampleFields[sampleIndex][fieldName] = rowData[key];
        }
      });
      return sampleFields;
    },

    // 处理表格数据变更
    handleDataChange(params) {
      const { changedRowIndex, changedColumn, newVal } = params;
      
      if (this.tableData[changedRowIndex]) {
        // 局部更新表格数据
        this.$set(this.tableData[changedRowIndex], changedColumn, newVal);
        // 更新记录列表
        this.updateRecordFromTableData(this.tableData);
      }
    },

    // 刷新表格组件
    async refreshUniversheet(recreate = false) {
      const universheet = this.$refs.universheetRef;
      if (universheet?.exposed?.methods?.refreshTable) {
        await universheet.exposed.methods.refreshTable(recreate);
      }
    },

    // 添加新记录
    addRecordItem(newRecordItem) {
      if (!newRecordItem) {
        console.error('新增记录项不能为空');
        return;
      }

      // 生成唯一ID
      if (!newRecordItem.id) {
        newRecordItem.id = `record_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      }

      // 确保itemValues存在
      if (!newRecordItem.itemValues) newRecordItem.itemValues = [];

      // 更新记录列表和表格数据
      this.recordList.push(newRecordItem);
      this.tableData.push(this.convertRecordToTableRow(newRecordItem));
      
      // 刷新表格
      this.refreshUniversheet();
    },

    // 获取记录变更详情
    getRecordChanges() {
      const universheet = this.$refs.universheetRef;
      if (!universheet) {
        console.error('未找到表格组件实例');
        return this.createEmptyChangeResult();
      }

      // 结束编辑并同步最新数据
      universheet.exposed.methods.endEditing();
      this.tableData = universheet.exposed.methods.getCurrentTableData();
      this.updateRecordFromTableData(this.tableData);

      // 构建变更结果
      return this.calculateChanges();
    },

    // 计算数据变更（新增、修改、删除）
    calculateChanges() {
      const result = this.createEmptyChangeResult();
      const originRecordMap = new Map();
      
      (this.originalRecordList || []).forEach(record => {
        if (record?.id) originRecordMap.set(record.id, record);
      });

      // 检查新增和修改
      this.recordList.forEach(currentRecord => {
        if (!currentRecord?.id) return;
        
        const originRecord = originRecordMap.get(currentRecord.id);
        if (!originRecord) {
          result.add.originRecordList.push(null);
          result.add.currentRecordList.push(currentRecord);
        } else if (!deepEqual(currentRecord, originRecord)) {
          result.change.originRecordList.push(originRecord);
          result.change.currentRecordList.push(currentRecord);
        }
        originRecordMap.delete(currentRecord.id);
      });

      // 检查删除
      originRecordMap.forEach(originRecord => {
        result.delete.originRecordList.push(originRecord);
        result.delete.currentRecordList.push(null);
      });

      return result;
    },

    // 创建空的变更结果对象
    createEmptyChangeResult() {
      return {
        add: { originRecordList: [], currentRecordList: [] },
        change: { originRecordList: [], currentRecordList: [] },
        delete: { originRecordList: [], currentRecordList: [] },
        originRecordList: this.originalRecordList || [],
        currentRecordList: this.recordList
      };
    }
  }
};
</script>