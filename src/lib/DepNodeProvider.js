const vscode = require('vscode')
const createJenkins = require('jenkins')
class Dependency extends vscode.TreeItem {
  constructor (label, collapsibleState, data) {
    super(label, collapsibleState)
    this.data = data
    if (data && data.type === 'job') {
      this.command = {
        command: 'jenkinsExplorer.publish',
        title: 'jenkins publish',
        arguments: [data]
      }
    }
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
    const { username, password, url } = vscode.workspace.getConfiguration('jenkins')
    if (username && password && url) {
      let arr = url.split('//')
      let baseUrl = arr[0] + '//' + username + ':' + password + '@' + arr[1]
      this.jenkins = createJenkins({
        baseUrl,
        crumbIssuer: true,
        promisify: true
      })
    }
  }
  buildVersion (name) {
    vscode.window.showInformationMessage(`开始发布：${name}`)
    return this.jenkins.job.build(name)
      .then(this.jenkins.queue.item)
      .then(res => this.createLog(name, res.executable.number))
  }
  createLog (name, number) {
    const log = this.jenkins.build.logStream(name, number)
    this.terminals[name].log.show(true)
    const self = this
    return new Promise(function (resolve, reject) {
      log.on('data', function (text) {
        self.terminals[name].log.appendLine(text)
      })
      log.on('error', reject)
      log.on('end', resolve)
    })
  }
  refresh () {
    this.createJ()
    this._onDidChangeTreeData.fire()
  }
  showMessage ({ name, lastFailedBuild, lastSuccessfulBuild }) {
    const lastFailStr = `上次失败构建${lastFailedBuild ? lastFailedBuild.number : '(无)'}`
    const lastSuccessStr = `上次成功构建${lastSuccessfulBuild ? lastSuccessfulBuild.number : '(无)'}`
    return vscode.window.showInformationMessage(
      `${name}构建详情`,
      lastFailStr,
      lastSuccessStr, '立即构建')
      .then((select) => {
        if (select === '立即构建') {
          return this.buildVersion(name)
            .then(() => vscode.window.showInformationMessage(`${name}：发布成功`))
            .catch(err => vscode.window.showInformationMessage(`${name}：发布失败 ${err.message}`))
        }
        if (select === lastFailStr && lastFailedBuild) {
          return this.createLog(name, lastFailedBuild.number)
        }
        if (select === lastSuccessStr && lastSuccessfulBuild) {
          return this.createLog(name, lastSuccessfulBuild.number)
        }
        return Promise.reject(new Error('取消'))
      })
  }
  publish ({ name }) {
    if (this.terminals[name] && this.terminals[name].isStart) {
      this.terminals[name].log.show()
      return vscode.window.showInformationMessage('正在构建中')
    }
    if (this.terminals[name]) {
      this.terminals[name].isStart = true
    } else {
      this.terminals[name] = {
        isStart: true,
        log: vscode.window.createOutputChannel(name)
      }
    }
    this.jenkins.job.get('开发环境-usercenter-web-发布')
      .then(this.showMessage.bind(this))
      .then(() => {
        this.terminals[name].isStart = false
      }).catch(() => {
        this.terminals[name].isStart = false
      })
  }
  getChildren (element) {
    if (!this.jenkins) return []
    if (!element) {
      return this.jenkins.view.list().then(res => {
        return res.map(obj => {
          obj.type = 'view'
          return new Dependency(obj.name, vscode.TreeItemCollapsibleState.Collapsed, obj)
        })
      }).catch(err => {
        console.log(err)
      })
    } else {
      return this.jenkins.view.get(element.label).then(res => {
        return res.jobs.map(obj => {
          obj.type = 'job'
          return new Dependency(
            obj.name, vscode.TreeItemCollapsibleState.None,
            obj)
        })
      })
    }
  }
  getTreeItem (element) {
    return element
  }
}

module.exports = DepNodeProvider
