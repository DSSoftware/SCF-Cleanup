const chalk = require('chalk');

module.exports = {
    sendLog(message) {
        console.log(`${chalk.inverse(' Debug ')} ${message}`);
    },

    sendSuccess(message) {
        console.log(`${chalk.bgGreenBright.black(' Success ')} ${chalk.greenBright(message)}`);
    },

    sendWarn(message) {
        console.log(`${chalk.bgYellow.black(' Warning ')} ${chalk.yellow(message)}`);
    },

    sendError(message) {
        console.log(`${chalk.bgRedBright.black(' Error ')} ${chalk.redBright(message)}`);
    },

    async sleep(timeout) {
        return new Promise((resolve) => setTimeout(resolve, timeout));
    }
}