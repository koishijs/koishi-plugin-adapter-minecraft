import { Adapter, Session, Logger, sleep } from 'koishi'
import { createBot } from 'mineflayer'
import { BotConfig, MinecraftBot } from './bot'
import { AdapterConfig } from './utils'

declare module 'koishi' {
  interface Modules {
    'adapter-minecraft': typeof import('.')
  }
}

export default class WebSocketClient extends Adapter.WebSocketClient<BotConfig, AdapterConfig> {
  static schema = BotConfig

  async prepare(bot: MinecraftBot) {
    const config = {
      skipValidation: true,
      host: '1.1.1.1', // minecraft server ip
      username: 'bot', // minecraft username
      password: '12345678', // minecraft password, comment out if you want to log into online-mode=false servers
      port: 25565, // only set if you need a port that isn't 25565
      ...bot.config,
    }
    const url = 'minecraft://' + config.host + ':' + config.port + '/' + config.username
    new Logger('mc').info("Connect to MC server: " + url)
    bot.flayer = createBot(config);
    return {
      url,
      on(name, event) {
        if (name === 'open') bot.flayer.on('login', () => {
          new Logger('mc').success("Mc logged in: " + config.username)
          return event()
        })
        if (name === 'error') bot.flayer.on('error', (err) => {
          new Logger('mc').warn('error: ' + err)
          return event('' + err)
        })
        if (name === 'close') bot.flayer.on('end', (reason) => {
          new Logger('mc').warn('close: ' + reason);
          new Logger('mc').warn('Will retry in 60s');
          delete bot.flayer;

          sleep(60000).then(() => {
            new Logger('mc').info("Connect to MC server: " + url)
            bot.flayer = createBot(config);
          });
        })
      },
    } as any
  }

  async accept(bot: MinecraftBot) {
    bot.resolve()

    const common: Partial<Session> = {
      type: 'message',
      selfId: bot.flayer.username,
    }

    bot.flayer.on('chat', (author, content, translate, jsonMsg, matches) => {
      if (author === bot.flayer.username) return
      // bot.selfId = bot.flayer.username
      new Logger('mc').warn('Rev message: ' + author + content)
      new Logger('mc').warn('bot.flayer.username: ' + bot.selfId)
      this.dispatch(new Session(bot, {
        ...common,
        subtype: 'group',
        content,
        author: { userId: author },
        channelId: '_public',
        guildId: '_public',
      }))
    })

    bot.flayer.on('whisper', (author, content, translate, jsonMsg, matches) => {
      this.dispatch(new Session(bot, {
        ...common,
        content,
        author: { userId: author },
        channelId: author,
      }))
    })

    setInterval(() => {
      // Keep alive
      bot.flayer.setControlState('jump', true)
      bot.flayer.setControlState('jump', false)
    }, 5000)
  }
}
