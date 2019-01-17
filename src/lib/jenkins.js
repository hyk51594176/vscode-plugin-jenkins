const createJenkins = require('jenkins')
const vscode = require('vscode')

const jenkins = createJenkins({
  baseUrl: 'https://yukai.han:qq19870110@jenkins.st-creditech.com',
  crumbIssuer: true,
  promisify: true
})
const { name, password, url } = vscode.workspace.getConfiguration('jenkins')

const build = function (name) {
  return jenkins.job.build(name)
    .then(jenkins.queue.item)
    .then(res => createLog(res.executable.number))
}

function createLog (data) {
  var log = jenkins.build.logStream('开发环境-usercenter-web-发布', data)
  return new Promise(function (resolve, reject) {
    const strArr = []
    log.on('data', function (text) {
      process.stdout.write(text)
      // console.log(text)
      strArr.push(text)
    })

    log.on('error', reject)
    log.on('end', resolve.bind(null, strArr))
  })
}

module.exports = {
  jenkins,
  build
}
