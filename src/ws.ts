import { Adapter, Session } from 'koishi'
import { createBot } from 'mineflayer'
import { BotConfig, MinecraftBot } from './bot'
import { AdapterConfig } from './utils'

export const CHANNEL_ID: string = '_public'

export default class WebSocketClient extends Adapter.WebSocketClient<BotConfig, AdapterConfig> {
  static schema = BotConfig

  async prepare(bot: MinecraftBot) {
    const config = bot.config
    const url = 'minecraft://' + config.host + ':' + config.port + '/' + config.username
    bot.logger.info('Connect to MC server: ' + url)
    bot.flayer = createBot(config)
    bot.flayer.once('spawn', () => {
      bot.selfId = bot.username = bot.nickname = bot.flayer.player.username
    })
    return {
      url,
      on(name, event) {
        if (name === 'open') bot.flayer.once('spawn', () => {
          return event()
        })
        if (name === 'error') bot.flayer.on('error', (err) => {
          return event(err)
        })
        if (name === 'close') bot.flayer.on('end', (reason) => {
          return event('flayer ended', 'flayer ended: ' + reason)
        })
      },
      close() {
        bot.flayer.end()
      },
    } as any
  }

  async accept(bot: MinecraftBot) {
    bot.resolve()

    const common: Partial<Session> = {
      type: 'message',
      selfId: bot.flayer.username,
    }

    const channelId = CHANNEL_ID
    const channelName = bot.config.receiveMessage ? bot.config.receiveMessage.username : 'chat'
    const guildName = bot.config.receiveMessage ? bot.config.receiveMessage.username : 'server'

    await this.ctx.serial('minecraft/before-listen', bot)

    this.dispatch = (session: Session) => {
      const processed = this.ctx.chain('minecraft/before-message', session)
      if (processed) return super.dispatch(processed)
    }

    bot.flayer.on('chat', (author, content, translate, jsonMsg, matches) => {
      if (author === bot.flayer.username) return
      this.dispatch(new Session(bot, {
        ...common,
        subtype: 'group',
        content,
        author: { userId: author, username: author },
        channelId,
        channelName,
        guildId: channelId,
        guildName,
      }))
    })

    bot.flayer.on('whisper', (author, content, translate, jsonMsg, matches) => {
      this.dispatch(new Session(bot, {
        ...common,
        content,
        author: { userId: author, username: author },
        channelId: author,
      }))
    })

    const serverUser = bot.config.receiveMessage
    if (serverUser) {
      bot.flayer.on('messagestr', (message, position, jsonMsg) => {
        if (position === 'chat') return
        this.dispatch(new Session(bot, {
          ...common,
          subtype: 'group',
          content: message,
          author: serverUser,
          channelId,
          channelName,
          guildId: channelId,
          guildName,
        }))
      })
    }

    setInterval(() => {
      // Keep alive
      bot.flayer.setControlState('jump', true)
      bot.flayer.setControlState('jump', false)
    }, 5000)
  }
}
