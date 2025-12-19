type CacheRecord<T> = { value: T; expireAt: number };

export interface MemoryCacheOptions {
  maxSize?: number; // 最大缓存条目数
  cleanupInterval?: number; // 清理间隔（毫秒）
}

export class MemoryCache<T = unknown> {
  private store = new Map<string, CacheRecord<T>>();
  private options: Required<MemoryCacheOptions>;
  private lastCleanup = 0;

  constructor(options: MemoryCacheOptions = {}) {
    this.options = {
      maxSize: options.maxSize ?? 1000, // 默认 1000 条
      cleanupInterval: options.cleanupInterval ?? 5 * 60 * 1000, // 默认 5 分钟
    };
  }

  get(key: string): { hit: boolean; value?: T } {
    this.maybeCleanup();

    const rec = this.store.get(key);
    if (!rec) return { hit: false };

    if (rec.expireAt > Date.now()) {
      // 更新访问顺序（LRU）
      this.store.delete(key);
      this.store.set(key, rec);
      return { hit: true, value: rec.value };
    }

    // 已过期，删除
    this.store.delete(key);
    return { hit: false };
  }

  set(key: string, value: T, ttlMs: number): void {
    this.maybeCleanup();

    // 如果 key 已存在，先删除（保持 LRU 顺序）
    if (this.store.has(key)) {
      this.store.delete(key);
    }

    // 检查容量限制
    if (this.store.size >= this.options.maxSize) {
      // 删除最旧的条目（Map 保持插入顺序）
      const firstKey = this.store.keys().next().value;
      if (firstKey) {
        this.store.delete(firstKey);
      }
    }

    this.store.set(key, { value, expireAt: Date.now() + Math.max(0, ttlMs) });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  // 获取当前缓存大小
  get size(): number {
    return this.store.size;
  }

  // 获取统计信息
  getStats() {
    const now = Date.now();
    let active = 0;
    let expired = 0;

    for (const [key, rec] of this.store) {
      if (rec.expireAt > now) {
        active++;
      } else {
        expired++;
      }
    }

    return {
      total: this.store.size,
      active,
      expired,
      maxSize: this.options.maxSize,
    };
  }

  // 定期清理过期条目
  private maybeCleanup(): void {
    const now = Date.now();
    if (now - this.lastCleanup < this.options.cleanupInterval) {
      return;
    }

    this.lastCleanup = now;
    const expiredKeys: string[] = [];

    for (const [key, rec] of this.store) {
      if (rec.expireAt <= now) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.store.delete(key);
    }

    if (expiredKeys.length > 0) {
      console.log(
        `[MemoryCache] Cleaned up ${expiredKeys.length} expired entries. Current size: ${this.store.size}`
      );
    }
  }
}
