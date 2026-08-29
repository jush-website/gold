import { defineConfig } from 'vitest/config'

// 獨立於 vite.config.js：測試不需要（也不該）跑 PWA 外掛。
export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    environment: 'node',
    // 這個 App 的日期邏輯是以台灣當地時間為準（例如「今天」的判定）。
    // 不釘住時區的話，同一組測試在 UTC 的 CI 機器上會得到不同結果。
    env: { TZ: 'Asia/Taipei' },
  },
})
