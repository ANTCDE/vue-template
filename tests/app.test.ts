import { createMockAppContext, testAppSetup } from '@antcde/component-library/test'
import { vi } from 'vitest'
import { provideContext } from '@/plugins/context'
import App from '@/App.vue'

const mockContext = createMockAppContext({
  connect: {
    sbs: { getSbs: vi.fn().mockResolvedValue([]) },
    tasks: { getV2Tasks: vi.fn().mockResolvedValue({ data: [] }) },
  },
})

testAppSetup(App, mockContext, { provideContext })
