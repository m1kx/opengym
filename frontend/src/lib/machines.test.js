import { describe, it, expect, afterEach } from 'vitest'
import { registerMachines, allExercises, EXIDX, imgSrc } from './exercises.js'
import { musclesOf } from './muscles.js'

const m = { id: 'm_gym80_chest-press', n: 'Chest Press (Pure Kraft)', bp: 'chest', eq: 'gym80', tg: 'pectorals', sm: ['triceps'], img: 'https://gym80.de/x.jpg', machine: true }

describe('machines', () => {
  afterEach(() => registerMachines([]))

  it('shows up in the catalogue, the id index and the muscle map', () => {
    registerMachines([m])
    expect(allExercises({}).some(e => e.id === m.id)).toBe(true)
    expect(EXIDX[m.id]).toBe(m)
    const mu = musclesOf(m)
    expect(mu.chest).toBe(1)
    expect(mu.triceps).toBe(0.4)
    expect(imgSrc(m)).toBe(m.img)
  })

  it('replaces the previous list', () => {
    registerMachines([m])
    registerMachines([])
    expect(EXIDX[m.id]).toBeUndefined()
  })
})
