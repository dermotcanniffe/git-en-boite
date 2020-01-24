import React from 'react'
import { Alignment, Navbar, Tree, HTMLSelect } from "@blueprintjs/core"
import { fetchBranches, fetchFiles } from './api'

const generateTree = (paths) =>
  paths.map(({ id, attributes: { path } }) => ({ id, label: path, icon: "document" }))

const prettyBranchName = (name) => name.split('/').slice(-1)[0]

function App() {
  const [files, setFiles] = React.useState([])
  const [branches, setBranches] = React.useState([])
  React.useEffect(() => {
    (async function () {
      setFiles(await fetchFiles())
    })()
  }, [])
  React.useEffect(() => {
    (async function () {
      setBranches(await fetchBranches())
    })()
  }, [])
  return (
    <div className="App">
      <header className="App-header">
        <Navbar>
          <Navbar.Group align={Alignment.LEFT}>
            <Navbar.Heading>Select a branch</Navbar.Heading>
            <Navbar.Divider />
            <HTMLSelect>
              {branches.map(({ id, attributes: { name } }) => <option key={id}>{prettyBranchName(name)}</option>)}
            </HTMLSelect>
          </Navbar.Group>
        </Navbar>
        <Tree contents={generateTree(files)} />
      </header>
    </div>
  );
}

export default App
