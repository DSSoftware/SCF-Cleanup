const config = require("./config");
const { sendLog, sendSuccess, sendError, sendWarn, sleep } = require("./utils");
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const { getGuildData, getLinkedMC, translateUUIDToNick } = require("./APIHandler");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
client.login(config.tokens.discord);

client.on("ready", () => {
    sendSuccess(`Logged in as ${client.user?.tag}!`);

    const server = client.guilds.cache.find((g) => g.id === config.discord.server);
    if (!server) {
        sendError("No server found with specified ID.");
    } else {
        sendSuccess("Found the server.");
        run_the_check(server);
        setInterval(() => {
            run_the_check(server);
        }, config.preferences.refresh_interval);
    }
});

function run_the_check(server) {
    server.members.fetch().then((members) => {
        checkMembers(server, members);
    });
}

async function checkMembers(discord_guild, members) {
    let guild_members = {};

    let important_roles = [config.roles.guild_member];

    for (const cleaned_up_guild of Object.values(config.guilds)) {
        important_roles.push(cleaned_up_guild.member_role);

        for (const guild_role of Object.values(cleaned_up_guild.roles)) {
            important_roles.push(guild_role);
        }

        let guild_info = await getGuildData(cleaned_up_guild.guild_id);

        if (!guild_info?.success) {
            console.log(guild_info);
            sendError(`Failed to fetch ${cleaned_up_guild.name} guild data.`);
            throw "Cannot continue without guild data.";
        }

        const resp_data = guild_info;
        const guild_members_raw = resp_data?.guild?.members ?? [];

        for (let gmember of guild_members_raw) {
            gmember.guild_data = cleaned_up_guild;
            guild_members[gmember.uuid] = gmember;
        }
    }

    if (guild_members.length == 0) {
        sendError("Failed to fetch guilds data.");
        return;
    }

    important_roles = [...new Set(important_roles)];

    let member_counter = 0;
    let verification_counter = 0;
    let global_member_counter = 0;
    let processed_counter = 0;
    let out_of_members = 0;

    let important_members = [];
    let verification_check = [];

    for (const member_entry of members) {
        const member = member_entry[1];
        global_member_counter++;
        if (member.user.bot) {
            continue;
        }

        let has_important_roles = false;

        for (const important_role of important_roles) {
            if (member.roles.cache.has(important_role)) {
                has_important_roles = true;
            }
        }

        if (!has_important_roles) {
            if (config.features.recheck_verification) {
                verification_counter++;
                verification_check.push(member);
            }
            continue;
        }

        member_counter++;
        important_members.push(member);
    }

    sendStartMessage();

    let members_queue = [];

    function reviewMember(member_entry) {
        return new Promise(async (resolve) => {
            try {
                let user_id = member_entry.user.id;
                let verified_as = null;

                try {
                    verified_as = await getLinkedMC(user_id);
                    if (verified_as === false) {
                        throw "Invalid response for verification request.";
                    }
                } catch (e) {
                    let channel = discord_guild.channels.cache.get(config.discord.logging);
                    const errorEmbed = new EmbedBuilder()
                        .setColor(0x800000)
                        .setDescription(`Failed to obtain verification data for player. Maybe the backend is down?`);

                    channel.send({ content: config.discord.warning, embeds: [errorEmbed] });
                    sendError("Unable to obtain verification data.");
                    resolve();
                    return;
                }

                let player_ign = undefined;

                let needed_roles = [];

                if (member_entry.roles.cache.has(config.roles.skip_check)) {
                    processed_counter++;
                    let channel = discord_guild.channels.cache.get(config.discord.logging);
                    const roleAddEmbed = new EmbedBuilder()
                        .setColor(0x008000)
                        .setDescription(`Skipped a player <@${member_entry.user.id}> | ERROR_SKIPPED_PLAYER`);

                    channel.send({ content: "", embeds: [roleAddEmbed] });
                    resolve();
                    return;
                }

                // #####################################################
                // Verification Recheck
                // Checks the VERIFIED role.
                // Resets nick if needed.
                // #####################################################

                if (verified_as !== null && verified_as !== undefined) {
                    needed_roles.push(config.roles.verified);
                } else {
                    await getLinkedMC(user_id, true);
                }

                player_ign = await translateUUIDToNick(verified_as);

                if (config.features.reset_nick) {
                    if (player_ign != false) {
                        if (member_entry.nickname != player_ign) {
                            await changeNick(member_entry, player_ign, member_entry.nickname);
                        }
                    } else {
                        if (member_entry.nickname != null) {
                            await changeNick(member_entry, null, member_entry.nickname);
                        }
                    }
                }

                // #####################################################
                // Guild Member Checks
                // Guild-Specific Roles Issuing
                // #####################################################

                if (verified_as != null && verified_as != undefined) {
                    if (guild_members?.[verified_as]?.uuid == verified_as) {
                        const player_rank = guild_members?.[verified_as]?.rank ?? "Member";
                        const player_guild = guild_members?.[verified_as]?.guild_data;

                        if (player_guild.is_guild) {
                            needed_roles.push(config.roles.guild_member);
                        }


                        if (player_guild?.member_role !== undefined) {
                            needed_roles.push(player_guild?.member_role);
                        }

                        for (const role of Object.entries(player_guild?.roles)) {
                            if (player_rank.toLowerCase() == role[0]) {
                                needed_roles.push(role[1]);
                            }
                        }
                    }
                }

                for (const important_role of important_roles) {
                    if (member_entry.roles.cache.has(important_role)) {
                        if (!needed_roles.includes(important_role)) {
                            if (important_role == config.roles.verified) {
                                if (!config.features.reset_unverified) {
                                    continue;
                                }
                            }

                            await removeRole(member_entry, important_role);
                        }
                    } else {
                        if (needed_roles.includes(important_role)) {
                            await addRole(member_entry, important_role);
                        }
                    }
                }

                if (player_ign == false) {
                    player_ign = undefined;
                }
                let player_identifier = player_ign ?? member_entry.user.username;
                processed_counter++;
                sendLog(
                    "Finished checking user " + player_identifier + ` (${processed_counter} / ${out_of_members})`
                );
                resolve();
            }
            catch (e) {
                console.log(e);
                resolve();
            }
        });
    }

    for (const member_entry of important_members) {
        members_queue.push(member_entry);
    }

    out_of_members = important_members.length;

    function queue_handler() {
        return new Promise(async (qhr) => {
            while (members_queue.length > 0) {
                let job = members_queue.shift();

                if (!job) {
                    break;
                }
                const result = await Promise.race([
                    reviewMember(job),
                    new Promise((resolve) => {
                        setTimeout(() => resolve('timeout'), 60000);
                    })
                ]);

                if (result === 'timeout') {
                    sendWarn('Job timed out after 60 seconds, skipping...');
                }
            }

            qhr();
        });
    }

    let queues = [];

    for (let i = 0; i < config.preferences.queues; i++) {
        queues.push(queue_handler());
    }

    await Promise.all(queues);

    queues = [];

    if (config.features.recheck_verification) {
        processed_counter = 0;
        sendVerificationRecheckMessage();
        for (const member_entry of verification_check) {
            members_queue.push(member_entry);
        }

        out_of_members = verification_check.length;

        for (let i = 0; i < config.preferences.queues; i++) {
            queues.push(queue_handler());
        }

        await Promise.all(queues);
    }

    sendSuccessMessage();
    important_members.length = 0;
    verification_check.length = 0;

    async function addRole(member, role) {
        return new Promise(async (resolve, reject) => {
            try {
                let channel = discord_guild.channels.cache.get(config.discord.logging);
                const roleAddEmbed = new EmbedBuilder()
                    .setColor(0x008000)
                    .setTitle("Role Added")
                    .setAuthor({ name: "SCF Guild" })
                    .setDescription("Discord Members Role Cleanup")
                    .addFields({ name: "User", value: `<@${member.user.id}>` }, { name: "Role", value: `<@&${role}>` })
                    .setTimestamp()
                    .setFooter({ text: "by ArtemDev" });

                channel.send({ embeds: [roleAddEmbed] });

                await member.roles.add(role);
                resolve(true);
            } catch (e) {
                sendError("Failed to add role!");
                console.log(e);
                resolve(false);
            }
        });
    }

    async function removeRole(member, role) {
        return new Promise(async (resolve, reject) => {
            try {
                let channel = discord_guild.channels.cache.get(config.discord.logging);
                const roleRemoveEmbed = new EmbedBuilder()
                    .setColor(0x800000)
                    .setTitle("Role Removed")
                    .setAuthor({ name: "SCF Guild" })
                    .setDescription("Discord Members Role Cleanup")
                    .addFields({ name: "User", value: `<@${member.user.id}>` }, { name: "Role", value: `<@&${role}>` })
                    .setTimestamp()
                    .setFooter({ text: "by ArtemDev" });

                channel.send({ embeds: [roleRemoveEmbed] });

                await member.roles.remove(role);
                resolve(true);
            } catch (e) {
                sendError("Failed to remove role!");
                console.log(e);
                resolve(false);
            }
        });
    }

    async function changeNick(member, nick, old = "") {
        return new Promise(async (resolve, reject) => {
            try {
                let channel = discord_guild.channels.cache.get(config.discord.logging);
                const roleRemoveEmbed = new EmbedBuilder()
                    .setColor(0x808080)
                    .setTitle("Nick Changed")
                    .setAuthor({ name: "SCF Guild" })
                    .setDescription("Discord Members Role Cleanup")
                    .addFields(
                        { name: "User", value: `<@${member.user.id}>` },
                        { name: "New Nick", value: `\`${nick}\`` },
                        { name: "Old Nick", value: `\`${old}\`` }
                    )
                    .setTimestamp()
                    .setFooter({ text: "by ArtemDev" });

                channel.send({ embeds: [roleRemoveEmbed] });

                await member.setNickname(nick);
                resolve(true);
            } catch (e) {
                sendError("Failed to edit player nick!");
                console.log(e);
                resolve(false);
            }
        });
    }

    async function sendStartMessage() {
        try {
            let channel = discord_guild.channels.cache.get(config.discord.logging);
            const startEmbed = new EmbedBuilder()
                .setColor(0x008000)
                .setTitle("Player Check Was Started")
                .setAuthor({ name: "SCF Guild" })
                .addFields(
                    { name: "Overall Member Count", value: `${global_member_counter}` },
                    { name: "Members with recheck roles", value: `${member_counter}` }
                )
                .setTimestamp()
                .setFooter({ text: "by ArtemDev" });

            await channel.send({ embeds: [startEmbed] });
        } catch (e) {
            sendError("Failed to send start message!");
            console.log(e);
        }
    }

    async function sendVerificationRecheckMessage() {
        try {
            let channel = discord_guild.channels.cache.get(config.discord.logging);
            const startEmbed = new EmbedBuilder()
                .setColor(0x008000)
                .setTitle("Verification Recheck Was Started")
                .setAuthor({ name: "SCF Guild" })
                .addFields(
                    { name: "Overall Member Count", value: `${global_member_counter}` },
                    { name: "Verified Members", value: `${verification_counter}` }
                )
                .setTimestamp()
                .setFooter({ text: "by ArtemDev" });

            await channel.send({ embeds: [startEmbed] });
        } catch (e) {
            sendError("Failed to send start message!");
            console.log(e);
        }
    }

    async function sendSuccessMessage() {
        try {
            let channel = discord_guild.channels.cache.get(config.discord.logging);
            const finishEmbed = new EmbedBuilder()
                .setColor(0x008000)
                .setTitle("Player Check Finished")
                .setAuthor({ name: "SCF Guild" })
                .setTimestamp()
                .setFooter({ text: "by ArtemDev" });

            await channel.send({ embeds: [finishEmbed] });
        } catch (e) {
            sendError("Failed to send success message!");
            console.log(e);
        }

        sendSuccess("The check was successfully finished.");
    }
}
