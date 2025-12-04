import { Language } from '../types'

type Entry = { zh: string; en: string }

export const glossary: Entry[] = [
  { zh: '确定', en: 'Confirm' },
  { zh: '取消', en: 'Cancel' },
  { zh: '保存', en: 'Save' },
  { zh: '提交', en: 'Submit' },
  { zh: '编辑', en: 'Edit' },
  { zh: '删除', en: 'Delete' },
  { zh: '上传', en: 'Upload' },
  { zh: '下载', en: 'Download' },
  { zh: '添加', en: 'Add' },
  { zh: '返回', en: 'Back' },
  { zh: '首页', en: 'Home' },
  { zh: '详情', en: 'Details' },
  { zh: '请搜索', en: 'Please search' },
  { zh: '请输入', en: 'Please enter' },
  { zh: '请选择', en: 'Please select' },
  { zh: '启用', en: 'Enable' },
  { zh: '禁用', en: 'Disable' },
  { zh: '已启用', en: 'Enabled' },
  { zh: '已禁用', en: 'Disabled' },
  { zh: '导入', en: 'Import' },
  { zh: '导出', en: 'Export' },
]

export function findGlossaryTranslation(text: string, source: Language, target: Language): string | undefined {
  const s = (text || '').trim()
  if (!s) return undefined
  if (source === Language.ZH && target === Language.EN) {
    const hit = glossary.find(e => e.zh === s)
    return hit ? hit.en : undefined
  }
  if (source === Language.EN && target === Language.ZH) {
    const hit = glossary.find(e => e.en === s)
    return hit ? hit.zh : undefined
  }
  return undefined
}
