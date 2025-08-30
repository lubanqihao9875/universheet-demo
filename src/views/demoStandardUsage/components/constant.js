const LIST = [
  {
    prop: "id",
    label: "id",
    width: 100,
    editor: {
      type: 'readonly'
    }
  },
  {
    label: '检验组',
    prop: 'itemGroupName',
    width: 120,
    editor: {
      type: 'readonly'
    }
  },
  {
    prop: 'itemId',
    label: '检验项目id',
    width: 100,
    editor: {
      type: 'readonly'
    }
  },
  {
    label: '检验项目',
    prop: 'itemName',
    width: 300,
    editor: {
      type: 'readonly'
    }
  },
  {
    label: '检验标准',
    prop: 'inspectStandard',
    width: 100,
    editor: {
      type: 'readonly'
    }
  },
  {
    label: '分析方法',
    prop: 'analyzeMethodName',
    editor: {
      type: 'readonly'
    }
  },
  {
    label: '判定',
    prop: 'checkResult',
    width: 100,
    editor: {
      type: 'select',
      options: ['合格', '不合格']
    }
  },
  {
    label: '实际样本数',
    prop: 'actualQuality'
  },
  {
    label: '检验条件',
    prop: 'inspectionCondition',
    editor: {
      type: 'readonly'
    }
  },
  {
    label: '单位',
    prop: 'unit',
    editor: {
      type: 'readonly'
    }
  },
  {
    label: '参考值',
    prop: 'referenceValue',
    editor: {
      type: 'readonly'
    }
  },
  {
    label: '比较符',
    prop: 'comparator',
    editor: {
      type: 'readonly'
    }
  },
  {
    label: '上限值',
    prop: 'upperLimitValue',
    editor: {
      type: 'readonly'
    }
  },
  {
    label: '下限值',
    prop: 'downLimitValue',
    editor: {
      type: 'readonly'
    }
  },
  {
    label: '上公差',
    prop: 'upperTolerance',
    editor: {
      type: 'readonly'
    }
  },
  {
    label: '下公差',
    prop: 'lowerTolerance',
    editor: {
      type: 'readonly'
    }
  },
  {
    label: '抽样方案',
    prop: 'samplePlanName',
    editor: {
      type: 'select',
      options: ['全抽']
    }
  },
  {
    label: '抽样类型',
    prop: 'sampleType',
    editor: {
      type: 'readonly'
    }
  },
  {
    label: '检验水平',
    prop: 'inspectLevel',
    editor: {
      type: 'readonly'
    }
  },
  {
    label: '严格度',
    prop: 'stringencyName',
    editor: {
      type: 'readonly'
    }
  },
  {
    label: 'AQL',
    prop: 'aqlValue',
    editor: {
      type: 'readonly'
    }
  },
  {
    label: '允收数',
    prop: 'acceptValue',
    editor: {
      type: 'readonly'
    }
  },
  {
    label: '拒收数',
    prop: 'refuseValue',
    editor: {
      type: 'readonly'
    }
  },
  {
    label: '抽样数量',
    prop: 'samplingQuantity'
  }
]

export { LIST }