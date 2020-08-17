import fs from 'fs'
import {
  assertThat,
  hasProperty,
  matchesPattern,
  promiseThat,
  rejected,
  startsWith,
  containsString,
} from 'hamjest'
import path from 'path'
import { dirSync } from 'tmp'

import { GitDirectory } from './git_directory'

describe(GitDirectory.name, () => {
  let root: string

  beforeEach(() => (root = dirSync().name))
  afterEach(function () {
    if (this.currentTest.state === 'failed' && this.currentTest.err)
      this.currentTest.err.message = `\nFailed using tmp directory:\n${root}\n${this.currentTest.err?.message}`
  })

  describe('executing git commands', () => {
    let repoPath: string
    beforeEach(() => {
      repoPath = path.resolve(root, 'a-repo')
      fs.mkdirSync(repoPath, { recursive: true })
    })

    it('returns a promise of the result', async () => {
      const repo = new GitDirectory(repoPath)
      const result = await repo.exec('init')
      assertThat(result.stdout, startsWith('Initialized empty Git repository'))
    })

    it('raises any error', async () => {
      const repo = new GitDirectory(repoPath)
      await promiseThat(
        repo.exec('not-a-command'),
        rejected(hasProperty('message', matchesPattern('is not a git command'))),
      )
    })

    it('never asks for a prompt @slow', async () => {
      const repo = new GitDirectory(repoPath)
      await promiseThat(
        repo.exec('ls-remote', ['https://github.com/smartbear/git-en-boite-test-private.git']),
        rejected(),
      )
    }).timeout(10000)

    it('is not possible to ask for terminal prompt @slow', async () => {
      const repo = new GitDirectory(repoPath)
      await promiseThat(
        repo.exec('ls-remote', ['https://github.com/smartbear/git-en-boite-test-private.git'], {
          env: { GIT_TERMINAL_PROMPT: 1 },
        }),
        rejected(),
      )
    }).timeout(10000)

    describe('options', () => {
      it('passes options', async () => {
        const repo = new GitDirectory(repoPath)
        await repo.exec('init')
        await repo.exec('commit', ['--allow-empty', '-m', 'A commit'], {
          env: { GIT_REFLOG_ACTION: 'testing' },
        })
        assertThat(await repo.read('reflog', ['-1']), containsString('testing: A commit'))
      })

      it('uses options from the constructor', async () => {
        const repo = new GitDirectory(repoPath, {
          env: { GIT_REFLOG_ACTION: 'testing' },
        })
        await repo.exec('init')
        await repo.exec('commit', ['--allow-empty', '-m', 'A commit'])
        assertThat(await repo.read('reflog', ['-1']), containsString('testing: A commit'))
      })

      it('overrides options from the constructor', async () => {
        const repo = new GitDirectory(repoPath, {
          env: { GIT_REFLOG_ACTION: 'testing' },
        })
        await repo.exec('init')
        await repo.exec('commit', ['--allow-empty', '-m', 'A commit'], {
          env: { GIT_REFLOG_ACTION: 'amazing' },
        })
        assertThat(await repo.read('reflog', ['-1']), containsString('amazing: A commit'))
      })
    })
  })
})
