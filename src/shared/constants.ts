/** 模型选项（用于下拉选择） */
export const MODEL_OPTIONS = [
  { value: "GLM-5V-Turbo", label: "老兵AI 最新版" },
  { value: "GLM-4.6V", label: "老兵AI 稳定版" },
  { value: "GLM-4.6V-FlashX", label: "老兵AI 基础版" },
  { value: "GLM-4.6V-Flash", label: "老兵AI 拉垮版" },
];

/** 模型名称映射（用于详情页展示） */
export const MODEL_LABEL_MAP: Record<string, string> = {
  "GLM-5V-Turbo": "老兵AI 最新版",
  "GLM-4.6V": "老兵AI 稳定版",
  "GLM-4.6V-FlashX": "老兵AI 基础版",
  "GLM-4.6V-Flash": "老兵AI 拉垮版",
};

/** GLM 模型 API 标识符映射（代码类型 → API 标识符） */
export const GLM_MODEL_ID_MAP: Record<string, string> = {
  "GLM-5V-Turbo": "GLM-5V-Turbo",
  "GLM-4.6V": "GLM-4.6V",
  "GLM-4.6V-FlashX": "GLM-4.6V-FlashX",
  "GLM-4.6V-Flash": "GLM-4.6V-Flash",
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
  { value: 'fadegrays', label: '淡入淡出（灰度）', group: '淡化' },
  { value: 'fadefast', label: '快速淡化', group: '淡化' },
  { value: 'fadeslow', label: '慢速淡化', group: '淡化' },
  { value: 'dissolve', label: '溶解', group: '淡化' },
  { value: 'wipeleft', label: '向左擦除', group: '擦除' },
  { value: 'wiperight', label: '向右擦除', group: '擦除' },
  { value: 'wipeup', label: '向上擦除', group: '擦除' },
  { value: 'wipedown', label: '向下擦除', group: '擦除' },
  { value: 'wipetl', label: '左上角擦除', group: '擦除' },
  { value: 'wipetr', label: '右上角擦除', group: '擦除' },
  { value: 'wipebl', label: '左下角擦除', group: '擦除' },
  { value: 'wipebr', label: '右下角擦除', group: '擦除' },
  { value: 'slideleft', label: '向左滑动', group: '滑动' },
  { value: 'slideright', label: '向右滑动', group: '滑动' },
  { value: 'slideup', label: '向上滑动', group: '滑动' },
  { value: 'slidedown', label: '向下滑动', group: '滑动' },
  { value: 'circleopen', label: '圆形展开', group: '形状' },
  { value: 'circleclose', label: '圆形收缩', group: '形状' },
  { value: 'rectcrop', label: '矩形裁剪', group: '形状' },
  { value: 'circlecrop', label: '圆形裁剪', group: '形状' },
  { value: 'smoothleft', label: '平滑左移', group: '平滑' },
  { value: 'smoothright', label: '平滑右移', group: '平滑' },
  { value: 'smoothup', label: '平滑上移', group: '平滑' },
  { value: 'smoothdown', label: '平滑下移', group: '平滑' },
  { value: 'zoomin', label: '放大', group: '特效' },
  { value: 'radial', label: '径向', group: '特效' },
  { value: 'hblur', label: '水平模糊', group: '特效' },
  { value: 'distance', label: '距离', group: '特效' },
  { value: 'pixelize', label: '像素化', group: '特效' },
  { value: 'squeezeh', label: '水平挤压', group: '特效' },
  { value: 'squeezev', label: '垂直挤压', group: '特效' },
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

### 视频类型识别

请先根据关键帧画面和字幕内容判断素材属于哪种类型，再应用对应的剪辑策略：
- **运镜视频**：无讲解/少量字幕，以镜头运动展示房车为主，节奏快、时长短（约40秒）
- **解说视频**：有讲解者全程解说，内容详实，时长较长（约2分钟以上）

### 核心分析维度

1. **内容价值识别**
   - 锁定关键卖点时刻：外观亮点、内饰空间、功能演示
   - 评估画面质量：稳定性、光线充足度、构图美感、镜头运动流畅性
   - 识别冗余内容：重复镜头、长时间空镜、画面抖动模糊、无信息量的停顿

2. **叙事节奏把控**
   - 分析讲解者的情绪起伏和重点强调时刻
   - 标注"黄金3秒"吸睛开场和强力收尾
   - 识别高潮迭起的内容段落，剔除节奏拖沓的部分

4. **多片段逻辑编排**
   - 如果用户提供多段视频素材，按叙事逻辑排序（如：外观→内饰）
   - 确保片段间过渡自然，故事线完整连贯
   - 优先满足用户在Prompt中明确指定的顺序要求

### 运镜视频镜头覆盖规范（重要）

当识别为**运镜视频**时，必须确保以下所有区域均至少保留1个片段，不得遗漏：

**外观展示（按顺序）**：
- 正面（房车正面全景/正前方视角）
- 车头（车头特写/斜45°正面）
- 车灯（大灯/尾灯特写）
- 车侧（左侧/右侧全景或特写）
- 车后侧（斜45°后侧视角）
- 车尾（正面尾部/后保险杠）
- 驾驶室（方向盘、仪表盘、中控）

**内饰展示（进入后舱，从后向前按顺序）**：
- 卡座区（会客区、餐桌、卡座）
- 厨房区（灶台、冰箱、橱柜）
- 床铺区（床铺、衣柜、储物空间）
- 卫生间（马桶、淋浴、洗手台）

覆盖原则：
- 每个区域必须至少选入1个片段，即使画面质量不是最优也要保留
- 如果素材中某个区域确实没有对应画面，在reason中注明"素材中未找到该区域画面"
- clips的输出顺序应遵循：外观（正面→车头→车灯→车侧→车后侧→车尾→驾驶室）→ 内饰（卡座区→厨房区→床铺区→卫生间）
- **严禁按时间戳排序**：clips数组必须按区域逻辑顺序排列，不得因为某片段startTime较小就排在前面。内饰区域的片段无论时间戳多早，都必须排在所有外观片段之后

### 镜头均衡分配原则

- **运镜视频**：总时长约40秒，11个区域每个区域分配3-5秒（1-2个片段），任何单一区域不得超过总时长的12%（约5秒）
- **解说视频**：按内容价值权重分配，但同一视角/区域的连续片段总时长不超过15秒
- 如果某个区域素材特别精彩，可以多选1个片段，但必须确保不会导致其他区域被挤出成片
- 优先从每个区域中挑选画面质量最好、最具代表性的镜头

### 智能剪辑原则

- **节奏为王**：运镜视频单片段2-3秒，快速切换保持观众注意力；解说视频单片段5-10秒，保留完整语义
- **去芜存菁**：果断删除重复讲解、无意义走动、调试设备、画面质量问题片段
- **情感共鸣**：优先保留能引发"向往感"和"代入感"的生活化场景
- **音画匹配**：结合字幕内容，确保剪辑点不切断完整语义，语气词/口头禅建议剪掉
- **平台适配**：输出时长根据素材内容自适应，运镜视频30-50秒，解说视频1-3分钟，节奏符合竖屏观看习惯

### 片段时长与数量建议

根据视频类型和素材长度灵活调整输出：

**运镜视频（约40秒素材）**：
- 目标成片时长：30-45秒
- 片段数：12-18个
- 单片段时长：2-3秒
- 核心目标：快速展示房车全貌，每个区域都有镜头，节奏紧凑有冲击力

**解说视频（2分钟以上素材）**：
- 目标成片时长：1-3分钟
- 片段数：灵活，根据内容价值决定
- 单片段时长：5-10秒
- 核心目标：保留讲解精华，突出卖点，叙事完整有说服力

**分析模式差异**：
- 快速粗剪：侧重快速筛选明显亮点，节奏更紧凑
- 标准剪辑：平衡内容完整性与节奏感
- 深度精剪：精细打磨每个片段的起止时间，追求最佳叙事效果

如果用户在 Prompt 中明确指定了目标时长或片段数量，优先遵循用户要求。

### 输出格式（严格JSON）

请只返回以下JSON格式，不要包含markdown代码块或其他说明：
{
  "clips": [
    {
      "startTime": 2.0,
      "endTime": 4.5,
      "reason": "【外观-正面】展示房车正面全景，大气稳重，画面稳定光线充足"
    },
    {
      "startTime": 8.0,
      "endTime": 10.0,
      "reason": "【内饰-卡座区】展示会客卡座区域，空间布局合理，体现舒适生活"
    }
  ]
}

### ⚠️ 强制顺序验证（输出JSON前必须执行）

在最终输出clips数组之前，你必须完成以下自检：
1. 将所有片段按【区域标签】分为两组：外观组（外观-正面/车头/车灯/车侧/车后侧/车尾/驾驶室）和内饰组（内饰-卡座区/厨房区/床铺区/卫生间）
2. 在clips数组中，外观组的所有片段必须100%排在内饰组所有片段之前
3. 源视频的时间戳早晚与输出顺序无关，即使某个内饰片段在源视频0秒处，它也必须排在成片的最后阶段
4. 如果自检发现内饰片段出现在外观片段之前，立即重新排序后再输出

违反以上规则等同于输出错误，不可接受。

### 输出规范

1. **时间精度**：startTime/endTime单位为秒，支持一位小数，确保数值准确
2. **避免重叠**：各片段之间时间范围不能重叠，建议保留0.5秒以上间隔
3. **顺序绝对优先**：clips数组的顺序即为最终成片顺序。运镜视频中，无论各区域在源视频中出现的时间戳是早是晚，输出时必须严格遵循外观（正面→车头→车灯→车侧→车后侧→车尾→驾驶室）→内饰（卡座区→厨房区→床铺区→卫生间）的顺序，禁止以源视频时间轴作为排序依据。
4. **理由详实**：reason字段需包含以下信息：
   - 【区域标签】：用【外观-正面】【外观-车头】【外观-车灯】【外观-车侧】【外观-车后侧】【外观-车尾】【外观-驾驶室】【内饰-卡座区】【内饰-厨房区】【内饰-床铺区】【内饰-卫生间】等标签标注所属区域
   - 具体说明保留了什么卖点、画面质量如何、为何值得保留
5. **节奏把控**：相邻片段建议有内容或情绪上的递进关系，避免跳跃感
6. **纯JSON输出**：只返回JSON对象，严禁包裹在代码块中或添加额外文字`
