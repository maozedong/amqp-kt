require('dotenv-safe').config()
const amqp = require('amqplib')

const url = process.env.AMQP_URL
const ex = 'general'
const from = 'annoying bot'
const text = 'Live fast die young'

let conn, ch

amqp.connect(url)
  .then(_conn => {
    conn = _conn
    console.log(`connection to '${url}' established!`)
    return conn.createChannel()
  })
  .then(_ch => {
    ch = _ch
    console.log('channel created!')
    return ch.assertExchange(ex, 'fanout')
  })
  .then(() => {
    console.log(`exchange '${ex}' asserted!`)

    setInterval(() => {
      const msg = {
        from,
        text,
        date: new Date()
      }
      const content = new Buffer(JSON.stringify(msg))
      console.log('publishing annoying message')
      ch.publish(ex, '', content)
    }, 5000)
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
