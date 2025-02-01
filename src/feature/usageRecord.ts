const BACKENDLESS_BASE_URL = 'https://infantvein-eu.backendless.app/api/counters';

/**
 * 增加指定计数器的值
 * @param counterName 计数器名称
 * @param value 增加的值，默认为1
 * @returns Promise<number> 返回更新后的计数值
 */
export async function incrementCounter(counterName: string, value: number = 1): Promise<number> {
    if (process.env.NODE_ENV === 'development') {
        console.log(`[UsageRecord] Skip recording in Dev environment: ${counterName}`);
        return Promise.resolve(0); // 返回一个默认值
    }

    try {
        const response = await fetch(
            `${BACKENDLESS_BASE_URL}/${counterName}/incrementby/get?value=${value}`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`埋点更新失败: ${response.statusText}`);
        }

        const updatedValue = await response.json();
        console.log(`[UsageRecord] Successfully update key: ${counterName}, updated value: ${updatedValue}`);
        return updatedValue; // 确保返回更新后的值
    } catch (error) {
        console.error('[UsageRecord] Failed to update usage record', error);
        throw error;
    }
}

/**
 * 增加翻译使用计数
 */
const addTranslateUsageCount = () => {
    incrementCounter('translateUsageCount', 1);
}

/**
 * 增加样式检查使用计数
 */
const addStylelintUsageCount = () => {
    incrementCounter('stylelintUsageCount', 1);
}

/**
 * 增加处理节点的计数
 * @param amount 增加的节点数量
 */
const addProcessNodesCount = (amount: number) => {
    incrementCounter('processNodesCount', amount);
}

export {
    addTranslateUsageCount,
    addStylelintUsageCount,
    addProcessNodesCount
}