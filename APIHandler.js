const axios = require('axios');
const config = require('./config');

async function sendGetRequest(url) {
    let res = await axios.get(url);
    const response = res.data;
    return response;
}

module.exports = {
    sendGetRequest: sendGetRequest,

    async getGuildData(guild_id) {
        try{
            let response = await sendGetRequest(`https://api.hypixel.net/v2/guild?key=${config.tokens.hypixel}&id=${guild_id}`);
            return response;
        }
        catch(e){
            console.log(e);
            return {};
        }
    },

    getLinkedMC(discord_id, verbose=false) {
        return new Promise(async (resolve, reject) => {
            const request_url = `${config.verification.provider}${discord_id}`;
            sendGetRequest(request_url).then((data) => {
                if(verbose){
                    console.log(data);
                }
                resolve(data.uuid);
            }, () => {
                resolve(false);
            });
        });
    },

    translateUUIDToNick(uuid) {
        return new Promise(async (resolve, reject) => {
            const request_url = `https://mojang.dssoftware.ru/?uuid=${uuid}`;
    
            sendGetRequest(request_url).then((data) => {
                if (data.name == undefined || data.name == null) {
                    resolve(false);
                }
                resolve(data.name);
            }, () => {
                resolve(false);
            });
        });
    }
}