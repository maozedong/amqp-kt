require('dotenv-safe').config()
const amqp = require('amqplib')

const url = process.env.AMQP_URL
const ex = 'general'
const queue = 'ostap.' + process.pid
let conn, ch

// -----------vorpal config----------------
const vorpal = require('vorpal')()
vorpal
  .mode('msg')
  .init((args, callback) => {
    vorpal.log('Msg mode.\nYou can now directly enter arbitrary msg. To exit, type `exit`.')
    callback()
  })
  .action(sendMessage)

vorpal
  .delimiter('amqp: ')
  .show()
// -----------vorpal config END----------------

// TODO: implement msg publishing
function sendMessage (text, callback) {
  // this.log(text)
  // this.log('Damn, no one sees it!')
  const msg = {
    text,
    from: 'ostap',
    date: new Date()
  }
  ch.publish(ex, '', new Buffer(JSON.stringify(msg)))
  callback()
}

amqp.connect(url)
  .then(_conn => {
    conn = _conn
    vorpal.log(`connection to ${url} established!`)
    return conn.createChannel()
  })
  .then(_ch => {
    ch = _ch
    vorpal.log('channel created!')
    return ch.assertExchange(ex, 'fanout')
  })
  .then(() => {
    vorpal.log(`exchange ${ex} asserted!`)
    return ch.assertQueue(queue, {exclusive: true})
  })
  .then(() => {
    vorpal.log(`queue ${queue} created!`)
    return ch.bindQueue(queue, ex, '')
  })
  .then(() => {
    vorpal.log(`queue ${queue} binded to '${ex}'!`)
    ch.consume(queue, (msg) => {
      const content = JSON.parse(msg.content.toString())
      vorpal.log(`[${content.date}] [${content.from}] ${content.text}`)
    }, {noAck: true})
  })
  .catch((error) => {
    vorpal.log(error)
    conn.close()
      .then(() => process.exit(1))
  })

function stopHandler () {
  vorpal.log(`Stopping ${process.pid}...`)
  conn.close()
    .then(() => {
      vorpal.log('connection closed')
      vorpal.log(`${process.pid} stopped`)
      process.exit()
    })

  setTimeout(() => {
    vorpal.log(`${process.pid} stopped forcefully, not all connections closed`)
    process.exit()
  }, 3000)
}

process.once('SIGTERM', stopHandler)
process.once('SIGINT', stopHandler)
process.once('SIGHUP', stopHandler)
