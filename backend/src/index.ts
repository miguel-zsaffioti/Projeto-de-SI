import { app } from './app'
import { env } from './config/env'

app.listen(env.porta, () => {
  console.log(`✅  Backend OTO rodando em http://localhost:${env.porta}`)
})
