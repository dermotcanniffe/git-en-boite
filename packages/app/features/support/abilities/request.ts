import request from 'supertest'
import { Before, After } from 'cucumber'
import { Server } from 'http'
import { startWebServer } from 'git-en-boite-client-adapter-web'

let webServer: Server

Before(function () {
  webServer = startWebServer(this.app, 8888)
  this.request = request(webServer)
})

After(function () {
  webServer.close()
})
