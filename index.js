require("dotenv").config();
const { App } = require('@slack/bolt');
let Client = require('ssh2-sftp-client');
// Initializes your app with your bot token and signing secret
const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true, // add this
    appToken: process.env.SLACK_APP_TOKEN
});
//  running port
const port = process.env.PORT || 3000;



let ftp_expressions = [ /(?<=ftp:\s).*?(?=\s+\b)/gsi, /(?<=ftp :\s).*?(?=\s+\b)/gsi, /(?<=ftp =\s).*?(?=\s+\b)/gsi, /(?<=ftp=\s).*?(?=\s+\b)/gsi, /(?<=ftp.\s).*?(?=\s+\b)/gsi, 
/(?<=ftp server:\s).*?(?=\s+\b)/gsi , /(?<=ftp server :\s).*?(?=\s+\b)/gsi ,
/(?<=url:\s).*?(?=\s+\b)/gsi,
/(?<=link:\s).*?(?=\s+\b)/gsi,
/(?<=ip:\s).*?(?=\s+\b)/gsi,
/(?<=server:\s).*?(?=\s+\b)/gsi,
];

let port_expressions = [ /(?<=port:\s).*?(?=\s+\b)/gsi, /(?<=port :\s).*?(?=\s+\b)/gsi, /(?<=port =\s).*?(?=\s+\b)/gsi, /(?<=port=\s).*?(?=\s+\b)/gsi, /(?<=port.\s).*?(?=\s+\b)/gsi ];

let host_expressions =  [ /(?<=host:\s).*?(?=\s+\b)/gsi, /(?<=host :\s).*?(?=\s+\b)/gsi,  /(?<=hostname:\s).*?(?=\s+\b)/gsi, /(?<=hostname :\s).*?(?=\s+\b)/gsi,
/(?<=host =\s).*?(?=\s+\b)/gsi, /(?<=host=\s).*?(?=\s+\b)/gsi , /(?<=hostname=\s).*?(?=\s+\b)/gsi , /(?<=hostname =\s).*?(?=\s+\b)/gsi];

let username_expressions = [ /(?<=username:\s).*?(?=\s+\b)/gsi, /(?<=username :\s).*?(?=\s+\b)/gsi, /(?<=username =\s).*?(?=\s+\b)/gsi, /(?<=username=\s).*?(?=\s+\b)/gsi, 
/(?<=user:\s).*?(?=\s+\b)/gsi, /(?<=user :\s).*?(?=\s+\b)/gsi,  /(?<=login:\s).*?(?=\s+\b)/gsi, /(?<=user =\s).*?(?=\s+\b)/gsi, /(?<=user=\s).*?(?=\s+\b)/gsi , 
/(?<=login=\s).*?(?=\s+\b)/gsi,  /(?<=login =\s).*?(?=\s+\b)/gsi,
/(?<=ftp user: \s).*?(?=\s+\b)/gsi ,
/(?<=fid:\s).*?(?=\s+\b)/gsi
];

let password_expressions= [ /(?<=password:\s).*?(?=\s+\b)/gsi, /(?<=password :\s).*?(?=\s+\b)/gsi, /(?<=password =\s).*?(?=\s+\b)/gsi, /(?<=password=\s).*?(?=\s+\b)/gsi,  
/(?<=pass:\s).*?(?=\s+\b)/gsi, /(?<=pass :\s).*?(?=\s+\b)/gsi, /(?<=pass =\s).*?(?=\s+\b)/gsi, /(?<=pass=\s).*?(?=\s+\b)/gsi ,
/(?<=ftp pass: \s).*?(?=\s+\b)/gsi ,
/(?<=pw: \s).*?(?=\s+\b)/gsi 
];

let message_index = 0;
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
            ftp_host = message.text.match(ftp_expression);
            if (ftp_host) {
                if (ftp_host[0].indexOf("|") !== -1) {
                    reformatLinks = /\<(.*?)\|(.*?)\>/g;
                    ftp_host = ftp_host[0].replace(reformatLinks, (_m, url, text) => `${text}`);                    
                } else {
                    ftp_host = ftp_host[0];
                }
                context_variables.ftp=ftp_host;
            }
        }
        for (let index = 0; index < host_expressions.length; index++) {
            const host_expression = host_expressions[index];
            host_host = message.text.match(host_expression);
            if (host_host) {
                if (host_host[0].indexOf("|") !== -1) {
                    reformatLinks = /\<(.*?)\|(.*?)\>/g;
                    host_host = host_host[0].replace(reformatLinks, (_m, url, text) => `${text}`);   
                } else {
                    host_host = host_host[0];
                }
                context_variables.host=host_host;
            }
        }
        for (let index = 0; index < port_expressions.length; index++) {
            const port_expression = port_expressions[index];
            const port = message.text.match(port_expression);
            if (port) {
                context_variables.port=port[0];
            }
        }
        for (let index = 0; index < username_expressions.length; index++) {
            const username_expression = username_expressions[index];
            username = message.text.match(username_expression);
            if (username) {
                if (username[0].indexOf("|") !== -1) {
                    reformatLinks = /\<(.*?)\|(.*?)\>/g;
                    username = username[0].replace(reformatLinks, (_m, url, text) => `${text}`);                    
                } else {
                    username = username[0];
                }
                context_variables.username=username;
            }
        }
        for (let index = 0; index < password_expressions.length; index++) {
            const password_expression = password_expressions[index];
            const password = message.text.match(password_expression);
            if (password) {
                context_variables.password=password[0];
            }
        }
        console.log(context_variables);


        if ( context_variables.username &&  context_variables.password &&  (context_variables.ftp || context_variables.host ) ) {

            info = {
                host: (context_variables.host.length > context_variables.ftp.length ? context_variables.host : context_variables.ftp ),
                port: context_variables.port? context_variables.port:21,
                username: context_variables.username,
                password: context_variables.password        
            };
            console.log("info: ", info)
            checkSFTP(info).then( async (check) => {
                if (check)             
                    await say(`Hey there <@${message.user}>: SFTP/FTP info is correct & tested !`);
                else         
                    await say(`Hey there <@${message.user}> : SFTP/FTP info is incorrect & can not connected !`);

            }).catch( async (err) => {
                await say(`Hey there <@${message.user}> : SFTP/FTP info is incorrect & can not connected !`);
            })
            
        } else {
            console.log("missing variables")            
        }
    } catch (error) {
        console.log("error in message: ",error) 
    }
}
// Listens to incoming messages that contain "hello"
app.message(new RegExp("ftp", "i"), check);



(async () => {
    // Start app
    await app.start(port);

    console.log('⚡️ SFTP/FTP Checker Bot is running!');
})();



/**
 * @return {Boolean} Check if the sftp/ftp config is valid
 * @param {Object} checkData 
 */
 async function checkSFTP(checkData){

    const config = {
        host: checkData.host?checkData.host:"",
        port: checkData.port?checkData.port:"",
        username: checkData.username?checkData.username:"",
        password: checkData.password?checkData.password:"",
        readyTimeout: 10000, 
        retries: 3
    }
    console.log("config check: ", config)
    
    let sftp = new Client();

    return sftp.connect(config).then(() => {
        return true;
    }).catch(err => {
        console.log("error: ",err)
        throw err;
    }); 
}

// * TODO: using Neutral Language Processing to extract infos

// * TODO: If message contain ppk key, download it and load it to the checker


//* TODO : CHECK DATA SFTP IN FILES PDF, DOCX, TXT, ...
