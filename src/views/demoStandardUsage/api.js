const res = [
  {
    "id": 15590,
    "itemName": "123",
    "itemGroupName": "测试",
    "itemValues": [
      {
        "id": 47,
        "numItemId": 15590,
        "inspectValue": "1",
        "checkConclusion": "1",
        "sampleIdentification": "样本标识1"
      },
      {
        "id": 48,
        "numItemId": 15590,
        "inspectValue": "2",
        "checkConclusion": "0",
        "sampleIdentification": "样本标识2"
      }
    ]
  },
  {
    "id": 15591,
    "itemName": "4005唱盘测试",
    "itemGroupName": "唱盘测试",
    "itemValues": [
      {
        "id": 42,
        "numItemId": 15591,
        "inspectValue": "",
        "checkConclusion": "1",
        "sampleIdentification": undefined
      }
    ]
  },
  {
    "id": 15592,
    "itemName": "AM状态主机面板功能按键操作测试",
    "itemGroupName": "AM测试",
    "itemValues": [
      {
        "id": 43,
        "numItemId": 15592,
        "inspectValue": "",
        "checkConclusion": "1",
        "sampleIdentification": "标识1"
      }
    ]
  },
  {
    "id": 15593,
    "itemName": "AM频率范围",
    "itemGroupName": "AM测试",
    "itemValues": [
      {
        "id": 44,
        "numItemId": 15593,
        "inspectValue": null,
        "checkConclusion": "1",
        "sampleIdentification": undefined
      },
      {
        "id": 45,
        "numItemId": 15593,
        "inspectValue": null,
        "checkConclusion": "0",
        "sampleIdentification": undefined
      },
      {
        "id": 46,
        "numItemId": 15593,
        "inspectValue": null,
        "checkConclusion": "1",
        "sampleIdentification": undefined
      }
    ]
  }
];

// 异步获取接口数据
export async function fetchInspectionData() {
  // 直接返回筛选后的res数据
  return res;
}
