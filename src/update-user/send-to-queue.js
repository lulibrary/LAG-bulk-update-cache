const { Queue } = require('@lulibrary/lag-utils')

const sendMessagesToQueue = (url, messages) => {
  const targetQueue = new Queue({ url })
  return Promise.all(messages.map((message) => targetQueue.sendMessage(message)))
}

module.exports = sendMessagesToQueue
