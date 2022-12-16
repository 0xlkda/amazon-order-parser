class FileQueueError extends Error {
  type = 'FileQueueError'
  constructor(message) {
    super(`FileQueueError: ${message}`)
  }
}

module.exports = {
  async enqueue(file) {
    const success = !!file && Math.random() >= 0.5
    const fatal = !!file && Math.random() >= 0.7
    
    if (fatal) throw new Error("002")

    return success
      ? Promise.resolve()
      : Promise.resolve(new FileQueueError('001'))
  },
}
