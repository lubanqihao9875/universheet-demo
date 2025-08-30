<template>
  <div class="luban7-univer-sheet-demo">
    <div>
      {{ title }}（共:<span style="color:#1890FF">{{ tableLength }}</span>个）
    </div>
    <Lubanno7UniverSheet 
      v-if="isComponentActive"
      ref="lubanno7UniverSheetRef"
      :columns="columns"
      :data="tableData"
      :config="config"
      @tableInitialized="handleTableInitialized"
      @tableDataRefreshed="handleTableDataRefreshed"
      @updateData="handleDataChange"
      @cellClicked="handleCellClicked"
    />
  </div>
</template>

<script>
import Lubanno7UniverSheet from '@/components/lubanno7UniverSheet/index.vue';
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
    Lubanno7UniverSheet
  },
  data() {
    return {
      columns: [],
      tableData: [],
      recordList: [],
      originalTableData: [],
      originalRecordList: [],
      isComponentActive: true,
      redColor: '#FF4D4F',
      blackColor: '#000000',
      config: {
        allowInsertRow: false,
        headerStyle: {
          backgroundColor: '#f2f5fc',
          fontWeight: 'normal',
          borderColor: '#ccc'
        },
        readonlyCellStyle: {
          backgroundColor: '#f0f0f0',
          fontWeight: 'normal',
          borderColor: '#ccc'
        },
      }
    };
  },
  computed: {
    tableLength() {
      return this.tableData.length;
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
      this.recordList = recordList;
      this.originalTableData = this.deepClone(this.tableData);
      this.originalRecordList = this.deepClone(this.recordList);
      this.generateColumnsAndData(recordList);
      await this.refreshlubanno7UniverSheetData();
    },

    // 处理recordAllList变化
    handleRecordAllListChange(newRecordAllList) {
      const recordList = this.deepClone(newRecordAllList);
      this.recordList = recordList;
      this.originalTableData = this.deepClone(this.tableData);
      this.originalRecordList = this.deepClone(this.recordList);
      this.generateColumnsAndData(recordList);
      this.recreatelubanno7UniverSheet();
    },

    getMaxSamples() {
      return this.recordList.length 
        ? Math.max(...this.recordList.map(item => item.itemValues?.length || 0)) 
        : 0;
    },

    handleTableInitialized() {
      this.markFailed()
    },

    handleTableDataRefreshed() {
      this.markFailed()
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
      const maxSamples = this.getMaxSamples();
      for (let i = 0; i < maxSamples; i++) {
        sampleColumns.push({
          prop: `sample${i + 1}`,
          label: `样本${i + 1}`,
          children: [
            { prop: `sample${i + 1}_numItemId`, label: '样本组id', editor: { type: 'readonly' } },
            { prop: `sample${i + 1}_id`, label: '样本id', editor: { type: 'readonly' } },
            { prop: `sample${i + 1}_inspectValue`, label: '样本检验值', editor: ({row}) => {
              if (!row[`sample${i + 1}_id`] && row[`sample${i + 1}_id`] !== 0) {
                return { type: 'readonly' }
              }
            } },
            { prop: `sample${i + 1}_checkConclusion`, label: '样本编码', editor: ({row}) => {
              if (!row[`sample${i + 1}_id`] && row[`sample${i + 1}_id`] !== 0) {
                return { type: 'readonly' }
              }
            } },
            { prop: `sample${i + 1}_sampleIdentification`, label: '样本标识', editor: ({row}) => {
              if (!row[`sample${i + 1}_id`] && row[`sample${i + 1}_id`] !== 0) {
                return { type: 'readonly' }
              }
            } }
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

    // 辅助方法：将单个行数据转换为记录数据
    convertSingleRowToRecord(rowData, existingRecord = null) {
      // 如果提供了现有记录，则创建副本；否则创建新记录
      let recordItem = existingRecord 
        ? { ...existingRecord } // 创建副本以避免修改原始记录
        : { id: rowData.id ?? '', itemValues: [] };

      // 更新基础字段
      columnList.forEach(col => {
        recordItem[col.prop] = rowData[col.prop] ?? '';
      });

      // 初始化itemValues
      if (!recordItem.itemValues) recordItem.itemValues = [];

      // 收集样本字段
      const sampleFields = this.extractSampleFields(rowData);
      
      // 更新样本数据
      Object.keys(sampleFields).forEach(sampleIndex => {
        const index = parseInt(sampleIndex);
        const fields = sampleFields[index];
        
        if (!recordItem.itemValues[index]) {
          recordItem.itemValues[index] = {};
        }
        
        Object.keys(fields).forEach(fieldName => {
          recordItem.itemValues[index][fieldName] = fields[fieldName];
        });
      });

      return recordItem;
    },
    
    // 将单个表格行数据转换为记录数据（供外部调用）
    convertRowToRecord(rowData) {
      // 从现有记录中查找匹配的record
      const recordMap = new Map();
      this.recordList.forEach(record => record.id && recordMap.set(record.id, record));
      
      const targetId = rowData.id;
      const existingRecord = targetId && recordMap.get(targetId);
      
      return this.convertSingleRowToRecord(rowData, existingRecord);
    },
    
    // 从tableData更新recordList数据
    updateRecordFromTableData(newTableData) {
      const recordMap = new Map();
      this.recordList.forEach(record => record.id && recordMap.set(record.id, record));

      const updatedRecords = newTableData.map(rowData => {
        const targetId = rowData.id;
        const existingRecord = targetId && recordMap.get(targetId);
        
        // 使用辅助方法转换单行数据
        return this.convertSingleRowToRecord(rowData, existingRecord);
      });

      this.recordList = updatedRecords;
    },
    
    // 处理单元格点击事件
    handleCellClicked({clickedColumn, clickedRow}) {
      if(clickedColumn === 'itemName') {
        // 将clickedRow转换为record后再传递
        const record = this.convertRowToRecord(clickedRow);
        this.$emit('itemNameClick', record);
      }
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
       if(changedColumn === 'checkResult' || changedColumn.indexOf('inspectValue') !== -1){
          // 只对当前修改的行应用样式标记
          this.markFailedForRow(changedRowIndex);
        }
      }
    },

    // 标记所有不合格项（用于初始化和刷新表格）
    markFailed() {
      this.tableData.forEach((row, rowIndex) => {
        this.markFailedForRow(rowIndex);
      });
    },

    // 标记指定行的不合格项（用于数据变更时）
    markFailedForRow(rowIndex) {
      const lubanno7UniverSheet = this.$refs.lubanno7UniverSheetRef;
      if (!lubanno7UniverSheet?.exposed?.methods?.setCellFontColor) return;
      
      const row = this.tableData[rowIndex];
      if (!row) return;
      
      const { itemQualified, unqualifiedSamples } = this.isQualified(row);

      // 重置样式为黑色
      lubanno7UniverSheet.exposed.methods.setCellFontColor(rowIndex, 'id', this.blackColor);
      lubanno7UniverSheet.exposed.methods.setCellFontColor(rowIndex, 'itemGroupName', this.blackColor);
      lubanno7UniverSheet.exposed.methods.setCellFontColor(rowIndex, 'itemId', this.blackColor);
      lubanno7UniverSheet.exposed.methods.setCellFontColor(rowIndex, 'itemName', this.blackColor);
      lubanno7UniverSheet.exposed.methods.setCellFontColor(rowIndex, 'inspectStandard', this.blackColor);
      
      const maxSamples = this.getMaxSamples();

      // 重置所有样本检测值样式
      for (let i = 0; i < maxSamples; i++) {
        const sampleValueKey = `sample${i + 1}_inspectValue`;
        if (row[sampleValueKey]) {
          lubanno7UniverSheet.exposed.methods.setCellFontColor(rowIndex, sampleValueKey, this.blackColor);
        }
      }

      // 根据合格情况设置红色样式
      if (!itemQualified) {
        // 标记整行为不合格
        lubanno7UniverSheet.exposed.methods.setCellFontColor(rowIndex, 'id', this.redColor);
        lubanno7UniverSheet.exposed.methods.setCellFontColor(rowIndex, 'itemGroupName', this.redColor);
        lubanno7UniverSheet.exposed.methods.setCellFontColor(rowIndex, 'itemId', this.redColor);
        lubanno7UniverSheet.exposed.methods.setCellFontColor(rowIndex, 'itemName', this.redColor);
        lubanno7UniverSheet.exposed.methods.setCellFontColor(rowIndex, 'inspectStandard', this.redColor);
        
        for (let i = 0; i < maxSamples; i++) {
          const sampleValueKey = `sample${i + 1}_inspectValue`;
          if (row[sampleValueKey]) {
            lubanno7UniverSheet.exposed.methods.setCellFontColor(rowIndex, sampleValueKey, this.redColor);
          }
        }
      } else if (unqualifiedSamples.length > 0) {
        // 只标记不合格的样本
        unqualifiedSamples.forEach((sampleIndex) => {
          const sampleValueKey = `sample${sampleIndex}_inspectValue`;
          if (row[sampleValueKey]) {
            lubanno7UniverSheet.exposed.methods.setCellFontColor(rowIndex, sampleValueKey, this.redColor);
          }
        });
      }
    },

    // 判定是否合格
    isQualified(row) {
      const unqualifiedSamples = [];
      
      // 获取最大样本数
      const maxSamples = this.getMaxSamples();
      
      // 遍历所有样本进行判断
      for (let sampleIndex = 1; sampleIndex <= maxSamples; sampleIndex++) {
        const inspectValueKey = `sample${sampleIndex}_inspectValue`;
        const inspectValue = row[inspectValueKey];
        
        // 检查样本检验值是否有值（''视为没有值，但0视为有值）
        if (inspectValue !== undefined && inspectValue !== null && inspectValue !== '') {
          // 检查是否是非空字符串（非空字符串肯定不合格）
          if (typeof inspectValue === 'string' && inspectValue.trim() !== '') {
            unqualifiedSamples.push(sampleIndex);
          } else {
            // 尝试将值转为数字进行比较
            const numValue = Number(inspectValue);
            
            // 检查下限
            if (row.downLimitValue !== undefined && row.downLimitValue !== null && row.downLimitValue !== '') {
              const downLimit = Number(row.downLimitValue);
              if (!isNaN(numValue) && !isNaN(downLimit) && numValue < downLimit) {
                unqualifiedSamples.push(sampleIndex);
                continue; // 如果已经判定不合格，就不需要再检查上限
              }
            }
            
            // 检查上限
            if (row.upperLimitValue !== undefined && row.upperLimitValue !== null && row.upperLimitValue !== '') {
              const upperLimit = Number(row.upperLimitValue);
              if (!isNaN(numValue) && !isNaN(upperLimit) && numValue > upperLimit) {
                unqualifiedSamples.push(sampleIndex);
              }
            }
          }
        }
      }
      
      // 判定整个item是否合格
      const itemQualified = row.checkResult !== '不合格';
      
      return {
        // item是否合格
        itemQualified,
        // samples不合格数组
        unqualifiedSamples
      };
    },

    // 刷新表格组件
    async refreshlubanno7UniverSheetData() {
      const lubanno7UniverSheet = this.$refs.lubanno7UniverSheetRef;
      if (lubanno7UniverSheet?.exposed?.methods?.refreshTableData) {
        await lubanno7UniverSheet.exposed.methods.refreshTableData();
      }
    },

    // 刷新表格组件
    async recreatelubanno7UniverSheet() {
      const lubanno7UniverSheet = this.$refs.lubanno7UniverSheetRef;
      if (lubanno7UniverSheet?.exposed?.methods?.recreateTable) {
        await lubanno7UniverSheet.exposed.methods.recreateTable();
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

      const oldMaxSamples = this.getMaxSamples();

      // 更新记录列表和表格数据
      this.recordList.push(newRecordItem);
      this.tableData.push(this.convertRecordToTableRow(newRecordItem));

      const currentMaxSamples = this.getMaxSamples();

      if(currentMaxSamples > oldMaxSamples) {
        const baseColumns = this.generateBaseColumns();
        const sampleColumns = this.generateSampleColumns();
        this.columns = [...baseColumns, ...sampleColumns];
        this.recreatelubanno7UniverSheet();
        return
      }
      
      // 刷新表格
      this.refreshlubanno7UniverSheetData();
    },

    // 将单个表格行数据转换为记录数据
    convertRowToRecord(rowData) {
      // 从现有记录中查找匹配的record
      const recordMap = new Map();
      this.recordList.forEach(record => record.id && recordMap.set(record.id, record));
      
      const targetId = rowData.id;
      let recordItem = targetId && recordMap.get(targetId) 
        ? { ...recordMap.get(targetId) } // 创建副本以避免修改原始记录
        : { id: rowData.id ?? '', itemValues: [] };

      // 更新基础字段
      columnList.forEach(col => {
        recordItem[col.prop] = rowData[col.prop] ?? '';
      });

      // 初始化itemValues
      if (!recordItem.itemValues) recordItem.itemValues = [];

      // 收集样本字段
      const sampleFields = this.extractSampleFields(rowData);
      
      // 更新样本数据
      Object.keys(sampleFields).forEach(sampleIndex => {
        const index = parseInt(sampleIndex);
        const fields = sampleFields[index];
        
        if (!recordItem.itemValues[index]) {
          recordItem.itemValues[index] = {};
        }
        
        Object.keys(fields).forEach(fieldName => {
          recordItem.itemValues[index][fieldName] = fields[fieldName];
        });
      });

      return recordItem;
    },
    
    // 处理单元格点击事件
    handleCellClicked({clickedColumn, clickedRow}) {
      if(clickedColumn === 'itemName') {
        // 将clickedRow转换为record后再传递
        const record = this.convertRowToRecord(clickedRow);
        this.$emit('itemNameClick', record);
      }
    },

    // 获取记录变更详情
    getRecordChanges() {
      const lubanno7UniverSheet = this.$refs.lubanno7UniverSheetRef;
      if (!lubanno7UniverSheet) {
        console.error('未找到表格组件实例');
        return this.createEmptyChangeResult();
      }

      // 结束编辑并同步最新数据
      lubanno7UniverSheet.exposed.methods.endEditing();
      this.tableData = lubanno7UniverSheet.exposed.methods.getCurrentTableData();
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