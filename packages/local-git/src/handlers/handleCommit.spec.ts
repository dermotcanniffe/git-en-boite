import fs from 'fs'
import { AsyncCommand, Dispatch, messageDispatch } from 'git-en-boite-message-dispatch'
import { containsString, containsStrings, fulfilled, not, promiseThat } from 'hamjest'
import path from 'path'
import { dirSync } from 'tmp'

import { handleCommit, handleInit } from '.'
import { GitDirectory } from '../git_directory'
import { Commit, Fetch, Init, SetOrigin } from '../operations'
import { handleFetch } from './handleFetch'
import { handleSetOrigin } from './handleSetOrigin'

type Protocol = [
  AsyncCommand<Commit>,
  AsyncCommand<Init>,
  AsyncCommand<Fetch>,
  AsyncCommand<SetOrigin>,
]

describe('handleCommit', () => {
  const branchName = 'a-branch'
  let root: string
  let repoPath: string
  let git: Dispatch<Protocol>
  let repo: GitDirectory

  beforeEach(async () => {
    root = dirSync().name
    repoPath = path.resolve(root, 'a-repo-id')
    fs.mkdirSync(repoPath, { recursive: true })
    repo = new GitDirectory(repoPath)
    git = messageDispatch<Protocol>().withHandlers(repo, [
      [Commit, handleCommit],
      [Init, handleInit],
      [Fetch, handleFetch],
      [SetOrigin, handleSetOrigin],
    ])
    await git(Init.bareRepo())
  })

  afterEach(function () {
    if (this.currentTest.state === 'failed' && this.currentTest.err)
      this.currentTest.err.message = `\nFailed using tmp directory:\n${root}\n${this.currentTest.err?.message}`
  })

  it('creates an empty commit with the given message', async () => {
    const refName = `refs/heads/${branchName}`
    await git(Commit.toRefName(refName).onBranch(branchName).withMessage('A commit message'))
    await promiseThat(
      repo.read('log', [refName, '--oneline']),
      fulfilled(containsString('A commit message')),
    )
  })

  it('creates a commit containing the given files', async () => {
    const file = { path: 'a.file', content: 'some content' }
    const refName = `refs/heads/${branchName}`
    await git(Commit.toRefName(refName).withFiles([file]).onBranch(branchName))
    await promiseThat(
      repo.read('ls-tree', [refName, '-r', '--name-only']),
      fulfilled(containsString(file.path)),
    )
  })

  it('creates a commit using the existing tree on the remote branch', async () => {
    const remoteRefName = `refs/remotes/origin/${branchName}`
    const existingFile = { path: 'a.file', content: 'some content' }
    await git(Commit.toRefName(remoteRefName).withFiles([existingFile]).onBranch(branchName))

    const refName = `refs/pending-commits/${branchName}`
    const otherFile = { path: 'b.file', content: 'another content' }
    await git(Commit.toRefName(refName).withFiles([otherFile]).onBranch(branchName))

    await promiseThat(
      repo.read('ls-tree', [refName, '-r', '--name-only']),
      fulfilled(containsStrings(existingFile.path, otherFile.path)),
    )
  })

  it('creates a commit after an existing one on a remote', async () => {
    const refName = `refs/heads/${branchName}`
    const remoteRefName = `refs/remotes/origin/${branchName}`
    await git(Commit.toRefName(remoteRefName).withMessage('initial commit').onBranch(branchName))
    await git(Commit.toRefName(refName).withMessage('A commit message').onBranch(branchName))
    await promiseThat(
      repo.read('log', [refName, '--oneline']),
      fulfilled(containsStrings('initial commit', 'A commit message')),
    )
  })

  it('clears the index before committing the index with no parent', async () => {
    const file = { path: 'a.file', content: 'some content' }
    const refName = `refs/heads/${branchName}`
    const objectId = await repo.read('hash-object', ['-w', '--stdin'], { stdin: 'Junk file' })
    await repo.exec('update-index', ['--add', '--cacheinfo', '100644', objectId, 'junk.file'])
    await git(Commit.toRefName(refName).withFiles([file]).onBranch(branchName))

    await promiseThat(
      repo.read('ls-tree', [refName, '-r', '--name-only']),
      fulfilled(not(containsString('junk.file'))),
    )
  })
})
