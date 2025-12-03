
class Limiter {
    private rps: number
    private maxConc: number
    private inFlight = 0
    private lastStart = 0
    private q: (() => void)[] = []

    constructor(rps: number, maxConc: number) {
        this.rps = rps
        this.maxConc = maxConc
    }

    async acquire() {
        await this.waitForSlot()
        const now = Date.now()
        const interval = 1000 / Math.max(1, this.rps)
        const delta = now - this.lastStart
        if (delta < interval) await new Promise(r => setTimeout(r, interval - delta + Math.floor(Math.random() * 200)))
        this.lastStart = Date.now()
        this.inFlight++
        let released = false
        const release = () => {
            if (released) return
            released = true
            this.inFlight--
            const next = this.q.shift()
            next && next()
        }
        return release
    }

    private waitForSlot() {
        if (this.inFlight < this.maxConc) return Promise.resolve()
        return new Promise<void>(resolve => this.q.push(resolve))
    }
}

export const translatorLimiter = new Limiter(10, 10)
export const polisherLimiter = new Limiter(5, 5)

export async function runWithLimiter<T>(releaseFn: () => void, task: () => Promise<T>) {
    try {
        return await task()
    } finally {
        releaseFn()
    }
}
