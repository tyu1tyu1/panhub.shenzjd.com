<template>
  <div class="home">
    <header class="hero">
      <div class="hero__logo">
        <img src="/logo.png" alt="logo" />
      </div>
      <div class="hero__subtitle">全网最全的网盘搜索工具</div>
    </header>

    <SearchBox
      v-model="kw"
      :loading="searchState.loading"
      :placeholder="placeholder"
      @search="onSearch"
      @reset="resetSearch" />

    <div v-if="searchState.searched" class="sticky-tabs">
      <ResultHeader
        :total="searchState.total"
        :elapsed-ms="searchState.elapsedMs"
        :platforms="platforms"
        :has-results="hasResults"
        :platform-name="platformName"
        :deep-loading="searchState.deepLoading"
        :model="{ sortType: sortType, filterPlatform: filterPlatform }"
        @change-filter="(val: string) => (filterPlatform = val)"
        @change-sort="(val: string) => (sortType = val as any)" />
    </div>

    <section v-if="hasResults" class="results">
      <ResultGroup
        v-for="group in groupedResults"
        :key="group.type"
        :title="platformName(group.type)"
        :color="platformColor(group.type)"
        :icon="platformIcon(group.type)"
        :items="visibleSorted(group.items)"
        :expanded="filterPlatform !== 'all' || isExpanded(group.type)"
        :initial-visible="initialVisible"
        :can-toggle-collapse="false"
        @toggle="handleToggle(group.type)"
        @copy="copyLink" />
    </section>

    <section v-else-if="searchState.searched && !searchState.loading" class="empty">
      <div class="card">
        <div class="empty__inner">未找到相关资源，试试其他关键词</div>
      </div>
    </section>

    <section v-if="searchState.error" class="alert">{{ searchState.error }}</section>
  </div>
</template>

<script setup lang="ts">
import SearchBox from "./SearchBox.vue";
import ResultHeader from "./ResultHeader.vue";
import ResultGroup from "./ResultGroup.vue";
import { PLATFORM_INFO } from "~/config/plugins";
import type { MergedLinks } from "~/server/core/types/models";

const config = useRuntimeConfig();
const apiBase = (config.public?.apiBase as string) || "/api";
const siteUrl = (config.public?.siteUrl as string) || "";

// SEO 元数据
useSeoMeta({
  title: "PanHub - 全网最全的网盘搜索",
  description:
    "聚合阿里云盘、夸克、百度网盘、115、迅雷等平台，实时检索各类分享链接与资源，免费、快速、无广告。",
  ogTitle: "PanHub - 全网最全的网盘搜索",
  ogDescription:
    "聚合阿里云盘、夸克、百度网盘、115、迅雷等平台，实时检索各类分享链接与资源，免费、快速、无广告。",
  ogType: "website",
  ogSiteName: "PanHub",
  ogImage: siteUrl ? `${siteUrl}/og.svg` : "/og.svg",
  twitterCard: "summary_large_image",
  twitterTitle: "PanHub - 全网最全的网盘搜索",
  twitterDescription:
    "聚合阿里云盘、夸克、百度网盘、115、迅雷等平台，实时检索各类分享链接与资源，免费、快速、无广告。",
  twitterImage: siteUrl ? `${siteUrl}/og.svg` : "/og.svg",
});

useHead({
  link: [{ rel: "canonical", href: siteUrl ? `${siteUrl}/` : "/" }],
  meta: [
    {
      name: "keywords",
      content:
        "网盘搜索, 阿里云盘搜索, 夸克网盘搜索, 百度网盘搜索, 115 网盘, 迅雷云盘, 资源搜索, 盘搜, PanHub",
    },
  ],
  script: [
    {
      type: "application/ld+json",
      innerHTML: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "PanHub",
        url: siteUrl || "",
        potentialAction: {
          "@type": "SearchAction",
          target: (siteUrl || "") + "/?q={search_term_string}",
          "query-input": "required name=search_term_string",
        },
      }),
    },
  ],
});

// 搜索相关状态
const kw = ref("");
const placeholder =
  "搜索网盘资源，支持百度云、阿里云盘、夸克网盘、115网盘、迅雷云盘、天翼云盘、123网盘、移动云盘、UC网盘等";

// 排序和过滤
const sortType = ref<"default" | "date-desc" | "date-asc" | "name-asc" | "name-desc">("default");
const filterPlatform = ref<string>("all");
const initialVisible = 3;
const expandedSet = ref<Set<string>>(new Set());

// 使用新的搜索 composable
const { state: searchState, performSearch, resetSearch, copyLink } = useSearch();
const { settings } = useSettings();

// 搜索执行
async function onSearch() {
  if (!kw.value || searchState.value.loading) return;

  await performSearch({
    apiBase,
    keyword: kw.value,
    settings: {
      enabledPlugins: settings.value.enabledPlugins,
      enabledTgChannels: settings.value.enabledTgChannels,
      concurrency: settings.value.concurrency,
      pluginTimeoutMs: settings.value.pluginTimeoutMs,
    },
  });
}

// 平台信息
const platformName = (t: string): string => PLATFORM_INFO[t]?.name || t;
const platformColor = (t: string): string => PLATFORM_INFO[t]?.color || "#9ca3af";
const platformIcon = (t: string): string => PLATFORM_INFO[t]?.icon || "📦";

// 计算属性
const platforms = computed(() => Object.keys(searchState.value.merged));
const hasResults = computed(() => platforms.value.length > 0);

const groupedResults = computed(() => {
  const list: Array<{ type: string; items: any[] }> = [];
  const source =
    filterPlatform.value === "all"
      ? searchState.value.merged
      : { [filterPlatform.value]: searchState.value.merged[filterPlatform.value] || [] };
  for (const type of Object.keys(source)) {
    if (!source[type]?.length) continue;
    list.push({ type, items: source[type] || [] });
  }
  return list;
});

// 展开/收起
function isExpanded(type: string) {
  return expandedSet.value.has(type);
}

function handleToggle(type: string) {
  filterPlatform.value = type;
}

function visibleItems(type: string, items: any[]) {
  return isExpanded(type) ? items : items.slice(0, initialVisible);
}

// 排序
function sortItems(items: any[]) {
  const arr = [...items];
  switch (sortType.value) {
    case "date-desc":
      return arr.sort(
        (a, b) =>
          new Date(b.datetime || "1970-01-01").getTime() -
          new Date(a.datetime || "1970-01-01").getTime()
      );
    case "date-asc":
      return arr.sort(
        (a, b) =>
          new Date(a.datetime || "1970-01-01").getTime() -
          new Date(b.datetime || "1970-01-01").getTime()
      );
    case "name-asc":
      return arr.sort((a, b) =>
        String(a.note || "").localeCompare(String(b.note || ""), "zh-CN")
      );
    case "name-desc":
      return arr.sort((a, b) =>
        String(b.note || "").localeCompare(String(a.note || ""), "zh-CN")
      );
    default:
      return items;
  }
}

function visibleSorted(items: any[]) {
  return sortItems(items);
}
</script>

<style scoped>
.home {
  max-width: 1200px;
  margin: 24px auto 0;
  padding: 0 16px 16px;
}

.hero {
  text-align: center;
  padding: 24px 16px;
  border: 1px solid #e8e8e8;
  border-radius: 16px;
  background: linear-gradient(180deg, #fafafa, #f6faff);
}

.hero__logo img {
  width: 150px;
  height: 128px;
}

.hero__subtitle {
  color: #666;
  font-size: 14px;
}

.sticky-tabs {
  position: sticky;
  top: 0;
  z-index: 20;
  background: #fff;
  padding: 8px 0 6px;
  border-bottom: 1px solid #f0f0f0;
}

.results {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.empty .card {
  padding: 16px;
}

.empty__inner {
  color: #777;
  text-align: center;
}

.alert {
  background: #fff6f6;
  border: 1px solid #ffd1d1;
  color: #a40000;
  padding: 8px 10px;
  border-radius: 8px;
  margin-top: 12px;
}

/* 小屏优化 */
@media (max-width: 640px) {
  .home {
    margin-top: 12px;
    padding: 0 12px 12px;
  }

  .hero {
    padding: 16px 12px;
    border-radius: 12px;
  }

  .hero__subtitle {
    font-size: 13px;
  }

  .results {
    gap: 10px;
  }

  .sticky-tabs {
    top: env(safe-area-inset-top);
    padding-top: calc(6px + env(safe-area-inset-top));
  }
}
</style>
