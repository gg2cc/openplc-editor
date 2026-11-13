import { installNumberInputWheelGuard } from '../number-input-wheel'

describe('installNumberInputWheelGuard', () => {
  let uninstall: (() => void) | undefined

  afterEach(() => {
    uninstall?.()
    uninstall = undefined
    document.body.innerHTML = ''
  })

  it('blurs a focused number input when the wheel is used outside it', () => {
    uninstall = installNumberInputWheelGuard()
    const numberInput = document.createElement('input')
    numberInput.type = 'number'
    const scrollArea = document.createElement('div')
    document.body.append(numberInput, scrollArea)
    numberInput.focus()

    scrollArea.dispatchEvent(new WheelEvent('wheel', { bubbles: true }))

    expect(document.activeElement).not.toBe(numberInput)
  })

  it('does not blur other focused inputs on wheel', () => {
    uninstall = installNumberInputWheelGuard()
    const textInput = document.createElement('input')
    textInput.type = 'text'
    const scrollArea = document.createElement('div')
    document.body.append(textInput, scrollArea)
    textInput.focus()

    scrollArea.dispatchEvent(new WheelEvent('wheel', { bubbles: true }))

    expect(document.activeElement).toBe(textInput)
  })
})
