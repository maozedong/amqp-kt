require('dotenv-safe')
const amqp = require('amqplib')

const ex = 'general'
let conn, ch

amqp.connect(process.env.AMQP_URL)
  .then(_conn => {
    conn = _conn
    console.log('connection established!')
    return conn.createChannel()
  })
  .then(_ch => {
    ch = _ch
    console.log('channel created!')
    return ch.assertExchange(ex, 'fanout')
  })
  .then(() => {
    console.log('exchange asserted!')
    const msg = {
      from: 'spam-bot',
      text: 'Live hard die young'
    }

    setInterval(() => {
      msg.date = new Date()
      const content = new Buffer(JSON.stringify(msg))
      console.log('publishing message')
      ch.publish(ex, '', content)
    }, 3000)
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
