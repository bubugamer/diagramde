
  

## **1. 产品目标**


### 痛点
**Mermaid / PlantUML 对渲染版本强依赖、问题不可复现、难以定位差异**。

### 目标
**同一份文本，在不同版本下，可渲染、可对比、可复现。**

---

## **2. 目标用户**

- 技术文档作者（Markdown / 架构文档）
    
- 平台/工具链维护者（Typora / 思源 / 内网文档系统）
    
- 研发工程师（流程图、架构图、时序图高频使用者）
    

---

## **3. 使用场景**

1. Mermaid 在 A 版本正常、B 版本报错，需快速定位
    
2. PlantUML 在本地与 CI/文档平台结果不一致
    
3. 想确认某语法“从哪一版开始失效”
    
4. 给他人复现一个“只在特定版本失败”的问题
    

---

## **4. 核心功能（MVP）**

### **4.1 文本编辑**

- 单一编辑区
    
- 支持两种模式：
    
    - Mermaid
        
    - PlantUML
        
    
- 基础能力：
    
    - 行号
        
    - 纯文本编辑（不追求 IDE 级）
        
    

---

### **4.2 语言版本选择**

- Mermaid：
    
    - 多版本下拉选择（如 8.x / 9.x / 10.x）
        
    
- PlantUML：
    
    - 多版本下拉选择（对应不同 jar）
        
    

---

### **4.3 渲染与错误反馈**

- 一键 Render
    
- 输出区：
    
    - 渲染结果（SVG）
        
    - 错误信息（raw error + 标准化错误）
        
    


错误信息需包含：

- type（parse / render / runtime）
    
- message
    
- raw_output（完整 stderr / 异常文本）
    

---

### **4.4 文字版本对比**

- 双列模式：
    
    - 左：版本 A
        
    - 右：版本 B
        
    
- 对比内容：
    
    - 渲染结果并排显示
        
    - 错误信息并排显示
        
    
- 同一文本、不同版本
    

---

### **4.5 快照 / 复现**

- 一键导出 Debug Snapshot（JSON）
    
- Snapshot 内容：
    
    - diagramType
        
    - sourceText
        
    - version
        
    - renderOptions
        
    
- 支持导入 Snapshot 并复现
    

---

## **5. 非目标（明确不做）**

- ❌ 画图体验优化（不做 draw.io）
    
- ❌ AI 自动修复语法
    
- ❌ 在线协作
    
- ❌ 图形 diff（仅并排）
    

---

## **6. 技术约束（产品层面）**

  

### **6.1 Mermaid**

- 前端渲染
    
- 多版本共存
    
- 可离线部署
    

  

### **6.2 PlantUML**

- 服务端渲染
    
- 严格限制：
    
    - 执行时间
        
    - 内存
        
    - 文件访问
        


---

## **7. 页面结构（信息架构）**

```
┌──────────────────────────────┐
│ Diagram Type | Version Select │
├───────────────┬──────────────┤
│ Editor        │ Render Panel │
│               │ Error Panel  │
├───────────────┼──────────────┤
│ Compare Mode (A | B)          │
└──────────────────────────────┘
```

---

## **8. 数据模型（最小）**

```
{
  "diagramType": "mermaid | plantuml",
  "source": "string",
  "version": "string",
  "options": {},
  "result": {
    "svg": "string | null",
    "error": {
      "type": "parse | render | runtime",
      "message": "string",
      "raw": "string"
    }
  }
}
```

---

## **9. 成功标准（Done Definition）**

- 同一 Mermaid 文本可在 ≥3 个版本下切换渲染
    
- PlantUML 支持 ≥2 个历史版本
    
- 一个问题可通过 Snapshot 被他人 100% 复现
    
- 错误不再只是 “syntax error”
    

---

## **10. 演进计划**

- 第一阶段演进：
	- 支持将A版本的文本自动转换成B版本的文本，举例：PlantUML 版本（1.2025.11beta10）对 **泳道 |lane|** 的语法更严格——**泳道必须在图的开头先“声明/定义”**，不能在 start 之后第一次才出现。因此当从其他版本切换到该版本时，会自动生成适配该PlantUML 版本（1.2025.11beta10）的文本。该转换动作，由大模型API实现（预计会使用deepseek的api）
    
- 第二阶段演进：
	- 支持大模型对话生成特定语言（mermaid或plantUML）特定版本的文本
	
- 第三阶段演进：
	- 支持更多语言，如**Graphviz**、**D2**等

---

