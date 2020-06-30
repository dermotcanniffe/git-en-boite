import { Dispatch } from 'git-en-boite-message-dispatch'
import { fulfilled, promiseThat, rejected } from 'hamjest'
import path from 'path'
import { dirSync } from 'tmp'

import { BareRepoFactory, NonBareRepoFactory } from '.'
import { Commit, Connect, NonBareRepoProtocol } from './operations'

describe(BareRepoFactory.name, () => {
  const factory = new BareRepoFactory()
  const nonBareRepoFactory = new NonBareRepoFactory()
  // verifyRepoFactoryContract(factory, nonBareRepoFactory)

  let root: string

  beforeEach(() => (root = dirSync().name))
  afterEach(function () {
    if (this.currentTest.state === 'failed' && this.currentTest.err)
      this.currentTest.err.message = `\nFailed using tmp directory:\n${root}\n${this.currentTest.err?.message}`
  })

  describe(Connect.name, () => {
    let remoteUrl: string
    let origin: Dispatch<NonBareRepoProtocol>

    beforeEach(async () => {
      remoteUrl = path.resolve(root, 'remote', 'a-repo-id')
      origin = await nonBareRepoFactory.open(remoteUrl)
      await origin(Commit.withAnyMessage())
    })

    it('connects to a valid remote', async () => {
      const repoPath = path.resolve(root, 'a-repo-id')
      const git = await factory.open(repoPath)
      await promiseThat(git(Connect.toUrl(remoteUrl)), fulfilled())
    })

    it('fails with a bad remote', async () => {
      const repoPath = path.resolve(root, 'a-repo-id')
      const git = await factory.open(repoPath)
      await promiseThat(git(Connect.toUrl('a-bad-url')), rejected())
    })
  })
})
