<template>
  <UniversheetCore
    v-if="isComponentAlive"
    ref="universheetCoreRef"
    :columns="columns"
    :data="data"
    :config="mergedConfig"
    @updateData="handleDataChange"
    @tableInitialized="handleTableInitialized"
    @tableRefreshed="handleTableUpdated"
    @insertRow="handleInsertRow"
    @deleteRow="handleDeleteRow"
  />
</template>

<script>
import UniversheetCore from './core.vue'

export default {
  name: 'Universheet',
  components: {
    UniversheetCore
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
    // config配置
    config: {
      type: Object,
      default: () => ({})
    }
  },
  computed: {
    mergedConfig() {
      return {
        ...this.defaultConfig,
        ...this.config
      }
    },
  },
  data() {
    return {
      isComponentAlive: true,
      exposed: {
        attributes: {
          defaultConfig: this.defaultConfig
        },
        methods: {
          refreshTable: this.refreshTable
        }
      },
      isTableInitialized: false,
      defaultConfig: {
        defaultRowHeight: 20,
        defaultColumnWidth: 80,
        sheetName: 'Sheet',
        allowInsertRow: true,
        allowDeleteRow: true,
        autoRefreshOnPropChange: false,
        loadingMaskColor: '#3498db',
        loadingMessage: '数据加载中...',
        styleOptions: {
          width: '100%',
          height: '500px'
        },
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
    refreshTable(needUpdateColumns = false) {
      if (needUpdateColumns) {
        // 销毁并重建核心组件
        this.isComponentAlive = false
        // 使用$nextTick确保组件完全销毁
        this.$nextTick(() => {
          this.isComponentAlive = true
        })
      } else if (this.isTableInitialized) {
        // 仅刷新数据，不重建组件
        this.$refs.universheetCoreRef.refreshTable()
      }
    },
    handleDataChange(params) {
      this.$emit('updateData', {...params, exposed: this.exposed})
    },
    handleTableInitialized() {
      const universheetCoreRef = this.$refs.universheetCoreRef
      this.exposed = { 
        attributes: {
          defaultConfig: this.defaultConfig,
          univerInstance: universheetCoreRef.univerInstance,
          univerAPIInstance: universheetCoreRef.univerAPIInstance
        },
        methods: {
          getCurrentTableData: universheetCoreRef.getCurrentTableData,
          endEditing: universheetCoreRef.endEditing,
          refreshTable: this.refreshTable
        }
      }
      this.isTableInitialized = true
      this.$emit('tableInitialized', this.exposed)
    },
    handleTableUpdated(params) {
      this.$emit('tableRefreshed', {...params, exposed: this.exposed})
    },
    handleInsertRow(params) {
      this.$emit('insertRow', {...params, exposed: this.exposed})
    },
    handleDeleteRow(params) {
      this.$emit('deleteRow', {...params, exposed: this.exposed})
    }
  },
  watch: {
    columns: {
      handler(newVal, oldVal) {
        this.refreshTable(true)
      },
      deep: true,
      immediate: false
  }
}};
</script>