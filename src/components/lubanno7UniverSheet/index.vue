<template>
  <Lubanno7UniverSheetCore
    v-if="isComponentAlive"
    ref="lubanno7UniverSheetCoreRef"
    :columns="columns"
    :data="data"
    :config="mergedConfig"
    @updateData="handleDataChange"
    @tableInitialized="handleTableInitialized"
    @tableDataRefreshed="handleTableDataUpdated"
    @insertRow="handleInsertRow"
    @deleteRow="handleDeleteRow"
    @cellClicked="handleCellClicked"
  />
</template>

<script>
import Lubanno7UniverSheetCore from './core.vue'

export default {
  name: 'Lubanno7UniverSheet',
  components: {
    Lubanno7UniverSheetCore
  },
  props: {
    // 列配置
    columns: {
      type: Array,
      required: true
    },
    // 表格数据
    data: {
      type: Array,
      required: true
    },
    // 配置选项
    config: {
      type: Object,
      default: () => ({})
    }
  },
  computed: {
    // 合并默认配置和用户配置
    mergedConfig() {
      return {
        ...this.defaultConfig,
        ...this.config
      }
    }
  },
  data() {
    return {
      isComponentAlive: true,
      isTableInitialized: false,
      // 手动维护exposed对象，不使用计算属性
      exposed: {
        attributes: {
          defaultConfig: this.defaultConfig
        },
        methods: {
          refreshTableData: this.refreshTableData,
          recreateTable: this.recreateTable,
          refreshTableCommonConfig: this.refreshTableCommonConfig
        }
      },
      // 默认配置集中管理
      defaultConfig: {
        sheetName: 'Sheet',
        allowInsertRow: true,
        allowDeleteRow: true,
        autoRefreshOnPropChange: false,
        loadingMaskColor: '#3498db',
        loadingMessage: '数据加载中...',
        showHeader: true,
        showFooter: true,
        batchSize: 500,
        styleOptions: {
          width: '100%',
          height: '500px'
        },
        commonStyle: {
          defaultRowHeight: 20,
          defaultColumnWidth: 80,
          fontSize: 12
        },
        headerStyle: {
          backgroundColor: '#cfe2f3',
          fontWeight: 'normal',
          borderColor: '#ccc'
        },
        readonlyCellStyle: {
          backgroundColor: '#eee',
          fontWeight: 'normal',
          borderColor: '#ccc'
        },
        messages: {
          insertRowError: '表头区域不可插入行',
          deleteRowError: '表头行不可删除',
          autoFillFromHeaderError: '不可从表头行开始自动填充',
          autoFillToHeaderError: '不可填充至表头行',
          mergeCellError: '不支持合并单元格',
          unmergeCellError: '不支持取消单元格合并',
          moveHeaderError: '表头行不可移动',
          moveToHeaderError: '不可移动内容至表头区域',
          copyHeaderError: '表头行不可复制',
          readonlyCellAutoFillError: '区域包含只读单元格无法自动填充',
          readonlyCellMoveError: '区域包含只读单元格无法移动数据'
        }
      }
    }
  },
  methods: {
    // 刷新表格数据
    refreshTableData() {
      if (this.isTableInitialized && this.$refs.lubanno7UniverSheetCoreRef) {
        this.$refs.lubanno7UniverSheetCoreRef.refreshTableData();
      }
    },
    recreateTable() {
      // 销毁并重建核心组件
      this.isComponentAlive = false;
      this.$nextTick(() => {
        this.isComponentAlive = true;
      });
    },
    refreshTableCommonConfig() {
      if (this.isTableInitialized && this.$refs.lubanno7UniverSheetCoreRef) {
        this.$refs.lubanno7UniverSheetCoreRef.setCommonSheetConfig();
      }
    },
    
    // 统一处理事件发射，添加exposed信息
    emitEvent(eventName, params) {
      const emitData = params ? { ...params, exposed: this.exposed } : this.exposed;
      this.$emit(eventName, emitData);
    },
    
    // 处理数据变化事件
    handleDataChange(params) {
      this.emitEvent('updateData', params);
    },
    
    // 处理表格初始化完成事件
    handleTableInitialized() {
      const coreRef = this.$refs.lubanno7UniverSheetCoreRef;
      // 表格初始化后更新exposed对象
      this.exposed = {
        attributes: {
          defaultConfig: this.defaultConfig,
          univerInstance: coreRef.univerInstance,
          univerAPIInstance: coreRef.univerAPIInstance
        },
        methods: {
          getCurrentTableData: coreRef.getCurrentTableData,
          endEditing: coreRef.endEditing,
          setCellFontColor: coreRef.setCellFontColor,
          getColumnName: coreRef.getColumnName,
          getColumnIndex: coreRef.getColumnIndex,
          refreshTableData: this.refreshTableData,
          recreateTable: this.recreateTable,
          refreshTableCommonConfig: this.refreshTableCommonConfig
        }
      };
      this.isTableInitialized = true;
      this.emitEvent('tableInitialized');
    },
    
    // 处理表格数据更新事件
    handleTableDataUpdated() {
      this.emitEvent('tableDataRefreshed');
    },
    
    // 处理插入行事件
    handleInsertRow(params) {
      this.emitEvent('insertRow', params);
    },
    
    // 处理删除行事件
    handleDeleteRow(params) {
      this.emitEvent('deleteRow', params);
    },
    
    // 处理单元格点击事件
    handleCellClicked(params) {
      this.emitEvent('cellClicked', params);
    }
  },
  watch: {
    // 监听列配置变化，需要重建表格
    columns: {
      handler: function() {
        this.recreateTable();
      },
      deep: true,
      immediate: false
    }
  }
};
</script>