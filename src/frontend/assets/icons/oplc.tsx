import { ComponentProps } from 'react'

import logoHead from './about/logo-head.svg'
import { cn } from '../../utils/cn'

type IOpenPLCIconProps = ComponentProps<'img'>

export const OpenPLCIcon = (props: IOpenPLCIconProps) => {
  const { className, alt = 'OpenPLC Logo', ...rest } = props

  return <img src={logoHead} alt={alt} className={cn('h-6 w-6 object-contain', className)} {...rest} />
}
