# Universheet 组件开发文档

基于 Element UI 设计风格的 Vue 表格组件，支持嵌套表头、单元格合并、数据双向绑定、细粒度权限控制，并对外暴露完整实例与生命周期钩子。

## 快速开始

### 1. 基本使用

```vue
<template>
  <Universheet
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
import Universheet from './universheet.vue';

export default {
  components: { Universheet },
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
        headerBackgroundColor: '#f5f5f5',
        sheetName: '示例表',
        borderColor: '#e4e7ed',
        allowInsertRow: true,
        allowDeleteRow: true,
        defaultRowHeight: 20,
        autoRefreshOnPropChange: false
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

### 2. 嵌套表头配置

支持多级嵌套表头，通过 `children` 属性实现，子列可单独设置宽度：

```javascript
columns: [
  { prop: 'group', label: '分组', width: 100 },
  { 
    prop: 'sample1', 
    label: '样本1',
    children: [
      { prop: 'sample1#value', label: '数值', width: 80 },
      { prop: 'sample1#code', label: '编码', width: 120 }
    ]
  }
]
```

### 3. 列宽与行高配置

支持以下尺寸设置：

- **列宽设置**：在列配置中使用 `width` 属性或通过 `config.defaultColumnWidth` 设置默认列宽
- **行高设置**：通过 `config.defaultRowHeight` 设置默认行高

优先级：列配置的 `width` > `config.defaultColumnWidth`

### 4. 样式与权限配置

通过 `config` 对象可以自定义表格样式与交互权限：

```javascript
config: {
  defaultColumnWidth: 80,           // 默认列宽
  defaultRowHeight: 20,             // 默认行高
  headerBackgroundColor: '#cfe2f3', // 表头背景色
  borderColor: '#000000',           // 边框颜色
  sheetName: '示例表',              // 工作表名称
  allowInsertRow: true,             // 是否允许插入行
  allowDeleteRow: true,             // 是否允许删除行
  autoRefreshOnPropChange: false,   // 属性变化时是否自动刷新
  styleOptions: {                   // 容器样式
    width: '100%',
    height: '500px'
  },
  messages: {                       // 提示信息配置
    insertRowError: '表头区域不可插入行',
    deleteRowError: '表头行不可删除'
    // 更多提示信息见配置项说明
  }
}
```

- 颜色值若设为空字符串 `''` 则不应用对应样式。

### 5. 数据格式要求

数据字段名必须与 `columns` 中的 `prop` 完全一致：

```javascript
tableData: [
  {
    group: 'A组',
    'sample1#value': 23.5,
    'sample1#code': 'A001'
  }
]
```

### 6. 对外暴露的实例与 API

组件通过事件参数向外暴露完整能力：

```javascript
handleDataInitialized(exposed) {
  const { attributes, methods } = exposed;
  const { univerInstance, univerAPIInstance } = attributes;
  const { getCurrentTableData, refreshTable } = methods;

  // 示例：获取当前完整数据
  const data = getCurrentTableData();

  // 示例：使用底层 API 设置单元格
  univerAPIInstance
    .getActiveWorkbook()
    .getActiveSheet()
    .getRange(0, 0)
    .setValue('Hello Universheet');
}
```

## API 参考

### Props

| 参数 | 说明 | 类型 | 默认值 | 必填 |
|------|------|------|--------|------|
| columns | 列配置数组 | Array | - | 是 |
| data | 表格数据数组 | Array | [] | 是 |
| config | 样式与权限配置对象 | Object | 见下方 | 否 |

#### Config 配置项

| 参数 | 说明 | 类型 | 默认值 |
|------|------|------|--------|
| defaultColumnWidth | 默认列宽（像素） | Number | 80 |
| defaultRowHeight | 默认行高（像素） | Number | 20 |
| headerBackgroundColor | 表头背景色 | String | '#cfe2f3' |
| borderColor | 边框颜色 | String | '#000000' |
| sheetName | 工作表名称 | String | 'Sheet' |
| allowInsertRow | 是否允许插入行 | Boolean | true |
| allowDeleteRow | 是否允许删除行 | Boolean | true |
| autoRefreshOnPropChange | 属性变化时是否自动刷新 | Boolean | false |
| styleOptions | 容器样式设置 | Object | { width: '100%', height: '500px' } |
| messages.insertRowError | 表头区域插入行错误提示 | String | '表头区域不可插入行' |
| messages.deleteRowError | 删除表头行错误提示 | String | '表头行不可删除' |
| messages.autoFillFromHeaderError | 从表头自动填充错误提示 | String | '不可从表头行开始自动填充' |
| messages.autoFillToHeaderError | 填充至表头错误提示 | String | '不可填充至表头行' |
| messages.mergeCellError | 合并单元格错误提示 | String | '不支持合并单元格' |
| messages.unmergeCellError | 取消合并单元格错误提示 | String | '不支持取消单元格合并' |
| messages.moveHeaderError | 移动表头错误提示 | String | '表头行不可移动' |
| messages.moveToHeaderError | 移动至表头错误提示 | String | '不可移动内容至表头区域' |
| messages.copyHeaderError | 复制表头错误提示 | String | '表头行不可复制' |

### Events

| 事件名 | 触发时机 | 回调参数 |
|--------|----------|----------|
| updateData | 单元格数据变更 | `{ changedRow, changedRowIndex, changedColumn, changedColumnIndex, oldValue, newVal, currentTableData, exposed }` |
| tableInitialized | 表格首次渲染完成 | `exposed` |
| tableRefreshed | 数据或配置重新加载完成 | `exposed` |
| insertRow | 插入行操作完成 | `{ insertRows, insertRowStartIndex, insertRowEndIndex, currentTableData, exposed }` |
| deleteRow | 删除行操作完成 | `{ deleteRows, deleteRowStartIndex, deleteRowEndIndex, currentTableData, exposed }` |

### 回调参数详情

#### updateData 回调参数

| 字段 | 说明 |
|------|------|
| changedRow | 变更后的行数据 |
| changedRowIndex | 数据行索引（已自动减去表头行） |
| changedColumn | 变更的列名 |
| changedColumnIndex | 列索引 |
| oldValue | 旧值 |
| newVal | 新值 |
| currentTableData | 完整表格数据 |
| exposed | 暴露对象 `{ attributes: { univerInstance, univerAPIInstance }, methods: { getCurrentTableData, refreshTable } }` |

#### insertRow 回调参数

| 字段 | 说明 |
|------|------|
| insertRows | 插入的行数据数组 |
| insertRowStartIndex | 插入行的起始索引 |
| insertRowEndIndex | 插入行的结束索引 |
| currentTableData | 更新后的完整表格数据 |
| exposed | 暴露对象 |

#### deleteRow 回调参数

| 字段 | 说明 |
|------|------|
| deleteRows | 删除的行数据数组 |
| deleteRowStartIndex | 删除行的起始索引 |
| deleteRowEndIndex | 删除行的结束索引 |
| currentTableData | 更新后的完整表格数据 |
| exposed | 暴露对象 |

### exposed 对象说明

| 字段 | 说明 |
|------|------|
| attributes.univerInstance | Univer 原始实例 |
| attributes.univerAPIInstance | Univer API 封装实例 |
| methods.getCurrentTableData | 获取当前完整表格数据 |
| methods.refreshTable | 刷新表格数据与配置 |

## 注意事项

1. **列名匹配**：数据字段名必须与 `columns` 中的 `prop` 完全一致
2. **嵌套表头**：子列的宽度设置仅在子列配置中生效
3. **性能优化**：避免频繁修改 `columns`、`data` 和 `config`，这会导致表格重新渲染
4. **表头操作限制**：表头区域默认不可编辑、不可移动、不可复制
5. **单元格操作限制**：默认禁止合并和取消合并单元格操作
6. **自动填充限制**：不可从表头开始自动填充，也不可填充到表头区域