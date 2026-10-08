import type { AppManifest } from '@antcde/connect-ts'
import rawManifest from '../app-config.json?raw'

/** app-config.json, parsed once. Sent to the OS on connect; also read by the Tables example. */
export const manifest: AppManifest = JSON.parse(rawManifest)
