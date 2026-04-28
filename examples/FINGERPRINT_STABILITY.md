# 指纹值不一致的原因分析

## 可能的原因

### 1. 时间戳变化

指纹对象包含 `timestamp` 字段，每次采集都会更新：

```javascript
{
  version: 'lite',
  timestamp: Date.now(),  // ← 这个每次都会变
  collectionTime: 234.5,
  // ...
}
```

**影响**: 指纹 ID 会因此不同

**解决**: 生成指纹 ID 时排除时间戳字段

### 2. 某些 API 本身就不稳定

以下维度在不同时间采集可能返回不同值：

| 维度 | 不稳定原因 |
|------|----------|
| `performance.now()` | 每次调用都不同 |
| `Date.now()` / `timezone` | 时间变化 |
| `offlineAudioContext` | 音频噪声有微小差异 |
| `canvas2d` / `canvasWebgl` | GPU 状态变化可能导致像素差异 |
| `fonts` | 字体异步加载，可能采集时状态不同 |

### 3. 缓存未生效

如果缓存机制没有正常工作，每次都会重新采集：

```javascript
// 检查缓存是否生效
const cached = localStorage.getItem('creepjs_lite_fingerprint')
if (cached) {
  const { timestamp, fingerprint } = JSON.parse(cached)
  console.log('缓存时间:', new Date(timestamp))
  console.log('距离现在:', Date.now() - timestamp, 'ms')
}
```

**缓存失效的原因**:
- localStorage 被清除
- 缓存 TTL 过期（默认 30 分钟）
- 使用了无痕模式
- localStorage 被禁用

### 4. 浏览器状态变化

- 安装了新字体
- 浏览器窗口大小改变
- 系统主题变化（亮/暗模式）
- 插件启用/禁用
- WebGL 上下文重置

### 5. 采集顺序影响

并行采集时，Promise 的完成顺序可能影响最终对象的属性顺序，从而影响哈希值。

## 如何验证

### 测试 1: 检查缓存是否生效

```javascript
// 连续调用两次
const fp1 = await window.CreepLite({ cacheEnabled: true })
const fp2 = await window.CreepLite({ cacheEnabled: true })

console.log('指纹 1 ID:', fp1.fingerprintId)
console.log('指纹 2 ID:', fp2.fingerprintId)
console.log('是否相同:', fp1.fingerprintId === fp2.fingerprintId)
console.log('采集时间:', fp1.collectionTime, fp2.collectionTime)

// 如果第二次很快（<10ms），说明缓存生效
```

### 测试 2: 清除缓存后重新采集

```javascript
// 清除缓存
localStorage.removeItem('creepjs_lite_fingerprint')

// 重新采集
const fp = await window.CreepLite({ 
  cacheEnabled: true,
  cacheTTL: 1800000 
})

console.log('新指纹:', fp.fingerprintId)
```

### 测试 3: 检查哪些字段在变化

```javascript
// 采集两次
const fp1 = await window.CreepLite({ cacheEnabled: false })
const fp2 = await window.CreepLite({ cacheEnabled: false })

// 对比差异
function findDifferences(obj1, obj2, path = '') {
  const diffs = []
  for (const key in obj1) {
    const currentPath = path ? `${path}.${key}` : key
    if (typeof obj1[key] === 'object' && obj1[key] !== null) {
      if (obj2[key] && typeof obj2[key] === 'object') {
        diffs.push(...findDifferences(obj1[key], obj2[key], currentPath))
      } else {
        diffs.push({ path: currentPath, value1: obj1[key], value2: obj2[key] })
      }
    } else if (obj1[key] !== obj2[key]) {
      diffs.push({ path: currentPath, value1: obj1[key], value2: obj2[key] })
    }
  }
  return diffs
}

const diffs = findDifferences(fp1, fp2)
console.log('差异字段:', diffs)
```

## 解决方案

### 方案 1: 启用并延长缓存

```javascript
const fp = await window.CreepLite({
  cacheEnabled: true,
  cacheTTL: 3600000, // 1 小时
})
```

### 方案 2: 使用稳定的字段生成 ID

修改 `src/creep-lite.ts`，生成指纹 ID 时只使用稳定的字段：

```typescript
// 只使用稳定的字段生成 ID
const stableFields = [
  fingerprint.navigator?.$hash,
  fingerprint.screen?.$hash,
  fingerprint.canvas2d?.$hash,
  fingerprint.canvasWebgl?.$hash,
  fingerprint.timezone?.$hash,
  fingerprint.fonts?.$hash,
].filter(Boolean)

const fingerprintId = await hashify(stableFields.join('|'))
```

### 方案 3: 移除时间戳字段

```typescript
const fingerprint = {
  version: 'lite',
  // timestamp: Date.now(),  // 注释掉这个
  collectionTime: fingerprintTimeEnd,
  // ...
}
```

### 方案 4: 后端去重

在后端 API 中，对同一浏览器的多次请求进行去重，只记录首次指纹。

## 期望的行为

**正常情况下**：

- ✅ 同一浏览器、短时间内（缓存 TTL 内）：**指纹 ID 应该相同**
- ✅ 同一浏览器、长时间后：**可能不同**（缓存过期重新采集）
- ✅ 不同浏览器：**指纹 ID 应该不同**
- ✅ 清除缓存后：**指纹 ID 可能不同**（如果某些特性不稳定）

## 调试命令

在浏览器控制台执行：

```javascript
// 查看缓存
console.log(JSON.parse(localStorage.getItem('creepjs_lite_fingerprint')))

// 清除缓存
localStorage.removeItem('creepjs_lite_fingerprint')

// 测试指纹稳定性
async function testStability() {
  const fps = []
  for (let i = 0; i < 5; i++) {
    const fp = await window.CreepLite({ cacheEnabled: false })
    fps.push(fp.fingerprintId)
    console.log(`采集 ${i + 1}:`, fp.fingerprintId)
  }
  const unique = new Set(fps)
  console.log(`5 次采集，${unique.size} 个不同的指纹`)
  return unique.size === 1 ? '✅ 稳定' : '❌ 不稳定'
}
testStability()
```

## 结论

如果指纹值不一致，**最常见的原因是**：

1. **缓存未生效** - 检查 localStorage 是否有值
2. **时间戳字段** - 每次采集都会变化
3. **某些维度本身不稳定** - Audio、Canvas 等

**建议**：启用缓存 + 使用稳定字段生成 ID
