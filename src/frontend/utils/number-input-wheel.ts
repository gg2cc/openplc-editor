export function installNumberInputWheelGuard(): () => void {
  const handleWheel = () => {
    const activeElement = document.activeElement
    if (activeElement instanceof HTMLInputElement && activeElement.type === 'number') {
      activeElement.blur()
    }
  }

  document.addEventListener('wheel', handleWheel, true)
  return () => document.removeEventListener('wheel', handleWheel, true)
}
