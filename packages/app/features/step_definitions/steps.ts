/* tslint:disable: only-arrow-functions */
import { Given, TableDefinition, Then, When } from 'cucumber'
import { GitRepoInfo } from 'git-en-boite-core'
import { File } from 'git-en-boite-core'
import { BareRepoFactory, GetFiles } from 'git-en-boite-local-git'
import { Commit, GetRevision } from 'git-en-boite-local-git'
import {
  assertThat,
  containsInAnyOrder,
  equalTo,
  hasProperty,
  matchesPattern,
  not,
  contains,
} from 'hamjest'
import path from 'path'

Given('a remote repo with branches:', async function (branchesTable) {
  const branches = branchesTable.raw().map((row: string[]) => row[0])
  const repoId = (this.repoId = this.getNextRepoId())
  this.repoRemoteUrl = path.resolve(this.tmpDir, 'remote', repoId)
  const git = await new BareRepoFactory().open(this.repoRemoteUrl)
  for (const branchName of branches) {
    await git(Commit.toRefName(`refs/heads/${branchName}`).onBranch(branchName))
  }
})

Given('a remote repo with commits on the {string} branch', async function (branchName) {
  this.repoId = this.getNextRepoId()
  this.repoRemoteUrl = path.resolve(this.tmpDir, 'remote', this.repoId)
  const git = await new BareRepoFactory().open(this.repoRemoteUrl)
  await git(Commit.toRefName(`refs/heads/${branchName}`).onBranch(branchName))
})

When('a new commit is made on the {string} branch in the remote repo', async function (branchName) {
  const git = await new BareRepoFactory().open(this.repoRemoteUrl)
  await git(Commit.toRefName(`refs/heads/${branchName}`).onBranch(branchName))
  this.lastCommitRevision = await git(GetRevision.forBranchNamed(branchName))
})

Given('the remote repo has been connected', async function () {
  const repoInfo = { repoId: this.repoId, remoteUrl: this.repoRemoteUrl }
  await this.request.post('/repos').send(repoInfo).expect(202)
})

When('a consumer tries to connect to a bad remote URL', async function () {
  this.repoId = this.getNextRepoId()
  const repoInfo = { repoId: this.repoId, remoteUrl: 'a-bad-url' }
  const response = await this.request.post('/repos').send(repoInfo)
  this.lastResponseCode = response.res.statusCode
})

When('a consumer triggers a manual fetch of the repo', fetch)
Given('the repo has been fetched', fetch)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetch(this: any) {
  await this.request.post(`/repos/${this.repoId}`).expect(202)
}

When('a consumer commits a new file to the {string} branch', async function (branchName) {
  const file: File = {
    path: 'features/new.feature',
    content: 'Feature: New!',
  }
  this.file = file
  await this.request
    .post(`/repos/${this.repoId}/branches/${branchName}/commits`)
    .send(file)
    .set('Accept', 'application/json')
    .expect(200)
})

Then("the repo's branches should be:", async function (expectedBranchesTable: TableDefinition) {
  const expectedBranchNames = expectedBranchesTable.raw().map(row => row[0])
  const response = await this.request
    .get(`/repos/${this.repoId}`)
    .set('Accept', 'application/json')
    .expect(200)

  assertThat(
    (response.body as GitRepoInfo).branches.map(branch => branch.name),
    containsInAnyOrder(...expectedBranchNames),
  )
})

Then('the repo should have the new commit at the head of the {string} branch', async function (
  branchName,
) {
  const response = await this.request
    .get(`/repos/${this.repoId}`)
    .set('Accept', 'application/json')
    .expect(200)

  assertThat(
    (response.body as GitRepoInfo).branches.find(branch => branch.name === branchName).revision,
    equalTo(this.lastCommitRevision),
  )
})

Then('the repo should have a connection status of {string}', async function (
  expectedConnectionStatus: string,
) {
  const response = await this.request
    .get(`/repos/${this.repoId}`)
    .set('Accept', 'application/json')
    .expect(200)

  const repoInfo: GitRepoInfo = response.body
  assertThat(repoInfo, hasProperty('connectionStatus', equalTo(expectedConnectionStatus)))
})

Then('it should respond with an error', function () {
  assertThat(String(this.lastResponseCode), not(matchesPattern(/2\d\d/)))
})

Then('the file should be in the {string} branch of the remote repo', async function (branchName) {
  const git = await new BareRepoFactory().open(this.repoRemoteUrl)
  const files = await git(GetFiles.forBranchNamed(branchName))
  assertThat(files, contains(this.file))
})
