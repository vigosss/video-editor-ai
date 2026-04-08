/** 模型选项（用于下拉选择） */
export const MODEL_OPTIONS = [
  { value: 'GLM-4.6V-FlashX', label: '老兵AI 极速版（最快）' },
  { value: 'GLM-5V-Turbo', label: '老兵AI 推荐版（推荐）' },
  { value: 'GLM-4.6V', label: '老兵AI 精准版（精准）' },
  { value: 'GLM-4.7-FlashX', label: '老兵AI 均衡版（均衡）' },
]

/** 模型名称映射（用于详情页展示） */
export const MODEL_LABEL_MAP: Record<string, string> = {
  'GLM-4.6V-FlashX': '老兵AI 极速版',
  'GLM-5V-Turbo': '老兵AI 推荐版',
  'GLM-4.6V': '老兵AI 精准版',
  'GLM-4.7-FlashX': '老兵AI 均衡版',
}

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

/** GLM 模型 API 标识符映射（代码类型 → API 标识符） */
export const GLM_MODEL_ID_MAP: Record<string, string> = {
  'GLM-4.6V-FlashX': 'glm-4.6v-flash',
  'GLM-5V-Turbo': 'glm-5v-turbo',
  'GLM-4.6V': 'glm-4.6v',
  'GLM-4.7-FlashX': 'glm-4.7-flash',
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
  { value: 'fade', label: '淡入淡出', group: '淡化' },
  { value: 'fadeblack', label: '黑场淡入淡出', group: '淡化' },
  { value: 'fadewhite', label: '白场淡入淡出', group: '淡化' },
  { value: 'dissolve', label: '溶解', group: '淡化' },
  { value: 'wipeleft', label: '向左擦除', group: '擦除' },
  { value: 'wiperight', label: '向右擦除', group: '擦除' },
  { value: 'wipeup', label: '向上擦除', group: '擦除' },
  { value: 'wipedown', label: '向下擦除', group: '擦除' },
  { value: 'slideleft', label: '向左滑动', group: '滑动' },
  { value: 'slideright', label: '向右滑动', group: '滑动' },
  { value: 'slideup', label: '向上滑动', group: '滑动' },
  { value: 'slidedown', label: '向下滑动', group: '滑动' },
  { value: 'circlecrop', label: '圆形裁剪', group: '形状' },
  { value: 'circleopen', label: '圆形展开', group: '形状' },
  { value: 'circleclose', label: '圆形收拢', group: '形状' },
  { value: 'radial', label: '放射', group: '形状' },
  { value: 'smoothleft', label: '平滑向左', group: '平滑' },
  { value: 'smoothright', label: '平滑向右', group: '平滑' },
  { value: 'smoothup', label: '平滑向上', group: '平滑' },
  { value: 'smoothdown', label: '平滑向下', group: '平滑' },
  { value: 'horzopen', label: '水平展开', group: '展开/收拢' },
  { value: 'horzclose', label: '水平收拢', group: '展开/收拢' },
  { value: 'vertopen', label: '垂直展开', group: '展开/收拢' },
  { value: 'vertclose', label: '垂直收拢', group: '展开/收拢' },
  { value: 'diagtl', label: '左上对角', group: '对角' },
  { value: 'diagtr', label: '右上对角', group: '对角' },
  { value: 'diagbl', label: '左下对角', group: '对角' },
  { value: 'diagbr', label: '右下对角', group: '对角' },
  { value: 'hlslice', label: '水平左切片', group: '切片' },
  { value: 'hrslice', label: '水平右切片', group: '切片' },
  { value: 'vuslice', label: '垂直上切片', group: '切片' },
  { value: 'vdslice', label: '垂直下切片', group: '切片' },
  { value: 'pixelize', label: '像素化', group: '特效' },
  { value: 'squeezeh', label: '水平挤压', group: '特效' },
  { value: 'squeezev', label: '垂直挤压', group: '特效' },
  { value: 'zoomin', label: '放大', group: '特效' },
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
export const DEFAULT_SYSTEM_PROMPT = `你是一位专业的房车销售视频分析师和剪辑顾问。你的任务是分析上传的房车展示视频，并提供精准的剪辑建议，帮助销售团队制作高转化率的营销视频。

### 分析维度

1. **内容质量评估**
   - 识别视频中的关键卖点时刻（外观展示、内部空间、功能演示、驾驶体验等）
   - 评估画面稳定性、光线条件、拍摄角度
   - 识别冗余内容和可删减片段

2. **情感与节奏分析**
   - 识别讲解者的语气变化和重点强调时刻
   - 分析视频节奏（快慢切换、停顿时长）
   - 标注情感高潮点和吸引力峰值

3. **营销关键点识别**
   - 价格信息提及时刻
   - 独特卖点（USP）展示片段
   - 客户痛点解决方案演示
   - 行动号召（CTA）时刻

4. **剪辑建议输出**
   - 推荐保留的黄金片段（时间戳 + 原因）
   - 建议删减的内容（时间戳 + 理由）
   - 最佳开头和结尾选择
   - 建议添加的转场、字幕、特效位置

### 分析原则
- 优先保留展示房车独特功能和空间的片段
- 删除重复讲解、长时间静态画面、模糊或抖动片段
- 确保成片节奏紧凑，前15秒必须抓住眼球
- 突出性价比、实用性、舒适度等核心卖点
- 适配短视频平台的竖屏和横屏需求

### 输出格式

请严格按照以下 JSON 格式返回结果（不要包含其他文字说明）：
{
  "clips": [
    {
      "startTime": 10.5,
      "endTime": 25.3,
      "reason": "保留理由（结合房车销售分析维度说明为何保留此片段）"
    }
  ]
}

注意事项：
1. startTime 和 endTime 单位为秒（支持小数）
2. 片段时间不要重叠
3. clips 数组的顺序就是最终视频的播放顺序，请按用户需求的语义顺序排列片段（例如用户要求"先外观后内饰"，则外观相关片段排在前面，内饰片段排在后面）
4. 每个片段的 reason 必须结合内容质量、情感节奏、营销价值等维度给出专业保留理由
5. 优先选择展示房车核心卖点、情感高潮、营销关键点的片段
6. 只返回 JSON 数据，不要包含 markdown 代码块或其他说明文字`
