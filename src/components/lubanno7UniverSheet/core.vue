<template>
  <div class="lubanno7-univer-sheet-wrapper">
    <div ref="sheetContainer" :style="config.styleOptions"></div>
    <div v-if="pendingUpdates !== 0 || !isTableInitialized" class="custom-loading-mask">
      <div class="loading-content">
        <div class="loading-spinner" :style="{ 'border-top-color': config.loadingMaskColor }"></div>
        <div class="loading-text">{{ config.loadingMessage }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core'
import UniverPresetSheetsCoreZhCN from '@univerjs/preset-sheets-core/locales/zh-CN'
import { createUniver, LocaleType, mergeLocales } from '@univerjs/presets'
import '@univerjs/preset-sheets-core/lib/index.css'

// 提取DisposableManager为独立类
class DisposableManager {
  constructor() {
    this.disposables = {}; // 使用对象存储，键为字符串标识，值为Disposable实例
  }

  // 添加Disposable（带字符串标识）
  add(id, disposable) {
    if (typeof id !== 'string' || !id) {
      console.error('Invalid disposable ID:', id);
      return;
    }
    if (disposable && typeof disposable.dispose === 'function') {
      // 如果已存在相同ID，先销毁旧实例
      if (this.disposables[id]) {
        this.disposables[id].dispose();
      }
      this.disposables[id] = disposable;
    }
  }

  // 通过字符串标识销毁Disposable
  remove(id) {
    if (this.disposables[id]) {
      try {
        this.disposables[id].dispose();
      } catch (e) {
        console.error(`Failed to dispose ${id}:`, e);
      }
      delete this.disposables[id];
    }
  }

  // 销毁全部Disposable
  disposeAll() {
    Object.keys(this.disposables).forEach(id => {
      this.remove(id);
    });
  }
}

export default {
  name: 'Lubanno7UniverSheetCore',
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
    // 缓存表头行数，避免重复计算
    headerRowCount() {
      return this.getHeaderRowCount(this.currentTableColumns);
    },
    // 缓存扁平化列配置，避免重复计算
    flatColumns() {
      return this.flattenColumns(this.currentTableColumns);
    },
    // 计算总列数
    totalColumns() {
      return this.flatColumns.length;
    }
  },
  data() {
    return {
      univerInstance: null,
      univerAPIInstance: null,
      isTableInitialized: false,
      pendingUpdates: 0,
      headerPermissionId: null,
      headerRuleId: null,
      currentTableColumns: [],
      currentTableData: [],
      disposableManager: new DisposableManager()
    };
  },
  mounted() {
    this.initSheet();
  },
  beforeUnmount() {
    this.univerInstance?.dispose()
    this.univerAPIInstance?.dispose()
    this.disposableManager?.disposeAll();
  },
  methods: {
    // 初始化表格
    initSheet() {
      // 创建Univer实例
      const { univer: univerInstance, univerAPI: univerAPIInstance } = createUniver({
        locale: LocaleType.ZH_CN,
        locales: {
          [LocaleType.ZH_CN]: mergeLocales(
            UniverPresetSheetsCoreZhCN,
          ),
        },
        presets: [
          UniverSheetsCorePreset({
            container: this.$refs.sheetContainer,
            sheets: {
              protectedRangeShadow: false,
            },
          }),
        ],
      })

      this.univerInstance = univerInstance
      this.univerAPIInstance = univerAPIInstance

      // 获取工作表实例
      univerAPIInstance.createWorkbook({})

      // 注册事件监听
      this.registerEvents();
    },

    // 注册所有事件监听
    registerEvents() {
      // 生命周期事件
      this.disposableManager.add('lifecycleDisposable', 
        this.univerAPIInstance.addEvent(
          this.univerAPIInstance.Event.LifeCycleChanged,
          this.handleLifeCycleChanged.bind(this)
        )
      );

      // 单元格值变化事件
      this.disposableManager.add('sheetValueChangedDisposable', 
        this.univerAPIInstance.addEvent(
          this.univerAPIInstance.Event.SheetValueChanged,
          this.handleSheetValueChanged.bind(this)
        )
      );

      // 表格结构变化事件
      this.disposableManager.add('sheetSkeletonChangedDisposable', 
        this.univerAPIInstance.addEvent(
          this.univerAPIInstance.Event.SheetSkeletonChanged,
          this.handleSheetSkeletonChanged.bind(this)
        )
      );

      // 命令执行前事件
      this.disposableManager.add('beforeCommandExecuteDisposable', 
        this.univerAPIInstance.addEvent(
          this.univerAPIInstance.Event.BeforeCommandExecute,
          this.handleBeforeCommandExecute.bind(this)
        )
      );

      // 剪贴板操作前事件
      this.disposableManager.add('beforeClipboardChangeDisposable', 
        this.univerAPIInstance.addEvent(
          this.univerAPIInstance.Event.BeforeClipboardChange,
          this.handleBeforeClipboardChange.bind(this)
        )
      );
    },

    // 处理生命周期变化
    handleLifeCycleChanged({ stage }) {
      switch (stage) {
        case this.univerAPIInstance.Enum.LifecycleStages.Rendered:
          const workbook = this.univerAPIInstance.getActiveWorkbook()
          const worksheet = workbook.getActiveSheet()
          this.currentTableColumns = this.columns;
          this.currentTableData = this.data;
          worksheet.setName(this.config.sheetName)
          this.pendingUpdates++
          this.setColumns(worksheet)
          this.setData(worksheet)
          this.setPermission(workbook, worksheet)
          this.isTableInitialized = true
          this.pendingUpdates--
          this.$emit('tableInitialized')
          break;
      }
    },

    // 处理单元格值变化
    handleSheetValueChanged({ effectedRanges }) {
      if (this.pendingUpdates) return;
      if (effectedRanges.length > 0 && this.isTableInitialized) {
        const range = effectedRanges[0];
        const { startRow, startColumn } = range._range;
        const newVal = range.getValue();

        // 过滤表头区域（只处理数据行）
        if (startRow < this.headerRowCount) return;

        // 计算数据行索引（减去表头行）
        const dataRowIndex = startRow - this.headerRowCount;

        // 获取当前数据行
        if (!this.currentTableData || !this.currentTableData[dataRowIndex]) return;

        const changedRow = { ...this.currentTableData[dataRowIndex] };
        const changedColumn = this.getColumnName(startColumn);
        const oldValue = changedRow[changedColumn]

        if (oldValue === newVal || newVal === null) return;

        // 更新当前数据副本
        const updatedRow = { ...changedRow };
        updatedRow[changedColumn] = newVal;
        this.currentTableData[dataRowIndex] = updatedRow;

        // 触发updateData事件
        this.$emit('updateData', {
          changedRow: updatedRow,
          changedRowIndex: dataRowIndex,
          changedColumn: changedColumn,
          changedColumnIndex: startColumn,
          oldValue: oldValue,
          newVal: newVal,
          currentTableData: [...this.currentTableData]
        });
      }
    },

    // 处理表格结构变化
    handleSheetSkeletonChanged({ payload }) {
      if (this.pendingUpdates) return;
      
      // 处理插入行
      if (payload.id === this.univerAPIInstance.Enum.SheetSkeletonChangeType.INSERT_ROW) {
        this.handleInsertRow(payload.params.range);
      }
      
      // 处理删除行
      if (payload.id === this.univerAPIInstance.Enum.SheetSkeletonChangeType.REMOVE_ROW) {
        this.handleDeleteRow(payload.params.range);
      }
    },

    // 处理插入行
    handleInsertRow(range) {
      const { startRow, endRow } = range;

      // 过滤表头区域（只处理数据行）
      if (startRow < this.headerRowCount) return;

      // 计算插入行的起始和结束索引（减去表头行数）
      const insertRowStartIndex = startRow - this.headerRowCount;
      const insertRowEndIndex = endRow - this.headerRowCount;

      // 创建新的空行数据
      const insertRows = this.createEmptyRows(insertRowEndIndex - insertRowStartIndex + 1);

      // 更新当前数据副本
      this.currentTableData.splice(insertRowStartIndex, 0, ...insertRows);

      // 触发insertRow事件
      this.$emit('insertRow', {
        insertRows: insertRows,
        insertRowStartIndex: insertRowStartIndex,
        insertRowEndIndex: insertRowEndIndex,
        currentTableData: [...this.currentTableData]
      });
    },

    // 处理删除行
    handleDeleteRow(range) {
      const { startRow, endRow } = range;

      // 过滤表头区域（只处理数据行）
      if (startRow < this.headerRowCount) return;

      // 计算删除行的起始和结束索引（减去表头行数）
      const deleteRowStartIndex = startRow - this.headerRowCount;
      const deleteRowEndIndex = endRow - this.headerRowCount;

      // 确保索引在有效范围内
      if (!this.currentTableData || deleteRowStartIndex >= this.currentTableData.length) return;

      // 获取要删除的行数据
      const deleteRows = [];
      for (let i = deleteRowStartIndex; i <= Math.min(deleteRowEndIndex, this.currentTableData.length - 1); i++) {
        deleteRows.push({ ...this.currentTableData[i] });
      }

      // 更新当前数据副本
      this.currentTableData.splice(deleteRowStartIndex, deleteRowEndIndex - deleteRowStartIndex + 1);

      // 触发deleteRow事件
      this.$emit('deleteRow', {
        deleteRows: deleteRows,
        deleteRowStartIndex: deleteRowStartIndex,
        deleteRowEndIndex: deleteRowEndIndex,
        currentTableData: [...this.currentTableData]
      });
    },

    // 处理命令执行前事件
    handleBeforeCommandExecute(event) {
      if (this.pendingUpdates) return;
      const { params, id } = event;
      
      switch (id) {
        case 'sheet.command.insert-row':
          this.handleInsertRowCommand(params, event);
          break;
        case 'sheet.command.remove-row':
          this.handleRemoveRowCommand(params, event);
          break;
        case 'sheet.command.auto-fill':
          this.handleAutoFillCommand(params, event);
          break;
        case 'sheet.operation.set-activate-cell-edit':
          this.handleSetActivateCellEdit(params, event);
          break;
        case 'sheet.command.add-worksheet-merge':
        case 'sheet.command.remove-worksheet-merge':
          this.handleMergeCellCommand(id, event);
          break;
        case 'sheet.command.move-range':
          this.handleMoveRangeCommand(params, event);
          break;
      }
    },

    // 处理插入行命令
    handleInsertRowCommand(params, event) {
      const { startRow } = params.range;
      if (startRow < this.headerRowCount) {
        event.cancel = true;
        if (this.config.messages.insertRowError) {
          this.$message.error(this.config.messages.insertRowError);
        }
      }
    },

    // 处理删除行命令
    handleRemoveRowCommand(params, event) {
      const { startRow } = params.range;
      if (startRow < this.headerRowCount) {
        event.cancel = true;
        if (this.config.messages.deleteRowError) {
          this.$message.error(this.config.messages.deleteRowError);
        }
      }
    },

    // 处理自动填充命令
    handleAutoFillCommand(params, event) {
      const { sourceRange, targetRange } = params;
      
      // 检查是否从表头开始自动填充
      if (sourceRange.startRow < this.headerRowCount) {
        event.cancel = true;
        if (this.config.messages.autoFillFromHeaderError) {
          this.$message.error(this.config.messages.autoFillFromHeaderError);
        }
        return;
      }
      
      // 检查是否填充到表头
      if (targetRange.startRow < this.headerRowCount) {
        event.cancel = true;
        if (this.config.messages.autoFillToHeaderError) {
          this.$message.error(this.config.messages.autoFillToHeaderError);
        }
        return;
      }
      
      // 检查区域是否包含只读单元格
      if (this.hasReadOnlyCellInRange(sourceRange) || this.hasReadOnlyCellInRange(targetRange)) {
        event.cancel = true;
        if (this.config.messages.readonlyCellAutoFillError) {
          this.$message.error(this.config.messages.readonlyCellAutoFillError);
        }
      }
    },

    // 处理单元格编辑命令
    handleSetActivateCellEdit(params, event) {
      const { startRow } = params.primary;
      // 检查是否在表头区域
      if (startRow < this.headerRowCount) {
        event.cancel = true;
        return;
      }
      
      // 检查是否为只读单元格
      if (this.isCellReadonly(startRow, params.primary.startColumn)) {
        event.cancel = true;
      }
    },

    // 处理合并单元格命令
    handleMergeCellCommand(id, event) {
      if (this.isTableInitialized) {
        event.cancel = true;
        if (id === 'sheet.command.add-worksheet-merge' && this.config.messages.mergeCellError) {
          this.$message.error(this.config.messages.mergeCellError);
        } else if (id === 'sheet.command.remove-worksheet-merge' && this.config.messages.unmergeCellError) {
          this.$message.error(this.config.messages.unmergeCellError);
        }
      }
    },

    // 处理移动范围命令
    handleMoveRangeCommand(params, event) {
      const { fromRange, toRange } = params;
      
      // 检查是否移动表头行
      if (fromRange.startRow < this.headerRowCount) {
        event.cancel = true;
        if (this.config.messages.moveHeaderError) {
          this.$message.error(this.config.messages.moveHeaderError);
        }
        return;
      }
      
      // 检查是否移动到表头区域
      if (toRange.startRow < this.headerRowCount) {
        event.cancel = true;
        if (this.config.messages.moveToHeaderError) {
          this.$message.error(this.config.messages.moveToHeaderError);
        }
        return;
      }
      
      // 检查区域是否包含只读单元格
      if (this.hasReadOnlyCellInRange(fromRange) || this.hasReadOnlyCellInRange(toRange)) {
        event.cancel = true;
        if (this.config.messages.readonlyCellMoveError) {
          this.$message.error(this.config.messages.readonlyCellMoveError);
        }
      }
    },

    // 处理剪贴板操作前事件
    handleBeforeClipboardChange(params) {
      const { startRow } = params.fromRange._range;
      if (startRow < this.headerRowCount) {
        params.cancel = true;
        if (this.config.messages.copyHeaderError) {
          this.$message.error(this.config.messages.copyHeaderError);
        }
      }
    },

    // 刷新表格数据
    async refreshTable() {
      if (this.univerAPIInstance && this.isTableInitialized) {
        this.pendingUpdates++
        const workbook = this.univerAPIInstance.getActiveWorkbook();
        const worksheet = workbook.getActiveSheet();
        // 转换并设置数据
        this.setData(worksheet)
        // 转换并设置权限
        this.setPermission(workbook, worksheet)
        this.pendingUpdates--
        this.$emit('tableRefreshed')
      }
    },

    // 更新只读单元格样式
    updateReadonlyCellStyles(worksheet) {
      if (!worksheet || !this.config.readonlyCellStyle) {
        return;
      }
      
      const readonlyStyle = this.config.readonlyCellStyle;
      
      // 遍历数据区域的所有单元格
      for (let row = this.headerRowCount; row < this.headerRowCount + this.currentTableData.length; row++) {
        for (let col = 0; col < this.totalColumns; col++) {
          if (this.isCellReadonly(row, col)) {
            // 应用只读样式
            const cellRange = this.getCellRange(worksheet, row, col);
            cellRange.setBackgroundColor(readonlyStyle.backgroundColor);
            cellRange.setFontWeight(readonlyStyle.fontWeight);
            cellRange.setBorder(
              this.univerAPIInstance.Enum.BorderType.ALL, 
              this.univerAPIInstance.Enum.BorderStyleTypes.THIN, 
              readonlyStyle.borderColor
            );
          }
        }
      }
    },

    // 检查单元格是否为只读
    isCellReadonly(rowIndex, colIndex) {
      // 如果是表头行，直接返回true
      if (rowIndex < this.headerRowCount) return true;
      
      // 检查列索引是否有效
      if (colIndex >= this.totalColumns) return false;
      
      // 获取对应的列配置
      const column = this.flatColumns[colIndex];
      // 检查editor配置
      return (column.editor && column.editor.type === 'readonly') ? true : false;
    },

    // 检查指定范围内是否包含只读单元格
    hasReadOnlyCellInRange(range) {
      const { startRow, endRow, startColumn, endColumn } = range;
      
      // 遍历范围内的所有单元格
      for (let row = startRow; row <= endRow; row++) {
        // 跳过表头行
        if (row < this.headerRowCount) continue;
        
        for (let col = startColumn; col <= endColumn; col++) {
          if (this.isCellReadonly(row, col)) {
            return true;
          }
        }
      }
      return false;
    },

    // 生成表头行数据和合并信息
    generateHeaderRows(columns) {
      // 计算总列数（叶子节点数量）
      const totalColumns = this.calculateTotalColumns(columns);

      // 计算最大深度
      const maxDepth = this.calculateMaxDepth(columns);

      // 初始化表头行
      const headerRows = Array.from({ length: maxDepth }, () =>
        new Array(totalColumns).fill('')
      );
      const mergeInfos = [];

      // 递归填充表头和合并信息
      this.fillHeader(columns, 0, 0, headerRows, mergeInfos, totalColumns);

      return { headerRows, mergeInfos };
    },

    // 计算总列数
    calculateTotalColumns(cols) {
      return cols.reduce((sum, col) => {
        return sum + (col.children?.length ? this.calculateTotalColumns(col.children) : 1);
      }, 0);
    },

    // 计算最大深度
    calculateMaxDepth(cols) {
      return Math.max(...cols.map(col =>
        col.children?.length ? 1 + this.calculateMaxDepth(col.children) : 1
      ), 0);
    },

    // 填充表头数据
    fillHeader(cols, row, col, headerRows, mergeInfos) {
      let currentCol = col;

      cols.forEach(column => {
        // 设置当前单元格内容
        headerRows[row][currentCol] = column.label;

        // 计算当前列包含的叶子节点数量
        const leafCount = column.children?.length ? this.calculateTotalColumns(column.children) : 1;

        if (column.children?.length) {
          // 横向合并当前行
          mergeInfos.push({
            startRow: row,
            startCol: currentCol,
            endRow: row,
            endCol: currentCol + leafCount - 1
          });
          // 处理子列
          currentCol = this.fillHeader(column.children, row + 1, currentCol, headerRows, mergeInfos);
        } else {
          // 叶子节点且需要纵向合并
          if (row < headerRows.length - 1) {
            mergeInfos.push({
              startRow: row,
              startCol: currentCol,
              endRow: headerRows.length - 1,
              endCol: currentCol
            });
          }
          currentCol++;
        }
      });

      return currentCol;
    },

    // 设置表头
    setColumns(worksheet) {
      if (!this.columns.length) {
        worksheet.setColumnCount(1);
        return;
      }
      
      // 处理嵌套表头，获取表头行数据和合并信息
      const { headerRows, mergeInfos } = this.generateHeaderRows(this.columns);
      worksheet.setColumnCount(headerRows[0].length);
      
      // 设置表头数据
      headerRows.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
          if (cell !== undefined) {
            worksheet.getRange(rowIndex, colIndex, 1, 1).setValue(cell);
          }
        });
      });

      // 应用合并规则
      mergeInfos.forEach(info => {
        worksheet.getRange(
          info.startRow, 
          info.startCol, 
          info.endRow - info.startRow + 1, 
          info.endCol - info.startCol + 1
        ).merge();
      });

      // 添加表头样式
      const headerRange = worksheet.getRange(0, 0, headerRows.length, headerRows[0].length);

      // 使用配置中的样式
      if (this.config.headerStyle) {
        headerRange.setBackgroundColor(this.config.headerStyle.backgroundColor);
        headerRange.setFontWeight(this.config.headerStyle.fontWeight);
        headerRange.setBorder(
          this.univerAPIInstance.Enum.BorderType.ALL, 
          this.univerAPIInstance.Enum.BorderStyleTypes.THIN, 
          this.config.headerStyle.borderColor
        );
      }

      // 设置数据区域的行高
      const totalRowCount = this.headerRowCount + this.data.length;
      for (let rowIndex = this.headerRowCount; rowIndex < totalRowCount; rowIndex++) {
        worksheet.setRowHeight(rowIndex, this.config.defaultRowHeight);
      }

      // 设置列宽
      this.flatColumns.forEach((column, index) => {
        // 优先使用配置的width，否则使用默认值
        const width = column.width || this.config.defaultColumnWidth;
        worksheet.setColumnWidth(index, width);
      });
    },

    // 获取表头行数
    getHeaderRowCount(columns) {
      let maxLevel = 1
      columns.forEach(col => {
        if (col.children && col.children.length > 0) {
          const level = 1 + this.getHeaderRowCount(col.children)
          if (level > maxLevel) {
            maxLevel = level
          }
        }
      })
      return maxLevel
    },

    // 设置表格数据
    setData(worksheet) {
      if (!this.data.length) {
        worksheet.setRowCount(1);
        return;
      }
      
      worksheet.setRowCount(this.headerRowCount + this.data.length);
      this.data.forEach((row, rowIndex) => {
        const flattenData = this.flattenRowData(row, this.columns)
        flattenData.forEach((value, colIndex) => {
          worksheet.getRange(rowIndex + this.headerRowCount, colIndex, 1, 1).setValue(value);
        })
      });
      
      this.updateReadonlyCellStyles(worksheet);
    },

    // 设置权限
    async setPermission(workbook, worksheet) {
      const unitId = workbook.getId();
      const subUnitId = worksheet.getSheetId();
      const permission = workbook.getPermission();

      this.setWorkbookPermission(unitId, permission);
      await this.setWorksheetPermission(unitId, subUnitId, permission);
      // await this.setHeaderProtectionPermission(unitId, subUnitId, worksheet, permission);
    },

    // 设置工作簿权限
    setWorkbookPermission(unitId, permission) {
      const workbookPermission = {
        WorkbookEditablePermission: true,
        WorkbookPrintPermission: true,
        WorkbookCommentPermission: true,
        WorkbookViewPermission: true,
        WorkbookCopyPermission: true,
        WorkbookExportPermission: true,
        WorkbookManageCollaboratorPermission: false,
        WorkbookCreateSheetPermission: false,
        WorkbookDeleteSheetPermission: false,
        WorkbookRenameSheetPermission: false,
        WorkbookHideSheetPermission: false,
        WorkbookSharePermission: true,
        WorkbookMoveSheetPermission: false,
      };
      
      Object.keys(workbookPermission).forEach(item => {
        permission.setWorkbookPermissionPoint(
          unitId, 
          permission.permissionPointsDefinition[item], 
          workbookPermission[item]
        );
      });
    },

    // 设置工作表权限
    async setWorksheetPermission(unitId, subUnitId, permission) {
      const worksheetPermission = {
        WorksheetCopyPermission: true,
        WorksheetDeleteColumnPermission: false,
        WorksheetDeleteRowPermission: this.config.allowDeleteRow,
        WorksheetFilterPermission: true,
        WorksheetInsertColumnPermission: false,
        WorksheetInsertHyperlinkPermission: true,
        WorksheetInsertRowPermission: this.config.allowInsertRow,
        WorksheetPivotTablePermission: true,
        WorksheetSetCellStylePermission: true,
        WorksheetSetCellValuePermission: true,
        WorksheetSetColumnStylePermission: true,
        WorksheetSetRowStylePermission: true,
        WorksheetSortPermission: true,
        WorksheetViewPermission: true,
        WorksheetEditPermission: true
      };
      
      const worksheetPermissionId = await permission.addWorksheetBasePermission(unitId, subUnitId);
      
      permission.sheetRuleChangedAfterAuth$.subscribe((currentPermissionId) => {
        if (currentPermissionId === worksheetPermissionId) {
          Object.keys(worksheetPermission).forEach(item => {
            permission.setWorksheetPermissionPoint(
              unitId, 
              subUnitId, 
              permission.permissionPointsDefinition[item], 
              worksheetPermission[item]
            );
          });
        }
      });
    },

    // 设置表头保护权限
    async setHeaderProtectionPermission(unitId, subUnitId, worksheet, permission) {
      // 计算表头行数和列数
      const headerRange = worksheet.getRange(0, 0, this.headerRowCount, this.totalColumns);
      const res = await permission.addRangeBaseProtection(unitId, subUnitId, [headerRange]);
      
      const rangeProtectionPermission = {
        RangeProtectionPermissionViewPoint: true, // 能否查看保护区域的内容
        RangeProtectionPermissionEditPoint: false // 能否编辑保护区域
      };
      
      const { permissionId: headerPermissionId, ruleId: headerRuleId } = res;
      this.headerPermissionId = headerPermissionId;
      this.headerRuleId = headerRuleId;
      
      permission.rangeRuleChangedAfterAuth$.subscribe((currentPermissionId) => {
        if (currentPermissionId === headerPermissionId) {
          Object.keys(rangeProtectionPermission).forEach(item => {
            permission.setRangeProtectionPermissionPoint(
              unitId, 
              subUnitId, 
              headerPermissionId, 
              permission.permissionPointsDefinition[item], 
              rangeProtectionPermission[item]
            );
          });
        }
      });
    },

    // 单元格操作工具方法
    getCellRange(worksheet, row, col) {
      return worksheet.getRange(row, col, 1, 1);
    },

    setCellValue(worksheet, row, col, value) {
      this.getCellRange(worksheet, row, col).setValue(value);
    },

    getCellValue(worksheet, row, col) {
      return this.getCellRange(worksheet, row, col).getValue();
    },

    // 创建指定数量的空行
    createEmptyRows(count) {
      const insertRows = [];
      for (let i = 0; i < count; i++) {
        const newRow = {};
        // 为每一列创建一个空值
        this.flatColumns.forEach(column => {
          newRow[column.prop] = '';
        });
        insertRows.push(newRow);
      }
      return insertRows;
    },

    // 展平行数据
    flattenRowData(row, columns, result = []) {
      columns.forEach(col => {
        if (col.children && col.children.length > 0) {
          this.flattenRowData(row, col.children, result);
        } else {
          result.push(row[col.prop] ?? '');
        }
      });
      return result;
    },

    // 获取列名（基于扁平化后的列配置）
    getColumnName(colIndex) {
      if (!this.currentTableColumns || !Array.isArray(this.currentTableColumns)) return '';

      // 添加边界检查
      if (colIndex < 0 || colIndex >= this.flatColumns.length) return '';

      return this.flatColumns[colIndex]?.prop || this.flatColumns[colIndex]?.dataIndex || '';
    },

    // 扁平化列配置（处理嵌套结构）
    flattenColumns(columns) {
      const result = [];
      const traverse = (cols) => {
        cols.forEach(col => {
          if (!col.children || col.children.length === 0) {
            result.push(col);
          } else {
            traverse(col.children);
          }
        });
      };
      traverse(columns || []);
      return result;
    },

    // 获取当前表格数据
    getCurrentTableData() {
      // 确保实例已初始化
      if (!this.univerAPIInstance || !this.isTableInitialized) {
        return this.currentTableData;
      }

      try {
        // 获取当前工作表
        const workbook = this.univerAPIInstance.getActiveWorkbook();
        const worksheet = workbook.getActiveSheet();

        // 获取数据区域范围
        const lastRow = worksheet.getLastRow();
        const lastColumn = worksheet.getLastColumn();

        // 如果没有数据行，返回空数组
        if (lastRow < this.headerRowCount) {
          this.currentTableData = [];
          return [];
        }

        // 获取所有数据单元格的值
        const dataRange = worksheet.getRange(
          this.headerRowCount, 
          0, 
          lastRow - this.headerRowCount + 1, 
          lastColumn + 1
        );
        const dataValues = dataRange.getValues();

        // 转换为表格数据格式
        const newTableData = dataValues.map((row) => {
          const rowData = {};
          row.forEach((cellValue, colIndex) => {
            const column = this.flatColumns[colIndex];
            if (column) {
              const fieldName = column.prop || column.dataIndex;
              if (fieldName) {
                rowData[fieldName] = cellValue;
              }
            }
          });
          return rowData;
        });

        // 更新当前表格数据
        this.currentTableData = newTableData;
        return this.currentTableData;
      } catch (error) {
        console.error('获取当前表格数据失败:', error);
        // 出错时返回现有数据
        return this.currentTableData;
      }
    },

    // 结束编辑状态
    endEditing() {
      if (this.univerAPIInstance && this.isTableInitialized) {
        const workbook = this.univerAPIInstance.getActiveWorkbook();
        return workbook.endEditingAsync(true);
      }
    }
  },
  watch: {
    // 深度监听data prop变化
    data: {
      handler(newData) {
        if (!this.config.autoRefreshOnPropChange) return;
        if (this.univerAPIInstance && this.isTableInitialized) {
          this.currentTableData = newData;
        }
        this.refreshTable();
      },
      deep: true,
      immediate: false
    },
    // 深度监听config prop变化
    config: {
      handler() {
        if (!this.config.autoRefreshOnPropChange) return;
        this.refreshTable();
      },
      deep: true,
      immediate: false
    }
  }
};
</script>

<style scoped>
.lubanno7-univer-sheet-wrapper {
  position: relative;
  overflow: hidden;
}

.custom-loading-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  pointer-events: auto;
}

.loading-content {
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 10px;
}

.loading-text {
  color: #333;
  font-size: 14px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>