import { IPC_CHANNELS } from '../../shared/ipc'
import {
  listPromptTemplates,
  createPromptTemplate,
  updatePromptTemplate,
  deletePromptTemplate,
} from '../services/database'
import type { PromptTemplate } from '../../shared/prompt'
import { handleWithLog } from '../utils/logger'

/** 注册 Prompt 模板相关 IPC 处理器 */
export function registerTemplateIPC(): void {
  // 获取所有模板
  handleWithLog(IPC_CHANNELS.TEMPLATE_LIST, async (): Promise<PromptTemplate[]> => {
    return listPromptTemplates()
  })

  // 创建模板
  handleWithLog(
    IPC_CHANNELS.TEMPLATE_CREATE,
    async (_event, name: string, content: string): Promise<PromptTemplate> => {
      if (!name || typeof name !== 'string') {
        throw new Error('模板名称无效')
      }
      return createPromptTemplate(name, content)
    },
  )

  // 更新模板
  handleWithLog(
    IPC_CHANNELS.TEMPLATE_UPDATE,
    async (_event, id: string, name: string, content: string): Promise<PromptTemplate> => {
      if (!id || typeof id !== 'string') {
        throw new Error('模板 ID 无效')
      }
      return updatePromptTemplate(id, name, content)
    },
  )

  // 删除模板
  handleWithLog(IPC_CHANNELS.TEMPLATE_DELETE, async (_event, id: string): Promise<void> => {
    if (!id || typeof id !== 'string') {
      throw new Error('模板 ID 无效')
    }
    deletePromptTemplate(id)
  })
}
