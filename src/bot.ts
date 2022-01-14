import { Bot, Random, Schema, segment, sleep } from 'koishi'
import * as mineflayer from 'mineflayer'
import { AdapterConfig } from './utils'

const noop = async () => null
export interface BotConfig extends Bot.BaseConfig, mineflayer.BotOptions {
  rateLimit: number
  receiveMessage: false | Bot.Author
}
export const BotConfig: Schema<Partial<mineflayer.BotOptions>> = Schema.intersect([
  Schema.object({
    username: Schema.string().required().description('minecraft username'),
    port: Schema.number().default(25565).description('minecraft server port, default to 25565'),
    auth: Schema.union([
      Schema.const('mojang' as const),
      Schema.const('microsoft' as const),
    ]).default('mojang'),
    password: Schema.string().description('minecraft password, comment out if you want to log into online-mode=false servers'),
    host: Schema.string().default('localhost').description('minecraft server ip/domain'),
    skipValidation: Schema.boolean().default(true),
    logErrors: Schema.boolean().default(false),
  }).description('mineflayer common options'),
  Schema.object({
    rateLimit: Schema.number().default(0).description('Min interval between 2 message sent. Use milliseconds.'),
    author: Schema.union([
      Schema.const(false),
      Schema.object({
        userId: Schema.string().default('_'),
        isBot: Schema.boolean().default(true),
        avatar: Schema.string(),
        username: Schema.string().required(),
      }),
    ]).default(false).description('Specify the user profile for the server if you want to receive serve message.'),
  }),
])

export class MinecraftBot extends Bot<BotConfig> {
  flayer: mineflayer.Bot

  static schema = AdapterConfig

  async sendMessage(channelId: string, content: string, guildId?: string) {
    const session = this.createSession({ channelId, content, guildId, subtype: guildId ? 'group' : 'private' })
    if (await this.app.serial(session, 'before-send', session)) return
    content = segment.join(segment.parse(content).map(i => i.type !== 'text'
      ? { type: 'text', data: { content: ` [${i.type}] ` } }
      : i,
    ))
    content = segment.unescape(content)
    if (content.length > 512) content = content.substring(0, 512) + '...'
    if (channelId === '_public') {
      if (this.config.rateLimit) {
        for (const l of content.trim().split('\n')) {
          await this.flayer.chat(l)
          await sleep(this.config.rateLimit)
        }
      } else {
        await this.flayer.chat(content)
      }
    }
    else this.flayer.whisper(channelId, content)

    this.app.emit(session, 'send', session)
    return Random.id()
  }

  async sendPrivateMessage(channelId: string, content: string) {
    return this.sendMessage(channelId, content)
  }

  handleFriendRequest = noop
  handleGuildMemberRequest = noop
  handleGuildRequest = noop
  editMessage = noop
  deleteMessage = noop
  deleteFriend = noop
  getMessage = noop
  getUser = noop
  getChannel = noop
  getGuildMember = noop
  getGuild = noop

  async getGuildMemberList() {
    return []
  }

  async getGuildList() {
    return []
  }

  async getChannelList() {
    return []
  }
}
