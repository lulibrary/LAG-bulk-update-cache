const parseMessages = (messages = []) =>
  messages.map((message) =>
    JSON.parse(message.body))

module.exports = parseMessages
