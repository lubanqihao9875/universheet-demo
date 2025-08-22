<template>
  <div class="universheet-wrapper">
    <div ref="sheetContainer" :style="mergedConfig.styleOptions"></div>
    <div v-if="pendingUpdates !== 0 || !isTableInitialized" class="custom-loading-mask">
      <div class="loading-content">
        <div class="loading-spinner" :style="{ 'border-top-color': mergedConfig.loadingMaskColor }"></div>
        <div class="loading-text">{{ mergedConfig.loadingMessage }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core'
import UniverPresetSheetsCoreZhCN from '@univerjs/preset-sheets-core/locales/zh-CN'
import { createUniver, LocaleType, mergeLocales } from '@univerjs/presets'
import '@univerjs/preset-sheets-core/lib/index.css'

export default {
  name: 'Universheet',
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
      };
    },
    exposed() {
      return {
        attributes: {
          univerInstance: this.univerInstance,
          univerAPIInstance: this.univerAPIInstance,
          defaultConfig: this.defaultConfig
        },
        methods: {
          getCurrentTableData: this.getCurrentTableData,
          refreshTable: this.refreshTableExposed,
          endEditing: this.endEditing
        }
      }
    },
  },
  data() {
    return {
      univerInstance: null,
      univerAPIInstance: null,
      isTableInitialized: false,
      pendingUpdates: 0,
      headerPermissionId: null,
      currentTableColumns: null,
      currentTableData: null,
      defaultConfig: {
        defaultRowHeight: 20,
        defaultColumnWidth: 80,
        headerBackgroundColor: '#cfe2f3',
        borderColor: '#000000',
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
        messages: {
          insertRowError: '表头区域不可插入行',
          deleteRowError: '表头行不可删除',
          autoFillFromHeaderError: '不可从表头行开始自动填充',
          autoFillToHeaderError: '不可填充至表头行',
          mergeCellError: '不支持合并单元格',
          unmergeCellError: '不支持取消单元格合并',
          moveHeaderError: '表头行不可移动',
          moveToHeaderError: '不可移动内容至表头区域',
          copyHeaderError: '表头行不可复制'
        }
      },
      // 字符串标识的Disposable管理器
      disposableManager: {
        disposables: {}, // 使用对象存储，键为字符串标识，值为Disposable实例

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
        },

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
        },

        // 销毁全部Disposable
        disposeAll() {
          Object.keys(this.disposables).forEach(id => {
            this.remove(id);
          });
        }
      }
    }
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
      const {
        univer: univerInstance,
        univerAPI: univerAPIInstance
      } = createUniver({
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

      // 获取工作表实例
      univerAPIInstance.createWorkbook({})

      // 使用字符串标识添加生命周期Disposable
      this.disposableManager.add('lifecycleDisposable', univerAPIInstance.addEvent(
        univerAPIInstance.Event.LifeCycleChanged,
        async ({ stage }) => {
          switch (stage) {
            case univerAPIInstance.Enum.LifecycleStages.Rendered:
              const workbook = univerAPIInstance.getActiveWorkbook()
              const worksheet = workbook.getActiveSheet()
              this.currentTableColumns = this.columns;
              this.currentTableData = this.data;
              worksheet.setName(this.mergedConfig.sheetName)
              this.pendingUpdates++
              // 转换并设置表头
              this.setColumns(worksheet)
              // 转换并设置数据
              this.setData(worksheet)
              await this.setPermission(workbook, worksheet)
              this.isTableInitialized = true
              this.pendingUpdates--
              this.$emit('tableInitialized', this.exposed)
              break;
          }
        },
      ));

      this.disposableManager.add('sheetValueChangedDisposable', univerAPIInstance.addEvent(
        univerAPIInstance.Event.SheetValueChanged,
        ({ effectedRanges }) => {
          // 处理值变化
          if (this.pendingUpdates) return;
          if (effectedRanges.length > 0 && this.isTableInitialized) {
            const range = effectedRanges[0];
            const { startRow, startColumn } = range._range;
            const newVal = range.getValue();

            // 计算表头行数
            const headerRowCount = this.getHeaderRowCount(this.currentTableColumns || this.columns);

            // 过滤表头区域（只处理数据行）
            if (startRow < headerRowCount) return;

            // 计算数据行索引（减去表头行）
            const dataRowIndex = startRow - headerRowCount;

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
              currentTableData: [...this.currentTableData],
              exposed: this.exposed
            });
          }
        }
      ))

      this.disposableManager.add('sheetSkeletonChangedDisposable', univerAPIInstance.addEvent(
        univerAPIInstance.Event.SheetSkeletonChanged,
        ({ payload }) => {
          if (this.pendingUpdates) return;
          if (payload.id === univerAPIInstance.Enum.SheetSkeletonChangeType.INSERT_ROW) {
            const { startRow, endRow } = payload.params.range;

            // 计算表头行数
            const headerRowCount = this.getHeaderRowCount(this.currentTableColumns || this.columns);

            // 过滤表头区域（只处理数据行）
            if (startRow < headerRowCount) return;

            // 计算插入行的起始和结束索引（减去表头行数）
            const insertRowStartIndex = startRow - headerRowCount;
            const insertRowEndIndex = endRow - headerRowCount;

            // 获取扁平化的列配置
            const flatColumns = this.flattenColumns(this.currentTableColumns || this.columns);

            // 创建新的空行数据
            const insertRows = [];
            for (let i = 0; i <= insertRowEndIndex - insertRowStartIndex; i++) {
              const newRow = {};
              // 为每一列创建一个空值
              flatColumns.forEach(column => {
                newRow[column.prop] = '';
              });
              insertRows.push(newRow);
            }

            // 更新当前数据副本
            this.currentTableData.splice(insertRowStartIndex, 0, ...insertRows);

            // 触发insertRow事件
            this.$emit('insertRow', {
              insertRows: insertRows,
              insertRowStartIndex: insertRowStartIndex,
              insertRowEndIndex: insertRowEndIndex,
              currentTableData: [...this.currentTableData],
              exposed: this.exposed
            });
          }
          if (payload.id === univerAPIInstance.Enum.SheetSkeletonChangeType.REMOVE_ROW) {
            const { startRow, endRow } = payload.params.range;

            // 计算表头行数
            const headerRowCount = this.getHeaderRowCount(this.currentTableColumns || this.columns);

            // 过滤表头区域（只处理数据行）
            if (startRow < headerRowCount) return;

            // 计算删除行的起始和结束索引（减去表头行数）
            const deleteRowStartIndex = startRow - headerRowCount;
            const deleteRowEndIndex = endRow - headerRowCount;

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
              currentTableData: [...this.currentTableData],
              exposed: this.exposed
            });
          }
        }
      ))

      this.disposableManager.add('beforeCommandExecuteDisposable', univerAPIInstance.addEvent(
        univerAPIInstance.Event.BeforeCommandExecute,
        (event) => {
          if (this.pendingUpdates) return;
          const { params, id, type, options } = event;
          if (id === 'sheet.command.insert-row') {
            const { startRow, endRow } = params.range
            if (startRow < this.getHeaderRowCount(this.currentTableColumns || this.columns)) {
              event.cancel = true;
              // 判断消息是否有值，有值才报错
              if (this.mergedConfig.messages.insertRowError) {
                this.$message.error(this.mergedConfig.messages.insertRowError)
              }
              return;
            }
          }
          if (id === 'sheet.command.remove-row') {
            const { startRow, endRow } = params.range
            if (startRow < this.getHeaderRowCount(this.currentTableColumns || this.columns)) {
              event.cancel = true;
              // 判断消息是否有值，有值才报错
              if (this.mergedConfig.messages.deleteRowError) {
                this.$message.error(this.mergedConfig.messages.deleteRowError)
              }
              return;
            }
          }
          if (id === 'sheet.command.auto-fill') {
            const { sourceRange, targetRange } = params;
            if (sourceRange.startRow < this.getHeaderRowCount(this.currentTableColumns || this.columns)) {
              event.cancel = true;
              // 判断消息是否有值，有值才报错
              if (this.mergedConfig.messages.autoFillFromHeaderError) {
                this.$message.error(this.mergedConfig.messages.autoFillFromHeaderError)
              }
              return;
            }
            if (targetRange.startRow < this.getHeaderRowCount(this.currentTableColumns || this.columns)) {
              event.cancel = true;
              // 判断消息是否有值，有值才报错
              if (this.mergedConfig.messages.autoFillToHeaderError) {
                this.$message.error(this.mergedConfig.messages.autoFillToHeaderError)
              }
              return;
            }
          }
          if (id === 'sheet.operation.set-activate-cell-edit') {
            const { startRow, endRow } = params.primary
            if (endRow < this.getHeaderRowCount(this.currentTableColumns || this.columns)) {
              event.cancel = true;
              return;
            }
          }
          if (this.isTableInitialized && id === 'sheet.command.add-worksheet-merge') {
            event.cancel = true;
            // 判断消息是否有值，有值才报错
            if (this.mergedConfig.messages.mergeCellError) {
              this.$message.error(this.mergedConfig.messages.mergeCellError)
            }
            return;
          }
          if (this.isTableInitialized && id === 'sheet.command.remove-worksheet-merge') {
            event.cancel = true;
            // 判断消息是否有值，有值才报错
            if (this.mergedConfig.messages.unmergeCellError) {
              this.$message.error(this.mergedConfig.messages.unmergeCellError)
            }
            return;
          }
          if (id === 'sheet.command.move-range') {
            const { fromRange, toRange } = params;
            if (fromRange.startRow < this.getHeaderRowCount(this.currentTableColumns || this.columns)) {
              event.cancel = true;
              // 判断消息是否有值，有值才报错
              if (this.mergedConfig.messages.moveHeaderError) {
                this.$message.error(this.mergedConfig.messages.moveHeaderError)
              }
              return;
            }
            if (toRange.startRow < this.getHeaderRowCount(this.currentTableColumns || this.columns)) {
              event.cancel = true;
              // 判断消息是否有值，有值才报错
              if (this.mergedConfig.messages.moveToHeaderError) {
                this.$message.error(this.mergedConfig.messages.moveToHeaderError)
              }
              return;
            }
          }
        }
      ))


      this.disposableManager.add('beforeClipboardChangeDisposable', univerAPIInstance.addEvent(
        univerAPIInstance.Event.BeforeClipboardChange,
        (params) => {
          const { startRow, endRow } = params.fromRange._range
          if (startRow < this.getHeaderRowCount(this.currentTableColumns || this.columns)) {
            params.cancel = true;
            if (this.mergedConfig.messages.copyHeaderError) {
              this.$message.error(this.mergedConfig.messages.copyHeaderError)
            }
            return;
          }
        }
      ))

      // 缺少指定选区禁止粘贴功能

      this.univerInstance = univerInstance
      this.univerAPIInstance = univerAPIInstance
    },

    async refreshTable(needUpdateColumns = false) {
      if (this.univerAPIInstance && this.isTableInitialized) {
        this.pendingUpdates++
        if (needUpdateColumns) {
          await this.endEditing();
          let workbook = this.univerAPIInstance.getActiveWorkbook();
          let worksheet = workbook.getActiveSheet();
          const sheetName = worksheet.getSheetName();
          const unitId = workbook.getId();
          if (unitId) {
            this.univerAPIInstance.disposeUnit(unitId)
          }
          this.univerAPIInstance.createWorkbook({})
          workbook = this.univerAPIInstance.getActiveWorkbook();
          worksheet = workbook.getActiveSheet();
          worksheet.setName(sheetName);
        }
        const workbook = this.univerAPIInstance.getActiveWorkbook();
        const worksheet = workbook.getActiveSheet();
        // 根据参数决定是否转换并设置表头
        if (needUpdateColumns) {
          this.setColumns(worksheet)
        }
        // 转换并设置数据
        this.setData(worksheet)
        // 转换并设置权限
        this.setPermission(workbook, worksheet)
        this.pendingUpdates--
        this.$emit('tableRefreshed', this.exposed)
      }
    },

    refreshTableExposed(needUpdateColumns = false) {
      if (this.univerAPIInstance && this.isTableInitialized) {
        if (needUpdateColumns) {
          this.currentTableColumns = this.column;
        }
        this.currentTableData = this.data;
      }
      this.refreshTable(needUpdateColumns)
    },

    // 生成表头行数据和合并信息
    generateHeaderRows(columns) {
      // 计算总列数（叶子节点数量）
      const getTotalColumns = (cols) => {
        return cols.reduce((sum, col) => {
          return sum + (col.children?.length ? getTotalColumns(col.children) : 1);
        }, 0);
      };
      const totalColumns = getTotalColumns(columns);

      // 计算最大深度
      const getMaxDepth = (cols) => {
        return Math.max(...cols.map(col =>
          col.children?.length ? 1 + getMaxDepth(col.children) : 1
        ), 0);
      };
      const maxDepth = getMaxDepth(columns);

      // 初始化表头行，确保每行都有正确数量的空字符串
      const headerRows = Array.from({ length: maxDepth }, () =>
        new Array(totalColumns).fill('')
      );
      const mergeInfos = [];

      // 递归填充表头和合并信息
      const fillHeader = (cols, row = 0, col = 0) => {
        let currentCol = col;

        cols.forEach(column => {
          // 设置当前单元格内容
          headerRows[row][currentCol] = column.label;

          // 计算当前列包含的叶子节点数量
          const leafCount = column.children?.length ? getTotalColumns(column.children) : 1;

          if (column.children?.length) {
            // 横向合并当前行
            mergeInfos.push({
              startRow: row,
              startCol: currentCol,
              endRow: row,
              endCol: currentCol + leafCount - 1
            });
            // 处理子列
            currentCol = fillHeader(column.children, row + 1, currentCol);
          } else {
            // 叶子节点且需要纵向合并
            if (row < maxDepth - 1) {
              mergeInfos.push({
                startRow: row,
                startCol: currentCol,
                endRow: maxDepth - 1,
                endCol: currentCol
              });
            }
            currentCol++;
          }
        });

        return currentCol;
      };

      // 填充表头数据
      fillHeader(columns);

      return { headerRows, mergeInfos };
    },

    // 设置表头
    setColumns(worksheet) {
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
        worksheet.getRange(info.startRow, info.startCol, info.endRow - info.startRow + 1, info.endCol - info.startCol + 1).merge();
      });

      // 添加表头样式和保护
      const headerRange = worksheet.getRange(0, 0, headerRows.length, headerRows[0].length);

      // 使用配置中的样式
      if (this.mergedConfig.headerBackgroundColor) {
        headerRange.setBackgroundColor(this.mergedConfig.headerBackgroundColor)
      }
      if (this.mergedConfig.borderColor) {
        headerRange.setBorder(this.univerAPIInstance.Enum.BorderType.ALL, this.univerAPIInstance.Enum.BorderStyleTypes.THIN, this.mergedConfig.borderColor)
      }

      // 设置数据区域的行高
      const headerRowCount = headerRows.length;
      const totalRowCount = headerRowCount + this.data.length;
      for (let rowIndex = headerRowCount; rowIndex < totalRowCount; rowIndex++) {
        worksheet.setRowHeight(rowIndex, this.mergedConfig.defaultRowHeight);
      }

      // 设置列宽 - 使用扁平化后的列配置
      const flatColumns = this.flattenColumns(this.columns);
      flatColumns.forEach((column, index) => {
        // 优先使用配置的width，否则使用默认值
        const width = column.width || this.mergedConfig.defaultColumnWidth;
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
      const headerRowCount = this.getHeaderRowCount(this.columns)
      worksheet.setRowCount(headerRowCount + this.data.length);
      this.data.forEach((row, rowIndex) => {
        const flattenData = this.flattenRowData(row, this.columns)
        flattenData.forEach((value, colIndex) => {
          // 将单元格操作改为范围操作
          worksheet.getRange(rowIndex + headerRowCount, colIndex, 1, 1).setValue(value)
        })
      })
    },

    async setPermission(workbook, worksheet) {
      const setWorkbookPermission = () => {
        const workbookPermission = {
          WorkbookEditablePermission: true, // 能否编辑
          WorkbookPrintPermission: true, // 能否打印
          WorkbookCommentPermission: true, // 能否评论
          WorkbookViewPermission: true, // 能否查看
          WorkbookCopyPermission: true, // 能否复制
          WorkbookExportPermission: true, // 能否导出
          WorkbookManageCollaboratorPermission: false, // 能否管理协作者
          WorkbookCreateSheetPermission: false, // 能否创建工作表
          WorkbookDeleteSheetPermission: false, // 能否删除工作表
          WorkbookRenameSheetPermission: false, // 能否重命名工作表
          WorkbookHideSheetPermission: false, // 能否隐藏工作表
          WorkbookSharePermission: true, // 能否分享
          WorkbookMoveSheetPermission: false, // 能否移动工作表
        };
        Object.keys(workbookPermission).forEach((item, index) => {
          permission.setWorkbookPermissionPoint(unitId, permission.permissionPointsDefinition[item], workbookPermission[item])
        })
      }

      const setWorksheetPermission = async () => {
        const worksheetPermission = {
          WorksheetCopyPermission: true,
          WorksheetDeleteColumnPermission: false,
          WorksheetDeleteRowPermission: this.mergedConfig.allowDeleteRow,
          WorksheetFilterPermission: true,
          WorksheetInsertColumnPermission: false,
          WorksheetInsertHyperlinkPermission: true,
          WorksheetInsertRowPermission: this.mergedConfig.allowInsertRow,
          WorksheetPivotTablePermission: true,
          WorksheetSetCellStylePermission: true,
          WorksheetSetCellValuePermission: true,
          WorksheetSetColumnStylePermission: true,
          WorksheetSetRowStylePermission: true,
          WorksheetSortPermission: true,
          WorksheetViewPermission: true,
          WorksheetEditPermission: true
        };
        const worksheetPermissionId = await permission.addWorksheetBasePermission(unitId, subUnitId)
        permission.sheetRuleChangedAfterAuth$.subscribe((currentPermissionId) => {
          if (currentPermissionId === worksheetPermissionId) {
            Object.keys(worksheetPermission).forEach((item, index) => {
              permission.setWorksheetPermissionPoint(unitId, subUnitId, permission.permissionPointsDefinition[item], worksheetPermission[item])
            })
          }
        })
      }

      const setHeaderProtectionPermission = async () => {
        // 计算表头行数和列数
        const headerRowCount = this.getHeaderRowCount(this.columns);
        const flatColumns = this.flattenColumns(this.columns);
        const headerRange = worksheet.getRange(0, 0, headerRowCount, flatColumns.length);
        const res = await permission.addRangeBaseProtection(unitId, subUnitId, [headerRange])
        const rangeProtectionPermission = {
          RangeProtectionPermissionViewPoint: true, // 能否查看保护区域的内容
          RangeProtectionPermissionEditPoint: false // 能否编辑保护区域
        };
        const { permissionId: headerPermissionId, ruleId: headerRuleId } = res
        this.headerRuleId = headerRuleId
        permission.rangeRuleChangedAfterAuth$.subscribe((currentPermissionId) => {
          if (currentPermissionId === headerPermissionId) {
            Object.keys(rangeProtectionPermission).forEach((item, index) => {
              permission.setRangeProtectionPermissionPoint(unitId, subUnitId, headerPermissionId, permission.permissionPointsDefinition[item], rangeProtectionPermission[item])
            })
          }
        })
      }

      const unitId = workbook.getId();
      const subUnitId = worksheet.getSheetId();
      const permission = workbook.getPermission();

      setWorkbookPermission()
      await setWorksheetPermission()
      // await setHeaderProtectionPermission() // 报错sheet protection cannot intersect with range protection且如果设置选区后可能无法隐藏列
    },

    // 封装单元格操作工具方法
    getCellRange(worksheet, row, col) {
      return worksheet.getRange(row, col, 1, 1)
    },

    setCellValue(worksheet, row, col, value) {
      this.getCellRange(worksheet, row, col).setValue(value)
    },

    getCellValue(worksheet, row, col) {
      return this.getCellRange(worksheet, row, col).getValue()
    },

    // 展平行数据
    flattenRowData(row, columns, result = []) {
      columns.forEach(col => {
        if (col.children && col.children.length > 0) {
          this.flattenRowData(row, col.children, result)
        } else {
          result.push(row[col.prop] ?? '')
        }
      })
      return result
    },

    // 修复：获取列名（基于扁平化后的列配置）
    getColumnName(colIndex) {
      if (!this.currentTableColumns || !Array.isArray(this.currentTableColumns)) return '';

      const flatColumns = this.flattenColumns(this.currentTableColumns);
      // 添加边界检查
      if (colIndex < 0 || colIndex >= flatColumns.length) return '';

      return flatColumns[colIndex]?.prop || flatColumns[colIndex]?.dataIndex || '';
    },

    // 修复：扁平化列配置（处理嵌套结构）
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

    getCurrentTableData() {
      // 确保实例已初始化
      if (!this.univerAPIInstance || !this.isTableInitialized) {
        return this.currentTableData;
      }

      try {
        // 获取当前工作表
        const workbook = this.univerAPIInstance.getActiveWorkbook();
        const worksheet = workbook.getActiveSheet();

        // 计算表头行数
        const headerRowCount = this.getHeaderRowCount(this.currentTableColumns || this.columns);

        // 获取数据区域范围
        const lastRow = worksheet.getLastRow();
        const lastColumn = worksheet.getLastColumn();

        // 如果没有数据行，返回空数组
        if (lastRow < headerRowCount) {
          this.currentTableData = [];
          return [];
        }

        // 获取所有数据单元格的值
        const dataRange = worksheet.getRange(headerRowCount, 0, lastRow - headerRowCount + 1, lastColumn + 1);
        const dataValues = dataRange.getValues();

        // 获取扁平化后的列配置
        const flatColumns = this.flattenColumns(this.currentTableColumns || this.columns);

        // 转换为表格数据格式
        const newTableData = dataValues.map((row, rowIndex) => {
          const rowData = {};
          row.forEach((cellValue, colIndex) => {
            const column = flatColumns[colIndex];
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
    endEditing() {
      if (this.univerAPIInstance && this.isTableInitialized) {
        const workbook = this.univerAPIInstance.getActiveWorkbook()
        return workbook.endEditingAsync(true)
      }
    },
  },
  watch: {
    // 深度监听columns prop变化
    columns: {
      handler(newColumns, oldColumns) {
        if (!this.mergedConfig.autoRefreshOnPropChange) return
        if (this.univerAPIInstance && this.isTableInitialized) {
          this.currentTableColumns = this.column;
        }
        this.refreshTable(true)
      },
      deep: true,
      immediate: false
    },
    // 深度监听data prop变化
    data: {
      handler(newData, oldData) {
        if (!this.mergedConfig.autoRefreshOnPropChange) return
        if (this.univerAPIInstance && this.isTableInitialized) {
          this.currentTableData = this.data;
        }
        this.refreshTable()
      },
      deep: true,
      immediate: false
    },
    // 深度监听config prop变化
    mergedConfig: {
      handler(newVal, oldVal) {
        if (!this.mergedConfig.autoRefreshOnPropChange) return
        this.refreshTable()
      },
      deep: true,
      immediate: false
    }
  }
};
</script>

<style scoped>
.universheet-wrapper {
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