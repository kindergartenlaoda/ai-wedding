import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 说明：
// - 该中间件为“可选启用”的服务端登录保护示例。
// - 仅当设置环境变量 ENABLE_SSR_GUARD="true" 时才生效。
// - 通过检测 NextAuth 的 session cookie 判断登录态。

export function middleware(req: NextRequest) {
  // 未开启则直接放行
  if (process.env.ENABLE_SSR_GUARD !== 'true') {
    return NextResponse.next();
  }

  const sessionToken =
    req.cookies.get('next-auth.session-token')?.value ||
    req.cookies.get('__Secure-next-auth.session-token')?.value;

  if (!sessionToken) {
    const redirectUrl = new URL('/', req.url);
    redirectUrl.searchParams.set('redirect', req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

// 仅拦截需要保护的页面
export const config = {
  matcher: ['/dashboard', '/results/:path*', '/create', '/create/:path*'],
};

