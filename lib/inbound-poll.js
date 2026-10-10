'use strict';
function browserSnapshot(since) {
  const collection = window.require('WAWebCollections').Msg;
  if (!collection?.getModelsArray || !window.WWebJS?.getMessageModel) throw new Error('La recepción de WhatsApp aún no está disponible.');
  const all = collection.getModelsArray();
  const candidates = all.filter(message => {
    const sender = message.from?._serialized || message.from || message.id?.remote?._serialized;
    return message.id?.fromMe === false && message.type === 'chat' && Number.isFinite(message.t) && message.t >= since && /^\d+@(?:c\.us|lid)$/.test(sender);
  }).sort((a,b) => a.t - b.t).slice(-200);
  return { loaded: all.length, messages: candidates.map(message => window.WWebJS.getMessageModel(message)) };
}
async function readCachedMessages(client, since) {
  const snapshot = await client.pupPage.evaluate(browserSnapshot, since);
  const { Message } = require('whatsapp-web.js');
  return { loaded: snapshot.loaded, messages: snapshot.messages.map(raw => new Message(client, raw)) };
}
function createInboundPoll({ client, getConfig, isActive, receive, onError, interval = 5000, readMessages = readCachedMessages, onSnapshot = () => {}, startedAt = Date.now() }) {
  let stopped = false, running = false, timer;
  async function tick() {
    if (stopped || running || !isActive()) return;
    const config = getConfig();
    if (!config.enabled || config.mode !== 'allowed') return;
    running = true;
    try {
      const snapshot = await readMessages(client, Math.floor(startedAt / 1000) - 2);
      if (stopped || !isActive()) return;
      onSnapshot({ loaded: snapshot.loaded, recent: snapshot.messages.length });
      for (const message of snapshot.messages) {
        if (stopped || !isActive()) break;
        await receive(message, 'consulta periódica');
      }
    } catch (error) { if (!stopped && isActive()) onError(error); }
    finally { running = false; }
  }
  return {
    tick,
    start() { if (!timer && !stopped) { timer = setInterval(() => void tick(), interval); timer.unref?.(); } },
    stop() { stopped = true; clearInterval(timer); timer = null; }
  };
}
module.exports = { createInboundPoll, browserSnapshot, readCachedMessages };
