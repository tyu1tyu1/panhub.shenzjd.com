<template>
  <div class="card">
    <div class="card__header">
      <div class="badge" :style="{ background: color }">{{ icon }}</div>
      <h3 class="card__title">{{ title }}</h3>
      <span class="card__count">{{ items.length }} 个资源</span>
      <button
        v-if="canToggleCollapse && !expanded && items.length > initialVisible"
        class="link"
        @click="$emit('toggle')">
        展开
      </button>
    </div>
    <ul class="card__list">
      <li v-for="(r, idx) in visibleItems" :key="idx" class="item">
        <a
          class="item__title"
          :href="r.url"
          target="_blank"
          rel="noopener noreferrer nofollow"
          >{{ r.note || r.url }}</a
        >
        <div class="item__meta">
          <span class="pill">{{ formatDate(r.datetime) || "时间未知" }}</span>
          <span v-if="r.password" class="pill pill--ok"
            >提取码: {{ r.password }}</span
          >
          <button class="link" @click.prevent="$emit('copy', r.url)">
            复制
          </button>
        </div>
      </li>
    </ul>
    <div v-if="!expanded && items.length > initialVisible" class="card__footer">
      <button class="btn btn--ghost" @click="$emit('toggle')">
        显示更多 ({{ items.length - initialVisible }})
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  title: string;
  color: string;
  icon: string;
  items: any[];
  expanded: boolean;
  initialVisible: number;
  canToggleCollapse?: boolean;
}>();
defineEmits(["toggle", "copy"]);

const visibleItems = computed(() =>
  props.expanded ? props.items : props.items.slice(0, props.initialVisible)
);

function formatDate(d?: string) {
  if (!d) return "";
  const dt = new Date(d);
  return isNaN(dt.getTime())
    ? ""
    : dt.toLocaleDateString() + " " + dt.toLocaleTimeString();
}
</script>

<style scoped>
.card {
  background: #fff;
  border: 1px solid #eee;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}
.card__header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid #f1f1f1;
}
.badge {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 14px;
}
.card__title {
  font-size: 16px;
  font-weight: 700;
}
.card__count {
  margin-left: auto;
  color: #666;
  font-size: 13px;
}
.link {
  background: transparent;
  border: 0;
  color: #0a58ff;
  cursor: pointer;
  padding: 4px 6px;
}
.card__list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.item {
  padding: 12px;
  border-bottom: 1px solid #f3f3f3;
}
.item:last-child {
  border-bottom: none;
}
.item__title {
  color: #0a58ff;
  text-decoration: none;
}
.item__title:hover {
  text-decoration: underline;
}
.item__meta {
  margin-top: 6px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}
.item__title {
  display: inline-block;
  word-break: break-all;
  overflow-wrap: anywhere;
}
.pill {
  font-size: 12px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  border-radius: 999px;
  padding: 2px 8px;
  color: #333;
}
.pill--ok {
  background: rgba(52, 199, 89, 0.15);
  border-color: rgba(52, 199, 89, 0.25);
  color: #22c55e;
}
.card__footer {
  padding: 10px;
  text-align: center;
}
.btn {
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #111;
  border-radius: 10px;
  cursor: pointer;
}
.btn--ghost {
  background: transparent;
}
</style>
