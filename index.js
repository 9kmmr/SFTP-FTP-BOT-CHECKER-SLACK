require("dotenv").config();
const { App } = require('@slack/bolt');
let Client = require('ssh2-sftp-client');
const isIPv4 = require('net').isIPv4;

// Initializes your app with your bot token and signing secret
const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true, // add this
    appToken: process.env.SLACK_APP_TOKEN
});
//  running port
const port = process.env.PORT || 3000;

const checkDomainName = (str) => {
    return /^(?:(?:(?:[a-zA-z\-]+)\:\/{1,3})?(?:[a-zA-Z0-9])(?:[a-zA-Z0-9\-\.]){1,61}(?:\.[a-zA-Z]{2,})+|\[(?:(?:(?:[a-fA-F0-9]){1,4})(?::(?:[a-fA-F0-9]){1,4}){7}|::1|::)\]|(?:(?:[0-9]{1,3})(?:\.[0-9]{1,3}){3}))(?:\:[0-9]{1,5})?$/.test(str);
}

let ftp_expressions = [/(?<=ftp:\s).*?(?=\s+\b)/gsi, /(?<=ftp :\s).*?(?=\s+\b)/gsi, /(?<=ftp =\s).*?(?=\s+\b)/gsi, /(?<=ftp=\s).*?(?=\s+\b)/gsi, /(?<=ftp.\s).*?(?=\s+\b)/gsi,
    /(?<=ftp server:\s).*?(?=\s+\b)/gsi, /(?<=ftp server :\s).*?(?=\s+\b)/gsi,
    /(?<=url:\s).*?(?=\s+\b)/gsi,
    /(?<=link:\s).*?(?=\s+\b)/gsi,
    /(?<=ip:\s).*?(?=\s+\b)/gsi,
    /(?<=server:\s).*?(?=\s+\b)/gsi,
];

let port_expressions = [/(?<=port:\s).*?(?=\s+\b)/gsi, /(?<=port :\s).*?(?=\s+\b)/gsi, /(?<=port =\s).*?(?=\s+\b)/gsi, /(?<=port=\s).*?(?=\s+\b)/gsi, /(?<=port.\s).*?(?=\s+\b)/gsi];

let host_expressions = [/(?<=host:\s).*?(?=\s+\b)/gsi, /(?<=host :\s).*?(?=\s+\b)/gsi, /(?<=hostname:\s).*?(?=\s+\b)/gsi, /(?<=hostname :\s).*?(?=\s+\b)/gsi,
    /(?<=host =\s).*?(?=\s+\b)/gsi, /(?<=host=\s).*?(?=\s+\b)/gsi, /(?<=hostname=\s).*?(?=\s+\b)/gsi, /(?<=hostname =\s).*?(?=\s+\b)/gsi];

let username_expressions = [/(?<=username:\s).*?(?=\s+\b)/gsi, /(?<=username :\s).*?(?=\s+\b)/gsi, /(?<=username =\s).*?(?=\s+\b)/gsi, /(?<=username=\s).*?(?=\s+\b)/gsi,
    /(?<=user:\s).*?(?=\s+\b)/gsi, /(?<=user :\s).*?(?=\s+\b)/gsi, /(?<=login:\s).*?(?=\s+\b)/gsi, /(?<=user =\s).*?(?=\s+\b)/gsi, /(?<=user=\s).*?(?=\s+\b)/gsi,
    /(?<=login=\s).*?(?=\s+\b)/gsi, /(?<=login =\s).*?(?=\s+\b)/gsi,
    /(?<=ftp user: \s).*?(?=\s+\b)/gsi,
    /(?<=fid:\s).*?(?=\s+\b)/gsi
];

let password_expressions = [/(?<=password:\s).*?(?=\s+\b)/gsi, /(?<=password :\s).*?(?=\s+\b)/gsi, /(?<=password =\s).*?(?=\s+\b)/gsi, /(?<=password=\s).*?(?=\s+\b)/gsi,
    /(?<=pass:\s).*?(?=\s+\b)/gsi, /(?<=pass :\s).*?(?=\s+\b)/gsi, /(?<=pass =\s).*?(?=\s+\b)/gsi, /(?<=pass=\s).*?(?=\s+\b)/gsi,
    /(?<=ftp pass: \s).*?(?=\s+\b)/gsi,
    /(?<=pw: \s).*?(?=\s+\b)/gsi
];

let message_index = 0;
const reformatLinks = /\<(.*?)\|(.*?)\>/g;

const check = async ({ message, say }) => {
    var context_variables = {
        ftp: "",
        host: "",
        port: "",
        username: "",
        password: ""
    };
    try {


        for (let index = 0; index < ftp_expressions.length; index++) {
            const ftp_expression = ftp_expressions[index];
            let ftp_host = message.text.match(ftp_expression);
            if (ftp_host) {
                if (ftp_host[0].indexOf("|") !== -1) {
                    ftp_host = ftp_host[0].replace(reformatLinks, (_m, __url, text) => `${text}`);
                } else {
                    ftp_host = ftp_host[0];
                }
                context_variables.ftp = ftp_host;
            }
        }
        for (let index = 0; index < host_expressions.length; index++) {
            const host_expression = host_expressions[index];
            let host_host = message.text.match(host_expression);
            if (host_host) {
                if (host_host[0].indexOf("|") !== -1) {
                    host_host = host_host[0].replace(reformatLinks, (_m, __url, text) => `${text}`);
                } else {
                    host_host = host_host[0];
                }
                context_variables.host = host_host;
            }
        }
        for (let index = 0; index < port_expressions.length; index++) {
            const port_expression = port_expressions[index];
            const host_port = message.text.match(port_expression);
            if (host_port) {
                context_variables.port = host_port[0];
            }
        }
        for (let index = 0; index < username_expressions.length; index++) {
            const username_expression = username_expressions[index];
            let username = message.text.match(username_expression);
            if (username) {
                if (username[0].indexOf("|") !== -1) {
                    username = username[0].replace(reformatLinks, (_m, __url, text) => `${text}`);
                } else {
                    username = username[0];
                }
                context_variables.username = username;
            }
        }
        for (let index = 0; index < password_expressions.length; index++) {
            const password_expression = password_expressions[index];
            const password = message.text.match(password_expression);
            if (password) {
                context_variables.password = password[0];
            }
        }



        if (context_variables.username && context_variables.password && (context_variables.ftp || context_variables.host)) {

            let info = {
                host: (context_variables.host.length > context_variables.ftp.length ? context_variables.host : context_variables.ftp),
                port: context_variables.port ? context_variables.port : 21,
                username: context_variables.username,
                password: context_variables.password,

            };
            console.log("info: ", info)
            checkSFTP(info).then(async (checking) => {
                if (checking)
                    await say(`Hey there <@${message.user}>: SFTP/FTP info is correct & tested !`);
                else
                    await say(`Hey there <@${message.user}> : SFTP/FTP info is incorrect & can not connected !`);

            }).catch(async (__err) => {
                await say(`Hey there <@${message.user}> : SFTP/FTP info is incorrect & can not connected !`);
            })

        } else {
            console.log("missing variables")
            let checkingLines = checkByLine(message);
            if (checkingLines.ftp.length) {
                let checkingAll = [];
                let checked = 0;
                for (let index = 0; index < checkingLines.ftp.length; index++) {
                    let ftp = checkingLines.ftp[index];
                    let username = checkingLines.username[index];
                    let password = checkingLines.password[index];
                    let info = {
                        host: ftp,
                        port: context_variables.port ? context_variables.port : 21,
                        username: username,
                        password: password,

                    };
                    checkingAll.push(new Promise((resolve, reject) => {
                        checkSFTP(info).then(async (checking) => {
                            if (checking) {
                                checked++;
                                resolve(true)
                            } else
                                reject(false);

                        }).catch(async (__err) => {
                            reject(false)
                        })
                    }))
                }
                Promise.all(checkingAll).then(async () => {
                    if (checked) {
                        await say(`Hey there <@${message.user}>: SFTP/FTP info is correct & tested !`);
                    } else {
                        await say(`Hey there <@${message.user}> : SFTP/FTP info is incorrect & can not connected !`);
                    }
                }).catch(async (err) => {
                    await say(`Hey there <@${message.user}> : SFTP/FTP info is incorrect & can not connected !`);
                })
            } else {
                await say(`Hey there <@${message.user}> : SFTP/FTP info is incorrect & can not connected !`);
            }
        }
    } catch (error) {
        console.log("error in message: ", error)
    }
}

const checkByLine = (message) => {
    let alltexts = message.text.split(/\n/);
    let context_variables = {
        ftp: [],
        host: [],
        port: "",
        username: [],
        password: []
    };

    for (let [index, textLine] of alltexts.entries()) {
        if (textLine.indexOf("|") !== -1) {
            textLine = textLine.replace(reformatLinks, (_m, __url, text) => `${text}`);
        }
        console.log([textLine, isIPv4(textLine), checkDomainName(textLine)])
        if (isIPv4(textLine) || checkDomainName(textLine)) {
            console.log("host good:", textLine)
            context_variables.ftp.push(textLine);
            context_variables.host.push(textLine);
            context_variables.username.push(alltexts[index + 1]);
            context_variables.password.push(alltexts[index + 2]);
            if (!isNaN(Number(alltexts[index + 3]))) {
                context_variables.port = Number(alltexts[index + 3]);
            }
        }
    }

    return context_variables;
}


// Listens to incoming messages that contain "hello"
app.message(new RegExp("ftp", "i"), check);



(async () => {
    // Start app
    await app.start();

    console.log('⚡️ SFTP/FTP Checker Bot is running!');
})();



/**
 * @return {Boolean} Check if the sftp/ftp config is valid
 * @param {Object} checkData 
 */
async function checkSFTP(checkData) {

    const config = {
        host: checkData.host ? checkData.host : "",
        port: checkData.port ? checkData.port : "",
        username: checkData.username ? checkData.username : "",
        password: checkData.password ? checkData.password : "",
        readyTimeout: 5000,
        retries: 1
    }
    console.log("config check: ", config)

    let sftp = new Client();

    return sftp.connect(config).then(() => {
        return true;
    }).catch(err => {
        console.log("error: ", err)
        throw err;
    });
}

// * TODO: Add Unit test, export as module

// * TODO: using Neutral Language Processing to extract infos

// * TODO: If message contain ppk key, download it and load it to the checker

// * TODO: CHECK DATA SFTP IN FILES PDF, DOCX, TXT, ...

// * TODO: Add CI/CD
