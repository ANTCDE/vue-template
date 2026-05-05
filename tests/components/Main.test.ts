/**
 * Sample feature test for the Main component.
 *
 * Demonstrates how to write tests for iframe app components:
 * 1. Mock the app context via createMockAppContext
 * 2. Mount the component with mountApp (includes Vuetify + i18n)
 * 3. Interact through the UI and verify outcomes
 *
 * Key principles:
 * - Mount real components, simulate user actions, verify results
 * - Mock at boundaries only (context, API) — never internal functions
 * - Test behavior through the public interface, not implementation details
 */
import { createMockAppContext, mountApp } from '@antcde/component-library/test'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import en from '@/lang/translations/en.json'
import Main from '@/components/Main.vue'

const mockContext = createMockAppContext({
  connect: {
    sbs: { getSbs: vi.fn().mockResolvedValue([]) },
    tasks: { getV2Tasks: vi.fn().mockResolvedValue({ data: [] }) },
  },
  messages: en,
})

vi.mock('@/plugins/context', () => ({
  injectContext: () => mockContext,
}))

describe('Main', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockContext.comms.toolbar.title.value = undefined
    mockContext.comms.toolbar.menu.value = []
  })

  it('mounts and displays the app title', () => {
    const wrapper = mountApp(Main)
    expect(wrapper.text()).toContain('Test app!')
  })

  it('sets toolbar title on mount', () => {
    mountApp(Main)
    expect(mockContext.comms.toolbar.title.value).toBe('Test App!')
  })

  it('configures toolbar menu on mount', () => {
    mountApp(Main)
    expect(mockContext.comms.toolbar.menu.value).toHaveLength(2)
  })

  it('increments counter on button click', async () => {
    const wrapper = mountApp(Main)

    const countBtn = wrapper.findAll('.v-btn').find(
      btn => btn.text().includes('count is 0'),
    )
    expect(countBtn).toBeDefined()

    await countBtn!.trigger('click')
    expect(wrapper.text()).toContain('count is 1')
  })

  it('sends notification on button click', async () => {
    const wrapper = mountApp(Main)

    const notifBtn = wrapper.findAll('.v-btn').find(
      btn => btn.text().includes('Send notification'),
    )
    expect(notifBtn).toBeDefined()

    await notifBtn!.trigger('click')
    expect(mockContext.comms.notifications.success).toHaveBeenCalledWith('This is amazing!')
  })

  it('updates toolbar title when counter changes', async () => {
    const wrapper = mountApp(Main)

    const countBtn = wrapper.findAll('.v-btn').find(
      btn => btn.text().includes('count is 0'),
    )
    await countBtn!.trigger('click')

    expect(mockContext.comms.toolbar.title.value).toBe('Count: 1')
  })
})
