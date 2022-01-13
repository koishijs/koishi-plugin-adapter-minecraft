import { Bot, Random, Schema, segment, Logger, sleep } from 'koishi'
import * as mineflayer from 'mineflayer'
import { AdapterConfig } from './utils'

const noop = async () => null

export interface BotConfig extends Bot.BaseConfig, mineflayer.BotOptions {}

export const BotConfig = Schema.object({
  host: Schema.string(),
  username: Schema.string(),
  password: Schema.string(),
  auth: Schema.string(),
  version: Schema.string(),
})

export class MinecraftBot extends Bot<BotConfig> {
  flayer: mineflayer.Bot

  static schema = AdapterConfig

  async sendMessage(channelId: string, content: string, guildId?: string) {
    const session = this.createSession({ channelId, content, guildId, subtype: guildId ? 'group' : 'private' })
    new Logger('mc').warn('Sending message: ' + content)
    
    if (await this.app.serial(session, 'before-send', session)) return
    content = segment.join(segment.parse(content).map(i => i.type !== 'text' 
      ? { type: 'text', data: { content: `[${i.type}]` } } 
      : i
    ))
    if (content.length > 512) content = content.substr(0, 512) + '...'
    if (channelId === '_public') {
      const lines = content.trim().split("\n");
      const numLineAtATime = 2;
      for (let i = 0; i < lines.length; i += numLineAtATime) {
        await this.flayer.chat(lines.slice(i, i + numLineAtATime).join('\n'))
        await sleep(800)
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
