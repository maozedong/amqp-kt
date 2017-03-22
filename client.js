require('dotenv-safe').config()
const amqp = require('amqplib')

const url = process.env.AMQP_URL
const ex = 'general'
const queue = 'ostap.' + process.pid
let conn, ch

amqp.connect(url)
  .then(_conn => {
    conn = _conn
    console.log(`connection to ${url} established!`)
    return conn.createChannel()
  })
  .then(_ch => {
    ch = _ch
    console.log('channel created!')
    return ch.assertExchange(ex, 'fanout')
  })
  .then(() => {
    console.log(`exchange ${ex} asserted!`)
    return ch.assertQueue(queue, {exclusive: true})
  })
  .then(() => {
    console.log(`queue ${queue} created!`)
    return ch.bindQueue(queue, ex, '')
  })
  .then(() => {
    console.log(`queue ${queue} binded to '${ex}'!`)
    ch.consume(queue, (msg) => {
      const content = JSON.parse(msg.content.toString())
      console.log(`[${content.date}] [${content.from}] ${content.text}`)
    }, {noAck: true})
  })
  .catch((error) => {
    console.error(error)
    conn.close()
      .then(() => process.exit(1))
  })

function stopHandler () {
  console.log(`Stopping ${process.pid}...`)
  conn.close()
    .then(() => {
      console.log('connection closed')
      console.log(`${process.pid} stopped`)
      process.exit()
    })

  setTimeout(() => {
    console.info(`${process.pid} stopped forcefully, not all connections closed`)
    process.exit()
  }, 3000)
}

process.once('SIGTERM', stopHandler)
process.once('SIGINT', stopHandler)
process.once('SIGHUP', stopHandler)
