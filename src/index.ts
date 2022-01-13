import { Adapter, Session } from 'koishi'
import { MinecraftBot } from './bot'
import WebSocketClient from './ws'

declare module 'koishi' {
  interface Modules {
    'adapter-minecraft': typeof import('.')
  }
  interface EventMap {
    'minecraft/before-listen'(bot: MinecraftBot): void
    'minecraft/before-message'(session?: Session): Session | undefined
  }
}

export default Adapter.define('minecraft', MinecraftBot, WebSocketClient)
