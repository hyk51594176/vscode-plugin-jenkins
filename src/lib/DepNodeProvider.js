const vscode = require('vscode')
const createJenkins = require('jenkins')
class Dependency extends vscode.TreeItem {
  constructor (
    label,
    collapsibleState,
    data,
    command = {}
  ) {
    super(label, collapsibleState, command)
    this.data = data
    this.command = command
  }
}

class DepNodeProvider {
  constructor (workspaceRoot) {
    this._onDidChangeTreeData = new vscode.EventEmitter()
    this.onDidChangeTreeData = this._onDidChangeTreeData.event
    vscode.commands.registerCommand('jenkinsExplorer.refreshEntry', () => this.refresh())
    vscode.commands.registerCommand('jenkinsExplorer.publish', (data) => this.publish(data))
    this.terminals = {}
    this.createJ()
  }
  createJ () {
    const { name, password, url } = vscode.workspace.getConfiguration('jenkins')
    if (name && password && url) {
      let arr = url.split('//')
      let baseUrl = arr[0] + '//' + name + ':' + password + '@' + arr[1]
      this.jenkins = createJenkins({
        baseUrl,
        crumbIssuer: true,
        promisify: true
      })
    }
  }
  buildVersion (name, printlog) {
    return this.jenkins.job.build(name)
      .then(this.jenkins.queue.item)
      .then(res => this.createLog(name, res.executable.number, printlog))
  }
  createLog (name, number, printlog) {
    printlog.show()
    const log = this.jenkins.build.logStream(name, number)
    return new Promise(function (resolve, reject) {
      log.on('data', function (text) {
        printlog.appendLine(text)
      })
      log.on('error', reject)
      log.on('end', resolve)
    })
  }
  refresh () {
    this.createJ()
    this._onDidChangeTreeData.fire()
  }
  publish (data) {
    if (this.terminals[data.name]) return
    this.terminals[data.name] = true
    const printlog = vscode.window.createOutputChannel('jenkins/' + data.name)

    this.buildVersion(data.name, printlog).then(() => {
      this.terminals[data.name] = false
    }).catch((err) => {
      printlog.appendLine(err.message)
      this.terminals[data.name] = false
    })
  }
  getChildren (element) {
    if (!this.jenkins) return []
    if (!element) {
      return this.jenkins.view.list().then(res => {
        return res.map(obj => {
          return new Dependency(obj.name, vscode.TreeItemCollapsibleState.Collapsed, obj)
        })
      }).catch(err => {
        console.log(err)
      })
    } else {
      return this.jenkins.view.get(element.label).then(res => {
        return res.jobs.map(obj => {
          return new Dependency(
            obj.name, vscode.TreeItemCollapsibleState.None,
            obj,
            {
              command: 'jenkinsExplorer.publish',
              title: 'jenkins publish',
              arguments: [obj]
            })
        })
      })
    }
  }
  getTreeItem (element) {
    return element
  }
}

module.exports = DepNodeProvider
