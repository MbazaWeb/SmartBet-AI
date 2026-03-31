import app from './app.js'
const port = Number(process.env.PORT || 8787)

const server = app.listen(port, () => {
  console.log(`SmartBet AI backend listening on http://127.0.0.1:${port}`)
})

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `SmartBet AI backend could not start because port ${port} is already in use. Stop the existing backend process or set PORT to a different value.`,
    )
    process.exit(1)
  }

  console.error('SmartBet AI backend failed to start.', error)
  process.exit(1)
})