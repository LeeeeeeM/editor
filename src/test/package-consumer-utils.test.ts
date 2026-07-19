import { describe, expect, it, vi } from 'vitest'
// @ts-expect-error The verification utility is JavaScript and is intentionally not part of the package declarations.
import { runInterruptCleanup as runInterruptCleanupUntyped } from '../../scripts/package-consumer-utils.mjs'

type RunInterruptCleanup = <Process>(
  processes: Iterable<Process>,
  cleanup: () => void | Promise<void>,
  stop?: (process: Process) => void | Promise<void>
) => Promise<void>

const runInterruptCleanup = runInterruptCleanupUntyped as RunInterruptCleanup

describe('package consumer interrupt cleanup', () => {
  it('runs resource cleanup after process-stop failures and reports every failure', async () => {
    const stopFailure = new Error('stop failed')
    const cleanupFailure = new Error('cleanup failed')
    const cleanup = vi.fn(() => Promise.reject(cleanupFailure))
    const stop = vi.fn((process: string) => (process === 'failing' ? Promise.reject(stopFailure) : Promise.resolve()))

    await expect(runInterruptCleanup(new Set(['failing', 'stopped']), cleanup, stop)).rejects.toEqual(
      expect.objectContaining({ errors: [stopFailure, cleanupFailure] })
    )
    expect(stop).toHaveBeenCalledTimes(2)
    expect(cleanup).toHaveBeenCalledOnce()
  })
})
