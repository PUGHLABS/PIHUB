import app from './src/app.js'
import { config } from './src/config/index.js'

app.listen(config.port, () => {
  console.log(`PiVault API running on port ${config.port}`)
})
