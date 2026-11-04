import { onRequest as __api_bot_ts_onRequest } from "/Users/maksimremezov/Desktop/kishlak-tg/functions/api/bot.ts"
import { onRequest as __api_sync_ts_onRequest } from "/Users/maksimremezov/Desktop/kishlak-tg/functions/api/sync.ts"

export const routes = [
    {
      routePath: "/api/bot",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_bot_ts_onRequest],
    },
  {
      routePath: "/api/sync",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_sync_ts_onRequest],
    },
  ]