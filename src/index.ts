import { Adapter } from 'koishi'
import { MinecraftBot } from './bot'
import WebSocketClient from './ws'

declare module 'koishi' {
  interface Modules {
    'adapter-minecraft': typeof import('.')
  }
}

export default Adapter.define('minecraft', MinecraftBot, WebSocketClient)
