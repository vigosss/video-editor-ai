/** 模型选项（用于下拉选择） */
export const MODEL_OPTIONS = [
  { value: "GLM-5V-Turbo", label: "老兵AI 最新版" },
  { value: "GLM-4.6V", label: "老兵AI 稳定版" },
  { value: "GLM-4.6V-FlashX", label: "老兵AI 拉垮版" },
];

/** 模型名称映射（用于详情页展示） */
export const MODEL_LABEL_MAP: Record<string, string> = {
  "GLM-5V-Turbo": "老兵AI 最新版",
  "GLM-4.6V": "老兵AI 稳定版",
  "GLM-4.6V-FlashX": "老兵AI 拉垮版",
};

/** GLM 模型 API 标识符映射（代码类型 → API 标识符） */
export const GLM_MODEL_ID_MAP: Record<string, string> = {
  "GLM-5V-Turbo": "glm-5v-turbo",
  "GLM-4.6V": "glm-4.6v",
  "GLM-4.6V-FlashX": "glm-4.6v-flash",
};


/** 分析模式选项（用于下拉选择） */
export const ANALYSIS_MODE_OPTIONS = [
  { value: 'quick', label: '快速粗剪' },
  { value: 'standard', label: '标准剪辑' },
  { value: 'deep', label: '深度精剪' },
]

/** 分析模式映射（用于详情页展示） */
export const ANALYSIS_MODE_LABEL_MAP: Record<string, string> = {
  quick: '快速粗剪',
  standard: '标准剪辑',
  deep: '深度精剪',
}

/** 节拍同步模式选项 */
export const BEAT_SYNC_MODE_OPTIONS = [
  { value: 'none', label: '不使用节拍同步' },
  { value: 'ai_with_beats', label: 'AI + 节拍同步（推荐）' },
  { value: 'beat_segment', label: '节拍分段 + AI 挑选' },
  { value: 'ai_then_align', label: 'AI 先选，后对齐节拍' },
]

/** 节拍同步模式映射 */
export const BEAT_SYNC_MODE_LABEL_MAP: Record<string, string> = {
  none: '不使用',
  ai_with_beats: 'AI + 节拍同步',
  beat_segment: '节拍分段 + AI 挑选',
  ai_then_align: 'AI 先选后对齐',
}

/** 转场效果选项 */
export const TRANSITION_TYPE_OPTIONS = [
  { value: 'none', label: '无（硬切）', group: '基础' },
  { value: 'fadeblack', label: '淡入淡出（黑场）', group: '淡化' },
  { value: 'fadewhite', label: '淡入淡出（白场）', group: '淡化' },
  { value: 'dissolve', label: '溶解', group: '淡化' },
  { value: 'wipeleft', label: '向左擦除', group: '擦除' },
  { value: 'wiperight', label: '向右擦除', group: '擦除' },
  { value: 'wipeup', label: '向上擦除', group: '擦除' },
  { value: 'wipedown', label: '向下擦除', group: '擦除' },
  { value: 'slideleft', label: '向左滑动', group: '滑动' },
  { value: 'slideright', label: '向右滑动', group: '滑动' },
  { value: 'slideup', label: '向上滑动', group: '滑动' },
  { value: 'slidedown', label: '向下滑动', group: '滑动' },
  { value: 'circleopen', label: '圆形展开', group: '形状' },
  { value: 'circleclose', label: '圆形收缩', group: '形状' },
  { value: 'smoothleft', label: '平滑左移', group: '平滑' },
  { value: 'smoothright', label: '平滑右移', group: '平滑' },
  { value: 'smoothup', label: '平滑上移', group: '平滑' },
  { value: 'smoothdown', label: '平滑下移', group: '平滑' },
  { value: 'zoomin', label: '放大', group: '特效' },
  { value: 'radial', label: '径向', group: '特效' },
]

/** 转场效果映射 */
export const TRANSITION_TYPE_LABEL_MAP: Record<string, string> = Object.fromEntries(
  TRANSITION_TYPE_OPTIONS.map(o => [o.value, o.label])
)

/** 音频模式选项 */
export const AUDIO_MODE_OPTIONS = [
  { value: 'original', label: '保留原始音频' },
  { value: 'bgm_only', label: '仅背景音乐' },
  { value: 'mixed', label: '混合（原声 + BGM）' },
]

/** 音频模式映射 */
export const AUDIO_MODE_LABEL_MAP: Record<string, string> = {
  original: '原始音频',
  bgm_only: '仅 BGM',
  mixed: '混合',
}

/** 默认系统提示词 */
export const DEFAULT_SYSTEM_PROMPT = `你是一位专业的短视频剪辑AI助手，专为房车销售、产品展示类视频提供智能剪辑分析。你的任务是基于用户提供的视频关键帧、字幕文本和剪辑需求，精准识别并提取最具吸引力和转化力的片段。

### 核心分析维度

1. **内容价值识别**
   - 锁定关键卖点时刻：外观亮点、内饰空间、功能演示、驾驶体验、价格优势
   - 评估画面质量：稳定性、光线充足度、构图美感、镜头运动流畅性
   - 识别冗余内容：重复镜头、长时间空镜、画面抖动模糊、无信息量的停顿

2. **叙事节奏把控**
   - 分析讲解者的情绪起伏和重点强调时刻
   - 标注"黄金3秒"吸睛开场和强力收尾
   - 识别高潮迭起的内容段落，剔除节奏拖沓的部分

3. **营销转化优化**
   - 捕捉价格/优惠信息披露时刻
   - 突出独特卖点（USP）和功能亮点展示
   - 识别能激发购买欲望的场景（舒适生活、自由出行、性价比对比）
   - 找到自然的行动号召（CTA）切入点

4. **多片段逻辑编排**
   - 如果用户提供多段视频素材，按叙事逻辑排序（如：外观→内饰→功能→价格→促销）
   - 确保片段间过渡自然，故事线完整连贯
   - 优先满足用户在Prompt中明确指定的顺序要求

### 智能剪辑原则

- **节奏为王**：成片节奏要紧凑有力，抖音/快手平台建议单片段2-8秒，快速切换保持观众注意力
- **黄金法则**：前3秒必须有视觉冲击或钩子内容，前15秒要完成核心卖点展示
- **去芜存菁**：果断删除重复讲解、无意义走动、调试设备、画面质量问题片段
- **情感共鸣**：优先保留能引发"向往感"和"代入感"的生活化场景
- **音画匹配**：结合字幕内容，确保剪辑点不切断完整语义，语气词/口头禅建议剪掉
- **平台适配**：输出时长根据素材内容自适应，短视频平台一般15秒到3分钟，解说/教程类视频可更长，节奏符合竖屏观看习惯

### 片段时长与数量建议

根据视频素材的实际长度和内容类型灵活调整输出，不设固定上限：
- **短视频素材（30秒以内）**：保留精华高光，片段数3-6个，单片段3-8秒
- **中等素材（30秒-2分钟）**：去冗余保核心，片段数5-12个，单片段4-10秒
- **长素材（2分钟以上）**：智能压缩保留高光与关键信息，片段数灵活，单片段5-15秒
- **分析模式差异**：
  - 快速粗剪：侧重快速筛选明显亮点，节奏更紧凑
  - 标准剪辑：平衡内容完整性与节奏感
  - 深度精剪：精细打磨每个片段的起止时间，追求最佳叙事效果
- 如果用户在 Prompt 中明确指定了目标时长或片段数量，优先遵循用户要求

### 输出格式（严格JSON）

请只返回以下JSON格式，不要包含markdown代码块或其他说明：
{
  "clips": [
    {
      "startTime": 10.5,
      "endTime": 18.2,
      "reason": "展示房车超大内部空间，讲解者情绪激动，画面稳定光线好，属于核心卖点片段"
    }
  ]
}

### 输出规范

1. **时间精度**：startTime/endTime单位为秒，支持一位小数，确保数值准确
2. **避免重叠**：各片段之间时间范围不能重叠，建议保留0.5秒以上间隔
3. **顺序优先**：clips数组的顺序即为最终成片顺序，严格遵循用户Prompt中的语义排序要求
4. **理由详实**：reason字段需具体说明保留了什么卖点、画面质量如何、为何值得保留
5. **节奏把控**：相邻片段建议有内容或情绪上的递进关系，避免跳跃感
6. **纯JSON输出**：只返回JSON对象，严禁包裹在代码块中或添加额外文字`
