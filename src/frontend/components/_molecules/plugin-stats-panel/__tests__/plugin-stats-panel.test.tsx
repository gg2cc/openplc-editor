import { render, screen } from '@testing-library/react'

import { PluginStatsPanel } from '..'

describe('PluginStatsPanel', () => {
  it('renders one stats row per CAN interface when plugin payload is grouped by interface', () => {
    const pluginStats = {
      can: {
        can0: {
          label: 'CAN Bus (can0)',
          fields: [
            { label: 'RX Frames', value: 3 },
            { label: 'TX Frames', value: 2 },
            { label: 'RX Errors', value: 0 },
            { label: 'TX Errors', value: 1 },
          ],
        },
        can1: {
          label: 'CAN Bus (can1)',
          fields: [
            { label: 'RX Frames', value: 5 },
            { label: 'TX Frames', value: 4 },
            { label: 'RX Errors', value: 1 },
            { label: 'TX Errors', value: 2 },
          ],
        },
      },
    }

    render(<PluginStatsPanel pluginStats={pluginStats as any} />)

    expect(screen.getByText('CAN Bus (can0)')).toBeTruthy()
    expect(screen.getByText('CAN Bus (can1)')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
    expect(screen.getByText('5')).toBeTruthy()
  })
})
