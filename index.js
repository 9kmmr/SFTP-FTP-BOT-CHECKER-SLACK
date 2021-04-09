require("dotenv").config();
const { App } = require('@slack/bolt');
const { Client } = require('ssh2-sftp-client');
// Initializes your app with your bot token and signing secret
const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET
});
//  running port
const port = process.env.PORT || 3000;

var context_variables = [];

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

// Listens to incoming messages that contain "hello"
app.message('ftp', async ({ message, say }) => {
    try {
        
        for (let index = 0; index < ftp_expressions.length; index++) {
            const ftp_expression = ftp_expressions[index];
            const ftp_host = message.text.match(ftp_expression);
            if (ftp_host) {
                context_variables["ftp"]=ftp_host;
            }
        }
        for (let index = 0; index < host_expressions.length; index++) {
            const host_expression = host_expressions[index];
            const host_host = message.text.match(host_expression);
            if (host_host) {
                context_variables["host"]=host_host;
            }
        }
        for (let index = 0; index < port_expressions.length; index++) {
            const port_expression = port_expressions[index];
            const port = message.text.match(port_expression);
            if (port) {
                context_variables["port"]=port;
            }
        }
        for (let index = 0; index < username_expressions.length; index++) {
            const username_expression = username_expressions[index];
            const username = message.text.match(username_expression);
            if (username) {
                context_variables["username"]=username;
            }
        }
        for (let index = 0; index < password_expressions.length; index++) {
            const password_expression = password_expressions[index];
            const password = message.text.match(password_expression);
            if (password) {
                context_variables["password"]=password;
            }
        }
        console.log(context_variables);
       
    
        if ( context_variables["username"] &&  context_variables["pass"] &&  (context_variables["ftp"] || context_variables["host"] ) ) {
    
            info = {
                host: (context_variables["host"].length > context_variables["ftp"].length ? context_variables["host"] : context_variables["ftp"] ),
                port: context_variables["port"]? context_variables["port"]:21,
                username: context_variables["username"],
                password: context_variables["pass"]        
            };
    
            checkSFTP(info).then( async (check) => {
                if (check)             
                    await say(`Hey there <@${message.user}>: SFTP/FTP info is correct & tested !`);
                else         
                    await say(`Hey there <@${message.user}> : SFTP/FTP info is incorrect & can not connected !`);
                   
            }).catch( async (err) => {
                await say(`Hey there <@${message.user}> : SFTP/FTP info is incorrect & can not connected !`);
            })

            context_variables=[];
        }
    } catch (error) {
        console.log("error in message: ",error) 
    }
    


  });


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

    const sftp = new Client();

    return sftp.connect(config).then(() => {
        return TRUE;
      }).catch(err => {
        throw err;
    }); 
}

// * TODO: using Neutral Language Processing to extract infos

// * TODO: If message contain ppk key, download it and load it to the checker


//* TODO : CHECK DATA SFTP IN FILES PDF, DOCX, TXT, ...
