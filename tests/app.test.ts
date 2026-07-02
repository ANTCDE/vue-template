import { createMockAppContext, testAppSetup } from '@antcde/component-library/test'
import App from '@/App.vue'
import { provideContext } from '@/plugins/context'

// connect is auto-stubbed by createMockAppContext — only pass a `connect`
// override for services whose return value a specific test asserts on.
testAppSetup(App, createMockAppContext(), { provideContext })
