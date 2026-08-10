import {
  type AuthEnv
} from "../_lib/auth";

interface Context {
  request: Request;
  env: AuthEnv;
}

// onRequest 方法会处理该路径下的所有请求类型 (GET, POST 等)
export async function onRequest(context: Context) {
  // context 包含 request, env, params 等上下文数据
  const { request, env } = context;
  /*  */
  return new Response(JSON.stringify({ message: "Hello from Cloudflare Pages Function!" }), {
    headers: {
      "Content-Type": "application/json;charset=UTF-8",
    },
  });
}