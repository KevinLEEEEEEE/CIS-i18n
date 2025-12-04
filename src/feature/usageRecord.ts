import { emit } from '@create-figma-plugin/utilities'
import { TrackEventHandler } from '../types'

/**
 * 增加翻译使用计数
 */
const addTranslateUsageCount = (count: number) => {
    emit<TrackEventHandler>('TRACK_EVENT', 'Translate', { ['Node Count']: count })
}

/**
 * 增加样式检查使用计数
 */
const addStylelintUsageCount = (count: number) => {
    emit<TrackEventHandler>('TRACK_EVENT', 'Format', { ['Node Count']: count })
}

/**
 * 增加润色使用计数
 */
const addPolishUsageCount = (count: number) => {
    emit<TrackEventHandler>('TRACK_EVENT', 'Polish', { ['Node Count']: count })
}

/**
 * 增加处理节点的计数
 * @param amount 增加的节点数量
 */
const addProcessNodesCount = (amount: number) => {
    emit<TrackEventHandler>('TRACK_EVENT', 'process_nodes', { ['Node Count']: amount })
}

export {
    addTranslateUsageCount,
    addStylelintUsageCount,
    addProcessNodesCount,
    addPolishUsageCount
}
