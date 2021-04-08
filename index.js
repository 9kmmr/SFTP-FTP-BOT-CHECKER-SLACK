require("dotenv").config();
const { App } = require('@slack/bolt');
const { Client } = require('ssh2-sftp-client');
// Initializes your app with your bot token and signing secret
const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET
});
//  running port
const port = process.env.PORT || 3320
// Listens to incoming messages that contain "hello"
app.message('ftp', async ({ message, say }) => {
    // say() sends a message to the channel where the event was triggered  
    info = {
        host: "",
        port: "",
        username: "",
        password: ""        
    };
    checkSFTP(info).then( (check) => {
        if (check)             
            await say(`Hey there <@${message.user}>: SFTP/FTP info is correct & tested !`);
        else         
            await say(`Hey there <@${message.user}> : SFTP/FTP info is incorrect & can not connected !`);
           
    }).catch(err => {
        await say(`Hey there <@${message.user}> : SFTP/FTP info is incorrect & can not connected !`);
    })

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
