import { Adapter, Session, Logger } from 'koishi'
import { createBot } from 'mineflayer'
import { MinecraftBot } from './bot'

export const CHANNEL_ID: string = '_public'
const logger = new Logger('minecraft')

export class WsClient extends Adapter.WsClient<MinecraftBot> {
  async prepare() {
    const config = this.bot.config
    const url = 'minecraft://' + config.host + ':' + config.port + '/' + config.username
    logger.info('Connect to MC server: ' + url)
    this.bot.flayer = createBot(config)
    this.bot.flayer.once('spawn', () => {
      this.bot.selfId = this.bot.username = this.bot.nickname = this.bot.flayer.player.username
    })
    const self = this
    return {
      url,
      addEventListener(name, event) {
        if (name === 'open') {
          self.bot.flayer.once('spawn', () => {
            return event()
          })
        }
        if (name === 'error') {
          self.bot.flayer.on('error', (error) => {
            return event({ error })
          })
        }
        if (name === 'close') {
          self.bot.flayer.on('end', (reason) => {
            return event({ code: 'flayer ended', reason: 'flayer ended: ' + reason })
          })
        }
      },
      close() {
        self.bot.flayer.end()
      },
    } as any
  }

  async dispatchMCMsg(session: Session) {
    if (await this.ctx.serial('minecraft/before-dispatch', session)) return
    return this.bot.dispatch(session)
  }

  async accept() {
    const common: Partial<Session> = {
      type: 'message',
      selfId: this.bot.flayer.username,
    }

    const channelId = CHANNEL_ID
    const channelName = this.bot.config.author ? this.bot.config.author.username : 'chat'
    const guildName = this.bot.config.author ? this.bot.config.author.username : 'server'

    await this.ctx.serial('minecraft/before-listen', this.bot)

    this.bot.flayer.on('chat', (author, content, translate, jsonMsg, matches) => {
      if (author === this.bot.flayer.username) return
      this.dispatchMCMsg(new Session(this.bot, {
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

    this.bot.flayer.on('whisper', (author, content, translate, jsonMsg, matches) => {
      this.dispatchMCMsg(new Session(this.bot, {
        ...common,
        content,
        author: { userId: author, username: author },
        channelId: author,
      }))
    })

    const serverUser = this.bot.config.author
    if (serverUser) {
      this.bot.flayer.on('messagestr', (message, position, jsonMsg) => {
        if (position === 'chat') return
        this.dispatchMCMsg(new Session(this.bot, {
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
      this.bot.flayer.setControlState('jump', true)
      this.bot.flayer.setControlState('jump', false)
    }, 5000)
  }
}
