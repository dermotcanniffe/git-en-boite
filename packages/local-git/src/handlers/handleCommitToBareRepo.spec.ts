import childProcess from 'child_process'
import fs from 'fs'
import { AsyncCommand, Dispatch, messageDispatch } from 'git-en-boite-message-dispatch'
import { containsString, fulfilled, hasProperty, promiseThat } from 'hamjest'
import path from 'path'
import { dirSync } from 'tmp'
import { promisify } from 'util'

import { handleCommitToBareRepo, handleInit } from '.'
import { GitDirectory } from '../git_directory'
import { Commit, Init } from '../operations'

const exec = promisify(childProcess.exec)

type Protocol = [AsyncCommand<Commit>, AsyncCommand<Init>]

describe('handleCommitToBareRepo', () => {
  let root: string
  const branchName = 'a-branch'

  beforeEach(() => (root = dirSync().name))
  afterEach(function () {
    if (this.currentTest.state === 'failed' && this.currentTest.err)
      this.currentTest.err.message = `\nFailed using tmp directory:\n${root}\n${this.currentTest.err?.message}`
  })

  const openRepo = (repoPath: string) => {
    fs.mkdirSync(repoPath, { recursive: true })
    const repo = new GitDirectory(repoPath)
    return messageDispatch<Protocol>().withHandlers(repo, [
      [Commit, handleCommitToBareRepo],
      [Init, handleInit],
    ])
  }

  let repoPath: string
  let git: Dispatch<Protocol>

  beforeEach(async () => {
    repoPath = path.resolve(root, 'a-repo-id')
    git = await openRepo(repoPath)
    await git(Init.bareRepo())
  })

  it('creates an empty commit with the given message', async () => {
    await git(Commit.withMessage('A commit message'))
    await promiseThat(
      exec(`git log main --oneline`, { cwd: repoPath }),
      fulfilled(hasProperty('stdout', containsString('A commit message'))),
    )
  })

  it('creates a commit containing the given files', async () => {
    const file = { path: 'a.file', content: 'some content' }
    await git(Commit.newFile(file).toBranch(branchName))
    await promiseThat(
      exec(`git ls-tree ${branchName} -r --name-only`, { cwd: repoPath }),
      fulfilled(hasProperty('stdout', containsString(file.path))),
    )
  })
})
