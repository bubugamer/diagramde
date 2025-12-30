
## **0. 设计原则（先立边界）**

1. **版本即能力**：所有渲染行为必须绑定明确版本
    
2. **不可复现 = Bug**：任何渲染必须可 Snapshot 化
    
3. **前后端职责清晰**：
    
    - Mermaid：前端
        
    - PlantUML：后端
        
    
4. **错误优于结果**：错误必须结构化、完整保留 raw
    

---

## **1. 总体架构**

```
┌──────────────┐
│  Web Frontend│
│ (Editor/UI)  │
└──────┬───────┘
       │ Mermaid Render (In-Browser)
       │
       │ HTTP (Render Request)
       ▼
┌────────────────────┐
│ PlantUML Renderer  │
│ (Versioned Service)│
└────────────────────┘
```

### **技术定位**

|**层**|**职责**|
|---|---|
|Frontend|编辑 / 多版本加载 / 对比 / Snapshot|
|Backend|PlantUML 多版本渲染 / 安全隔离|
|Snapshot|纯 JSON，可导入导出|

---

## **2. 前端详细设计**

  

### **2.1 技术选型（建议）**

- 构建：Vite
    
- UI：Vue
    
- 编辑器：
    
    - Monaco Editor（推荐）
        
    - 退化方案：CodeMirror
        
    

---

### **2.2 Mermaid 多版本加载机制（关键）**

  

#### **设计目标**

- 同一页面共存多个 Mermaid 版本
    
- 不污染全局对象
    
- 支持离线
    

  

#### **方案：**

#### **动态模块隔离加载**

```
/mermaid/
  /8.4.8/mermaid.esm.js
  /9.4.3/mermaid.esm.js
  /10.6.0/mermaid.esm.js
```

```
async function loadMermaid(version: string) {
  return await import(`/mermaid/${version}/mermaid.esm.js`)
}
```

- 每个版本：
    
    - 独立 module scope
        
    - 独立初始化 mermaid.initialize()
        
    
- Render 时绑定版本实例
    

---

### **2.3 前端状态模型**

```
type DiagramState = {
  diagramType: 'mermaid' | 'plantuml'
  source: string
  mode: 'single' | 'compare'
}

type RenderTarget = {
  version: string
  status: 'idle' | 'success' | 'error'
  svg?: string
  error?: RenderError
}
```

Compare 模式下：

```
{
  left: RenderTarget
  right: RenderTarget
}
```

---

### **2.4 渲染流程（Mermaid）**

```
Editor Change
      ↓
User Click Render
      ↓
loadMermaid(version)
      ↓
mermaid.render()
      ↓
Success → SVG
Failure → 捕获异常 → 标准化 Error
```

#### **错误捕获策略**

```
try {
  mermaid.render(...)
} catch (e) {
  normalizeMermaidError(e)
}
```

---

### **2.5 Render Error 标准化（前端）**

```
type RenderError = {
  type: 'parse' | 'render' | 'runtime'
  message: string
  raw: string
}
```

映射策略：

|**Mermaid 异常**|**error.type**|
|---|---|
|ParserError|parse|
|RenderError|render|
|Others|runtime|

---

## **3. 后端详细设计（PlantUML）**

  

### **3.1 架构目标**

- 多版本并存
    
- 强隔离
    
- 可控资源消耗
    
- 可预测输出
    

---

### **3.2 渲染服务结构**

```
plantuml-renderer/
├── versions/
│   ├── 1.2023.10/plantuml.jar
│   ├── 1.2022.7/plantuml.jar
├── fonts/
├── render.sh
└── server
```

---

### **3.3 Render API 设计**

  

#### **POST** 

#### **/render/plantuml**

```
{
  "version": "1.2023.10",
  "source": "@startuml ... @enduml",
  "options": {
    "format": "svg"
  }
}
```

#### **Response（统一）**

```
{
  "svg": "<svg>...</svg>",
  "error": null
}
```

或

```
{
  "svg": null,
  "error": {
    "type": "parse",
    "message": "Syntax Error",
    "raw": ".....stderr full text....."
  }
}
```

---

### **3.4 PlantUML 执行方式（强建议）**

  

#### **外部进程执行（非内嵌）**

```
timeout 5s java \
  -Xmx256m \
  -Djava.awt.headless=true \
  -jar plantuml.jar \
  -tsvg \
  input.puml
```

#### **安全限制**

|**项目**|**限制**|
|---|---|
|CPU|OS / cgroup|
|Memory|JVM -Xmx|
|Time|timeout|
|File Access|chroot / workdir|
|Network|禁用|

---

### **3.5 include 策略**

- 默认：**完全禁用**
    
- 若启用：
    
    - 仅允许 ./includes/ 目录
        
    - 不允许 URL include
        
    

---

## **4. Snapshot 设计（关键资产）**

  

### **4.1 Snapshot Schema**

```
{
  "diagramType": "mermaid",
  "source": "flowchart TD...",
  "targets": [
    {
      "version": "9.4.3",
      "options": {}
    }
  ]
}
```

Compare 示例：

```
{
  "diagramType": "plantuml",
  "source": "@startuml...",
  "targets": [
    { "version": "1.2022.7" },
    { "version": "1.2023.10" }
  ]
}
```

---

### **4.2 Snapshot 行为**

|**操作**|**行为**|
|---|---|
|Export|下载 JSON|
|Import|恢复 editor + version + mode|
|Render|100% 复现|

---

## **5. 对比模式设计**

  

### **5.1 UI 行为**

- Editor 共享
    
- Version A / Version B 独立选择
    
- 并排渲染区域
    

  

### **5.2 数据流**

```
Editor Text
   ├── Render(A)
   └── Render(B)
```

- 独立失败，不互相阻断
    

---

## **6. 本地部署方案**


### **6.1 前端**

- 静态资源
    
- Mermaid 各版本内置
    
- 无外部 CDN
    


### **6.2 后端**

- 单机服务
    
- 本地 jar + 字体
    
- 无外部依赖
    

---

## **7. 错误设计的“底线要求”**

任何错误 **必须至少包含**：

- 能 copy 的 raw text
    
- 明确版本
    
- 明确 diagramType
    
  

**禁止出现**：

> ❌ syntax error

---

## **8. Done Definition（技术态）**

- Mermaid ≥3 版本动态切换成功
    
- PlantUML ≥2 版本渲染成功
    
- Snapshot JSON 导入导出闭环
    
- Compare 模式双失败不互相影响
    
- 后端无任意文件 / 网络访问能力
    

---

## **一句话工程定位**


> **这是一个 Diagram 的 version-aware debugger，而不是绘图工具。**
