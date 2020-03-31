/* tslint:disable: only-arrow-functions */
import { ClientApp } from '../../src/entity/ClientApp'
import { createConnection, Connection } from 'typeorm'

import { Given, When, Then, Before, TableDefinition } from 'cucumber'
import { Actor } from '../support/screenplay'
import { Repository } from 'typeorm'
import { User } from '../../src/entity/User'
import { createConfig } from '../../src/config'

const config = createConfig(process.env)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const withConnection = async (fn: any): Promise<any> => {
  const connection = await createConnection(config.database)
  const result = await fn(connection)
  await connection.close()
  return result
}

Before(() => withConnection((connection: Connection) => connection.dropDatabase()))

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { assertThat, equalTo } = require('hamjest')

const CreateUser = {
  withId: (userId: string) => async ({
    name,
    getRepository,
  }: {
    name: string
    getRepository: (type: object) => Repository<ClientApp>
  }): Promise<void> => {
    const repository = getRepository(ClientApp)
    const user = new User()
    user.id = userId
    const app: ClientApp = await repository.findOneOrFail(name)
    app.users = app.users.concat([user])
    await repository.save(app)
  },
}

const CreateApp = {
  named: (name: string) => async ({
    getRepository,
  }: {
    getRepository: (type: object) => Repository<ClientApp>
  }): Promise<void> => {
    const repository = await getRepository(ClientApp)
    const app = new ClientApp()
    app.id = name
    await repository.save(app)
  },
}

Given('an app {app}', async function (app: Actor) {
  await withConnection(async (connection: Connection) => {
    const getRepository = connection.getRepository.bind(connection)
    const cucumber: Actor = new Actor('cucumber').withAbilities({
      getRepository,
    })
    await cucumber.attemptsTo(CreateApp.named(app.name))
  })
})

When('{app} creates a user {word}', async function (app: Actor, userId: string) {
  await withConnection(async (connection: Connection) => {
    const getRepository = connection.getRepository.bind(connection)
    await app.withAbilities({ getRepository }).attemptsTo(CreateUser.withId(userId))
  })
})

Then("the {app} app's users should be:", async function (
  app: Actor,
  expectedUsers: TableDefinition,
) {
  const users = await withConnection(async (connection: Connection) => {
    const getRepository = connection.getRepository.bind(connection)
    const repository = await getRepository(ClientApp)
    const clientApp: ClientApp = await repository.findOneOrFail(app.name)
    return clientApp.users
  })
  for (let i = 0; i < expectedUsers.raw().length; i++) {
    const row: string[] = expectedUsers.raw()[i]
    assertThat(users[i].id, equalTo(row[0]))
  }
})

Given('a {app} repo {string} with branches:', function (app, string, dataTable) {
  // TODO: Write code here that turns the phrase above into concrete actions
})

Given('a user {word} has valid credentials for the repo', function (userId) {
  // TODO: Write code here that turns the phrase above into concrete actions
})

When('{word} connects {app} to the repo', function (userId, app) {
  // TODO: Write code here that turns the phrase above into concrete actions
})

Then("{word} can see that the repo's branches are:", async function (
  userId: string,
  expectedBranches: TableDefinition,
) {
  const { request } = this
  const repoId = 'a-repo-id'
  const token = 'a-token'
  const response = await request
    .get(`/repos/${repoId}/branches`)
    .auth(userId, token)
    .set('Accept', 'application/json')
    .expect(200)
  assertThat(expectedBranches.raw()[0], equalTo(response.body))
})
