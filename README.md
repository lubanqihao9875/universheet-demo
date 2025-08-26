# Lubanno7UniverSheet 组件开发文档

基于 Element UI 设计风格的 Vue 表格组件，支持嵌套表头、单元格编辑、数据双向绑定、细粒度权限控制，并对外暴露完整实例与生命周期钩子。

## 快速开始

### 1. 基本使用

```javascript
<template>
  <Lubanno7UniverSheet
    :columns="columns"
    :data="tableData"
    :config="config"
    @updateData="handleDataChange"
    @tableInitialized="handleTableInitialized"
    @tableRefreshed="handleTableUpdated"
    @insertRow="handleInsertRow"
    @deleteRow="handleDeleteRow"
  />
</template>

<script>
import Lubanno7UniverSheet from './Lubanno7UniverSheet.vue';

export default {
  components: { Lubanno7UniverSheet },
  data() {
    return {
      columns: [
        { prop: 'name', label: '姓名', width: 120 },
        { prop: 'age', label: '年龄', width: 80 }
      ],
      tableData: [
        { name: '张三', age: 25 },
        { name: '李四', age: 30 }
      ],
      config: {
        defaultColumnWidth: 100,
        sheetName: '示例表',
        allowInsertRow: true,
        allowDeleteRow: true,
        defaultRowHeight: 20,
        autoRefreshOnPropChange: false,
        headerStyle: {
          backgroundColor: '#f5f5f5',
          borderColor: '#e4e7ed'
        }
      }
    };
  },
  methods: {
    handleDataChange({ changedRow, changedRowIndex, changedColumn, oldValue, newVal, currentTableData, exposed: { attributes, methods } }) {
      console.log('数据已更新:', changedColumn, '从', oldValue, '变为', newVal);
      this.tableData = currentTableData; // 同步更新父组件数据
    },
    handleTableInitialized({ attributes, methods }) {
      console.log('表格已渲染完成，实例已暴露');
      // 通过 attributes.univerAPIInstance 可以调用底层 API
      // 通过 methods.getCurrentTableData 可以立即获取全量数据
    },
    handleTableUpdated({ attributes, methods }) {
      console.log('配置或数据已重新加载');
    },
    handleInsertRow({ insertRows, insertRowStartIndex, insertRowEndIndex, currentTableData }) {
      console.log('插入了', insertRows.length, '行数据');
      this.tableData = currentTableData;
    },
    handleDeleteRow({ deleteRows, deleteRowStartIndex, deleteRowEndIndex, currentTableData }) {
      console.log('删除了', deleteRows.length, '行数据');
      this.tableData = currentTableData;
    }
  }
};
</script>

```

### 2. 表格表头配置

支持**基础单层表头**与**多级嵌套表头**两种配置；需注意：**列宽和只读列仅支持在叶子节点（最末级列）配置**，非叶子节点（父级表头列）不支持列宽和只读设置。

#### 示例 1：基础单层表头

适用于无层级关系的简单表头，直接通过列的`editor: { type: 'readonly' }`将指定列设为只读：

```javascript
columns: [
  { 
    prop: 'id', 
    label: 'ID', 
    width: 80,
    editor: { type: 'readonly' } // 叶子节点（单层列）支持设置只读
  },
  { prop: 'name', label: '姓名', width: 120 }, // 可编辑列
  { prop: 'age', label: '年龄', width: 80 },    // 可编辑列
  { 
    prop: 'registerTime', 
    label: '注册时间', 
    width: 160,
    editor: { type: 'readonly' } // 另一叶子节点设置只读
  }
]

```

#### 示例 2：多级嵌套表头

适用于有层级归类的复杂表头，通过`children`属性实现嵌套，仅最末级叶子节点可配置只读：

```javascript
columns: [
  { 
    prop: 'userBase', 
    label: '用户基础信息', // 非叶子节点（父级），不支持只读配置
    children: [
      { 
        prop: 'userBase#id', 
        label: '用户ID', 
        width: 100,
        editor: { type: 'readonly' } // 叶子节点，支持只读
      },
      { prop: 'userBase#name', label: '姓名', width: 120 } // 叶子节点，可编辑
    ]
  },
  { 
    prop: 'orderInfo', 
    label: '订单信息', // 非叶子节点（父级），不支持只读配置
    children: [
      { prop: 'orderInfo#price', label: '订单金额', width: 120 }, // 叶子节点，可编辑
      { 
        prop: 'orderInfo#status', 
        label: '订单状态', 
        width: 100,
        editor: { type: 'readonly' } // 叶子节点，支持只读
      },
      { 
        prop: 'orderInfo#createTime', 
        label: '创建时间', 
        width: 180,
        editor: { type: 'readonly' } // 叶子节点，支持只读
      }
    ]
  }
]

```

### 3. 列宽与行高配置

支持以下尺寸设置：

*   **列宽设置**：在列配置中使用 `width` 属性或通过 `config.defaultColumnWidth` 设置默认列宽
*   **行高设置**：通过 `config.defaultRowHeight` 设置默认行高

\
优先级：列配置的 `width` > `config.defaultColumnWidth`

### 4. 样式与权限配置

通过 `config` 对象可以自定义表格样式与交互权限：

```javascript
config: {
  defaultColumnWidth: 80,           // 默认列宽
  defaultRowHeight: 20,             // 默认行高
  sheetName: '示例表',              // 工作表名称
  allowInsertRow: true,             // 是否允许插入行
  allowDeleteRow: true,             // 是否允许删除行
  autoRefreshOnPropChange: false,   // 属性变化时是否自动刷新
  loadingMaskColor: '#3498db',      // 加载遮罩中旋转动画的颜色
  loadingMessage: '数据加载中...',  // 加载遮罩中显示的文本
  styleOptions: {                   // 容器样式
    width: '100%',
    height: '500px'
  },
  headerStyle: {                    // 表头样式
    backgroundColor: '#cfe2f3',
    fontWeight: 'bold',
    borderColor: '#ccc'
  },
  readonlyCellStyle: {              // 只读单元格样式
    backgroundColor: '#eee',
    fontWeight: 'bold',
    borderColor: '#ccc'
  },
  messages: {                       // 提示信息配置
    insertRowError: '表头区域不可插入行',
    deleteRowError: '表头行不可删除',
    // 更多提示信息见配置项说明
  }
}

```

*   颜色值若设为空字符串 `''` 则不应用对应样式。

### 5. 数据格式要求

表格数据的字段名需与叶子节点`prop`完全一致，示例 2 对应的数据格式如下：

```javascript
tableData: [
  {
    'userBase#id': 'U001',    // 对应只读列
    'userBase#name': '张三',  // 对应可编辑列
    'orderInfo#price': 299,   // 对应可编辑列
    'orderInfo#status': '已支付', // 对应只读列
    'orderInfo#createTime': '2024-01-01 10:30' // 对应只读列
  },
  {
    'userBase#id': 'U002',
    'userBase#name': '李四',
    'orderInfo#price': 599,
    'orderInfo#status': '待发货',
    'orderInfo#createTime': '2024-01-02 14:15'
  }
]

```

### 6. 对外暴露的实例与 API

组件通过事件参数向外暴露完整能力：

```javascript
handleDataInitialized(exposed) {
  const { attributes, methods } = exposed;
  const { univerInstance, univerAPIInstance } = attributes;
  const { getCurrentTableData, refreshTable, endEditing } = methods;

  // 示例：获取当前完整数据
  const data = getCurrentTableData();

  // 示例：刷新表格数据
  refreshTable();

  // 示例：结束编辑状态
  endEditing();

  // 示例：使用底层 API 设置单元格
  univerAPIInstance
    .getActiveWorkbook()
    .getActiveSheet()
    .getRange(0, 0)
    .setValue('Hello Lubanno7UniverSheet');
}

```

## API 参考

### Props

| 参数      | 说明        | 类型     | 默认值 | 必填 |
| :------ | :-------- | :----- | :-- | :- |
| columns | 列配置数组     | Array  | -   | 是  |
| data    | 表格数据数组    | Array  | \[] | 是  |
| config  | 样式与权限配置对象 | Object | 见下方 | 否  |

### Config 配置项

| 参数                      | 说明                                                   | 类型      | 默认值                                                                     |
| :---------------------- | :--------------------------------------------------- | :------ | :---------------------------------------------------------------------- |
| defaultColumnWidth      | 默认列宽（像素）                                             | Number  | 80                                                                      |
| defaultRowHeight        | 默认行高（像素）                                             | Number  | 20                                                                      |
| sheetName               | 工作表名称                                                | String  | 'Sheet'                                                                 |
| allowInsertRow          | 是否允许插入行                                              | Boolean | true                                                                    |
| allowDeleteRow          | 是否允许删除行                                              | Boolean | true                                                                    |
| autoRefreshOnPropChange | 属性变化时是否自动刷新                                          | Boolean | false                                                                   |
| loadingMaskColor        | 加载遮罩中旋转动画的颜色                                         | String  | '#3498db'                                                               |
| loadingMessage          | 加载遮罩中显示的文本                                           | String  | ' 数据加载中...'                                                             |
| styleOptions            | 容器样式设置                                               | Object  | { width: '100%', height: '500px' }                                      |
| headerStyle             | 表头样式设置（包含 backgroundColor、fontWeight、borderColor）    | Object  | { backgroundColor: '#cfe2f3', fontWeight: 'bold', borderColor: '#ccc' } |
| readonlyCellStyle       | 只读单元格样式设置（包含 backgroundColor、fontWeight、borderColor） | Object  | { backgroundColor: '#eee', fontWeight: 'bold', borderColor: '#ccc' }    |
| messages                | 各类操作的提示信息配置对象                                        | Object  | 见下方详细说明                                                                 |

#### messages 配置项详情

| 参数                        | 说明                 | 默认值                |
| :------------------------ | :----------------- | :----------------- |
| insertRowError            | 表头区域插入行错误提示        | ' 表头区域不可插入行'       |
| deleteRowError            | 删除表头行错误提示          | ' 表头行不可删除'         |
| autoFillFromHeaderError   | 从表头行开始自动填充错误提示     | ' 不可从表头行开始自动填充'    |
| autoFillToHeaderError     | 填充至表头行错误提示         | ' 不可填充至表头行'        |
| mergeCellError            | 合并单元格错误提示          | ' 不支持合并单元格'        |
| unmergeCellError          | 取消单元格合并错误提示        | ' 不支持取消单元格合并'      |
| moveHeaderError           | 移动表头行错误提示          | ' 表头行不可移动'         |
| moveToHeaderError         | 移动内容至表头区域错误提示      | ' 不可移动内容至表头区域'     |
| copyHeaderError           | 复制表头行错误提示          | ' 表头行不可复制'         |
| readonlyCellAutoFillError | 区域包含只读单元格时自动填充错误提示 | ' 区域包含只读单元格无法自动填充' |
| readonlyCellMoveError     | 区域包含只读单元格时移动数据错误提示 | ' 区域包含只读单元格无法移动数据' |

### Events

| 事件名              | 触发时机        | 回调参数                                                                                                              |
| :--------------- | :---------- | :---------------------------------------------------------------------------------------------------------------- |
| updateData       | 单元格数据变更     | `{ changedRow, changedRowIndex, changedColumn, changedColumnIndex, oldValue, newVal, currentTableData, exposed }` |
| tableInitialized | 表格首次渲染完成    | `exposed`                                                                                                         |
| tableRefreshed   | 数据或配置重新加载完成 | `exposed`                                                                                                         |
| insertRow        | 插入行操作完成     | `{ insertRows, insertRowStartIndex, insertRowEndIndex, currentTableData, exposed }`                               |
| deleteRow        | 删除行操作完成     | `{ deleteRows, deleteRowStartIndex, deleteRowEndIndex, currentTableData, exposed }`                               |

### 回调参数详情

#### updateData 回调参数

| 字段                 | 说明                                                                                                                       |
| :----------------- | :----------------------------------------------------------------------------------------------------------------------- |
| changedRow         | 变更后的行数据                                                                                                                  |
| changedRowIndex    | 数据行索引（已自动减去表头行）                                                                                                          |
| changedColumn      | 变更的列名                                                                                                                    |
| changedColumnIndex | 列索引                                                                                                                      |
| oldValue           | 旧值                                                                                                                       |
| newVal             | 新值                                                                                                                       |
| currentTableData   | 完整表格数据                                                                                                                   |
| exposed            | 暴露对象 `{ attributes: { univerInstance, univerAPIInstance }, methods: { getCurrentTableData, refreshTable, endEditing } }` |

#### insertRow 回调参数

| 字段                  | 说明         |
| :------------------ | :--------- |
| insertRows          | 插入的行数据数组   |
| insertRowStartIndex | 插入行的起始索引   |
| insertRowEndIndex   | 插入行的结束索引   |
| currentTableData    | 更新后的完整表格数据 |
| exposed             | 暴露对象       |

#### deleteRow 回调参数

| 字段                  | 说明         |
| :------------------ | :--------- |
| deleteRows          | 删除的行数据数组   |
| deleteRowStartIndex | 删除行的起始索引   |
| deleteRowEndIndex   | 删除行的结束索引   |
| currentTableData    | 更新后的完整表格数据 |
| exposed             | 暴露对象       |

### exposed 对象说明

| 字段                           | 说明                                       |
| :--------------------------- | :--------------------------------------- |
| attributes.univerInstance    | Univer 原始实例                              |
| attributes.univerAPIInstance | Univer API 封装实例                          |
| attributes.defaultConfig     | 组件默认配置                                   |
| methods.getCurrentTableData  | 获取当前完整表格数据                               |
| methods.refreshTable | 刷新表格数据与配置，参数 recreate 控制是否销毁并重建组件 |
| methods.endEditing           | 结束所有单元格的编辑状态，返回 Promise                  |

## 注意事项

1.  **列名匹配**：数据字段名必须与 `columns` 中的 `prop` 完全一致
2.  **嵌套表头**：子列的宽度设置仅在子列配置中生效
3.  **性能优化**：避免频繁修改 `columns`、`data` 和 `config`，这会导致表格重新渲染
4.  **表头操作限制**：表头区域默认不可编辑、不可移动、不可复制
5.  **单元格操作限制**：默认禁止合并和取消合并单元格操作
6.  **自动填充限制**：不可从表头开始自动填充，也不可填充到表头区域
7.  **只读单元格**：通过设置列的 `editor: { type: 'readonly' }` 可将整列设为只读
8.  **样式继承**：表头样式和只读单元格样式支持 backgroundColor、fontWeight 和 borderColor 属性
9.  **权限控制**：通过 `allowInsertRow` 和 `allowDeleteRow` 可控制行操作权限
10. **自动刷新**：`autoRefreshOnPropChange` 设为 true 时，修改 props 会自动刷新表格