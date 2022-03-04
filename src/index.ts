import { Adapter, Awaitable } from 'koishi'
import { MinecraftBot } from './bot'
import WebSocketClient from './ws'

declare module 'koishi' {
  interface Modules {
    'adapter-minecraft': typeof import('.')
  }

  interface EventMap {
    'minecraft/before-listen'(bot: MinecraftBot): void
    'minecraft/before-dispatch'(session?: Session): Awaitable<void | boolean>
  }
}

export default Adapter.define('minecraft', MinecraftBot, WebSocketClient)
