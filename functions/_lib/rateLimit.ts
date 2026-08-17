/**
 * 边缘限流（Upstash Redis + @upstash/ratelimit）。
 *
 * 设计取舍：
 * - 未配置 UPSTASH_REDIS_REST_URL/TOKEN 时 **fail-open**（放行），
 *   保证本地开发与未接入 Redis 的环境不被阻断；生产务必配置。
 * - Upstash 调用异常同样 fail-open：限流失效优于服务不可用。
 * - 标识符默认取 cf-connecting-ip（Cloudflare 边缘注入，难以伪造）。
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export interface RateLimitEnv {
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining?: number;
  /** 被限流时的建议重试秒数。 */
  retryAfterSeconds?: number;
}

const redisCache = new WeakMap<RateLimitEnv, Redis>();
const limiterCache = new Map<string, Ratelimit>();

function getRedis(env: RateLimitEnv): Redis | null {
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  let redis = redisCache.get(env);
  if (!redis) {
    redis = new Redis({ url, token });
    redisCache.set(env, redis);
  }
  return redis;
}

/** 客户端 IP（Cloudflare 注入）；取不到时退化为全局桶。 */
export function clientIp(request: Request): string {
  return request.headers.get("cf-connecting-ip") ?? "unknown-ip";
}

/**
 * 限流检查。
 * @param bucket  逻辑桶名，如 "auth/login"；与 IP 组合成最终 key。
 * @param limit   窗口内允许次数。
 * @param windowSeconds 窗口大小（秒）。
 */
export async function checkRateLimit(
  env: RateLimitEnv,
  request: Request,
  bucket: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const redis = getRedis(env);
  if (!redis) return { allowed: true };

  const cacheKey = `${bucket}:${limit}:${windowSeconds}`;
  let limiter = limiterCache.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
      analytics: false,
    });
    limiterCache.set(cacheKey, limiter);
  }

  try {
    const identifier = `${clientIp(request)}:${bucket}`;
    const result = await limiter.limit(identifier);
    return {
      allowed: result.success,
      remaining: result.remaining,
      retryAfterSeconds: result.success
        ? undefined
        : Math.max(1, Math.ceil(windowSeconds / limit)),
    };
  } catch {
    // Upstash 故障 → fail-open，避免连带故障。
    return { allowed: true };
  }
}

/** 便捷包装：被限流时返回 429 Response，否则返回 null。 */
export async function rateLimitOr429(
  env: RateLimitEnv,
  request: Request,
  bucket: string,
  limit: number,
  windowSeconds: number
): Promise<Response | null> {
  const result = await checkRateLimit(env, request, bucket, limit, windowSeconds);
  if (result.allowed) return null;
  return new Response(
    JSON.stringify({ error: "Too many requests, please slow down" }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        ...(result.retryAfterSeconds
          ? { "Retry-After": String(result.retryAfterSeconds) }
          : {}),
      },
    }
  );
}
