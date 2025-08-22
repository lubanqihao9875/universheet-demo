export function deepEqual(obj1, obj2) {
  // 通过检查是否有差异来判断是否深度相等
  return findDifferences(obj1, obj2).length === 0;
}

export function findDifferences(obj1, obj2, path = '') {
  // 检查值是否为空
  function isAllEmpty(value) {
    if (value === null || value === undefined || value === "") return true;
    if (Array.isArray(value)) return value.every(item => isAllEmpty(item));
    if (typeof value === 'object') {
      const keys = Object.keys(value);
      return keys.length === 0 || keys.every(key => isAllEmpty(value[key]));
    }
    return false;
  }

  // 标准化值以便比较
  function normalizeValue(value) {
    return isAllEmpty(value) ? "" : 
           (typeof value === "number" || typeof value === "string") ? String(value) : value;
  }

  const differences = [];
  
  // 都是空值则无差异
  if (isAllEmpty(obj1) && isAllEmpty(obj2)) return differences;
  
  // 标准化后的值相同则无差异
  const normalized1 = normalizeValue(obj1);
  const normalized2 = normalizeValue(obj2);
  if (normalized1 === normalized2) return differences;
  
  // 非对象类型的差异
  if (obj1 === null || obj2 === null || typeof obj1 !== 'object' || typeof obj2 !== 'object') {
    return [{ path, original: obj1, current: obj2 }];
  }
  
  // 日期差异
  if (obj1 instanceof Date && obj2 instanceof Date) {
    return obj1.getTime() !== obj2.getTime() ? [{
      path,
      original: obj1.toISOString(),
      current: obj2.toISOString()
    }] : [];
  }
  
  // 数组差异
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    const maxLength = Math.max(obj1.length, obj2.length);
    for (let i = 0; i < maxLength; i++) {
      differences.push(...findDifferences(obj1[i], obj2[i], `${path}[${i}]`));
    }
    return differences;
  }
  
  // 对象差异
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  const allKeys = [...new Set([...keys1, ...keys2])];
  
  for (const key of allKeys) {
    const newPath = path ? `${path}.${key}` : key;
    const value1 = obj1[key];
    const value2 = obj2[key];
    
    // 一方不存在但另一方为空值，无差异
    if ((!keys1.includes(key) && isAllEmpty(value2)) || 
        (!keys2.includes(key) && isAllEmpty(value1))) {
      continue;
    }
    
    // 属性存在性差异
    if (!keys1.includes(key)) {
      differences.push({ path: newPath, original: '属性不存在', current: value2 });
      continue;
    }
    if (!keys2.includes(key)) {
      differences.push({ path: newPath, original: value1, current: '属性不存在' });
      continue;
    }
    
    // 递归查找值差异
    differences.push(...findDifferences(value1, value2, newPath));
  }
  
  return differences;
}
