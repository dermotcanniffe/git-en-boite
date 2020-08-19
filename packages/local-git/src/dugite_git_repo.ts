import { File, GitRepo, PendingCommitRef, Refs, Author } from 'git-en-boite-core'
import { Dispatch } from 'git-en-boite-message-dispatch'

import { RepoFactory } from './repo_factory'
import { RepoProtocol, Commit, Connect, Fetch, GetRefs, Push } from './operations'

export class DugiteGitRepo implements GitRepo {
  static async openGitRepo(path: string): Promise<GitRepo> {
    const dispatch = await new RepoFactory().open(path)
    return new DugiteGitRepo(dispatch)
  }

  protected constructor(private readonly git: Dispatch<RepoProtocol>) {}

  commit(commitRef: PendingCommitRef, files: File[], author: Author): Promise<void> {
    return this.git(Commit.toCommitRef(commitRef).withFiles(files).byAuthor(author))
  }

  async push(commitRef: PendingCommitRef): Promise<void> {
    return this.git(Push.pendingCommitFrom(commitRef))
  }

  setOriginTo(remoteUrl: string): Promise<void> {
    return this.git(Connect.toUrl(remoteUrl))
  }

  fetch(): Promise<void> {
    return this.git(Fetch.fromOrigin())
  }

  getRefs(): Promise<Refs> {
    return this.git(GetRefs.all())
  }

  close(): Promise<void> {
    return Promise.resolve()
  }
}
