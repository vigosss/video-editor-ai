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