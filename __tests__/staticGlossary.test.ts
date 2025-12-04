import { findGlossaryTranslation } from '../src/feature/staticGlossary'
import { Language } from '../src/types'

describe('staticGlossary', () => {
  test('ZH→EN exact hit', () => {
    expect(findGlossaryTranslation('确定', Language.ZH, Language.EN)).toBe('Confirm')
  })

  test('EN→ZH exact hit', () => {
    expect(findGlossaryTranslation('Cancel', Language.EN, Language.ZH)).toBe('取消')
  })

  test('trims input and matches', () => {
    expect(findGlossaryTranslation('  保存  ', Language.ZH, Language.EN)).toBe('Save')
  })

  test('unmatched returns undefined', () => {
    expect(findGlossaryTranslation('NotExist', Language.EN, Language.ZH)).toBeUndefined()
  })

  test('unsupported language pair returns undefined', () => {
    expect(findGlossaryTranslation('确定', Language.ZH, Language.ZH)).toBeUndefined()
  })
})

