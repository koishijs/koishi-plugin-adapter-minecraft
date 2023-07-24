import { Adapter, Awaitable, Session } from 'koishi'
import { MinecraftBot } from './bot'

export * from './ws'
export * from './bot'

declare module 'koishi' {
  interface Events {
    'minecraft/before-listen'(bot: MinecraftBot): void
    'minecraft/before-dispatch'(session?: Session): Awaitable<void | boolean>
  }
}

export default MinecraftBot
