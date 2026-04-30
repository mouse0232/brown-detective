/**
 * GET /api/health
 * 健康检查
 */

export async function onRequest() {
  return new Response(JSON.stringify({
    status: 'ok',
    service: 'CreepJS Anti-Bot API',
    timestamp: Date.now(),
    version: '1.0.0'
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    }
  });
}
