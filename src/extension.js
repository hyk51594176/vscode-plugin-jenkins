const vscode = require('vscode')
const DepNodeProvider = require('./lib/DepNodeProvider')
/**
 * @param {vscode.ExtensionContext} context
 */
function activate (context) {
  console.log('Congratulations, your extension "vscode-plugin-jenkins" is now active!')
  vscode.window.registerTreeDataProvider('jenkinsExplorer', new DepNodeProvider())
}
exports.activate = activate

function deactivate () {}

module.exports = {
  activate,
  deactivate
}
