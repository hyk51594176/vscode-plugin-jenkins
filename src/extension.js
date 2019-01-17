const vscode = require('vscode');
const DepNodeProvider = require('./lib/DepNodeProvider')
/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	console.log('Congratulations, your extension "vscode-plugin-jenkins" is now active!');
	const depNode = new DepNodeProvider()
	vscode.window.registerTreeDataProvider('jenkinsExplorer', depNode);
}
exports.activate = activate;

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
