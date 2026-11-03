import { describe, expect, it } from 'vitest'
import { mapWithConcurrency } from '../mapWithConcurrency'

describe('lectures concurrentes bornées', () => {
  it('conserve les résultats et leur ordre avec au maximum trois lectures actives', async () => {
    let active = 0
    let peak = 0
    const values = await mapWithConcurrency(Array.from({ length: 23 }, (_, i) => i), 3, async (item) => {
      active++
      peak = Math.max(peak, active)
      await new Promise(resolve => setTimeout(resolve, item % 3))
      active--
      return item * 10
    })
    expect(peak).toBe(3)
    expect(values).toEqual(Array.from({ length: 23 }, (_, i) => i * 10))
  })
  it('propage une erreur de lecture', async () => {
    await expect(mapWithConcurrency([1], 2, async () => { throw new Error('Lecture refusée') })).rejects.toThrow('Lecture refusée')
  })
  it('accepte une liste vide et refuse une concurrence nulle', async () => {
    expect(await mapWithConcurrency([], 2, async () => 1)).toEqual([])
    await expect(mapWithConcurrency([1], 0, async () => 1)).rejects.toThrow(RangeError)
  })
})
