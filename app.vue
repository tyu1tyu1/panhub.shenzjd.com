<template>
  <div class="layout">
    <header class="header">
      <nav class="nav">
        <NuxtLink to="/" class="brand">PanHub</NuxtLink>
        <div class="spacer" />
        <button class="link" type="button" @click="openSettings = true">
          设置
        </button>
      </nav>
    </header>
    <main class="main">
      <NuxtPage />
    </main>
    <ClientOnly>
      <SettingsDrawer
        v-model="settings"
        v-model:open="openSettings"
        :all-plugins="ALL_PLUGIN_NAMES"
        :all-tg-channels="allTgChannels"
        @save="saveSettings"
        @reset-default="resetToDefault" />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import SettingsDrawer from "./pages/index/SettingsDrawer.vue";
import { ALL_PLUGIN_NAMES } from "./config/plugins";
import channelsConfig from "~/config/channels.json";

const { settings, loadSettings, saveSettings, resetToDefault } = useSettings();
const openSettings = ref(false);

// 所有可用的 TG 频道（用于设置面板）
const allTgChannels = computed(() => {
  const configChannels = (useRuntimeConfig().public as any)?.tgDefaultChannels;
  return Array.isArray(configChannels) && configChannels.length > 0
    ? configChannels
    : channelsConfig.defaultChannels;
});

onMounted(() => {
  loadSettings();
});
</script>

<style>
html,
body {
  margin: 0;
  padding: 0;
  /* iOS Safari兼容性：防止页面缩放 */
  -webkit-text-size-adjust: 100%;
  -webkit-tap-highlight-color: transparent;
  /* iOS Safari兼容性：改善滚动体验 */
  -webkit-overflow-scrolling: touch;
}

/* iOS Safari兼容性：防止输入框自动缩放 */
input[type="text"],
input[type="search"],
input[type="email"],
input[type="password"],
textarea {
  -webkit-appearance: none;
  -webkit-border-radius: 0;
  border-radius: 0;
  -webkit-text-size-adjust: 100%;
}

/* iOS Safari兼容性：防止按钮出现默认样式 */
button {
  -webkit-appearance: none;
  -webkit-tap-highlight-color: transparent;
}

/* iOS Safari兼容性：确保触摸区域足够大 */
@media (max-width: 640px) {
  button,
  input,
  select,
  textarea {
    min-height: 44px;
    min-width: 44px;
  }
}
</style>

<style scoped>
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.header {
  /* 顶部不再吸顶，改由结果区域的 Tab 吸顶 */
  background: #fff;
  border-bottom: 1px solid #eee;
}
.nav {
  max-width: 1200px;
  margin: 0 auto;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.brand {
  font-weight: 800;
  color: #111;
  text-decoration: none;
}
.spacer {
  flex: 1;
}
.link {
  border: 1px solid #eee;
  color: #333;
  text-decoration: none;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
}
.link:hover {
  background: #f6f7f9;
}
.main {
  flex: 1;
  /* 初始不出现滚动条，给页脚状态预留 16px 内边距 */
  padding-bottom: 16px;
}
</style>
