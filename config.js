require("dotenv").config();

let guild_configuration = {
    SCF: {
        SCF: {
            is_guild: true,
            guild_id: "638b9e6a8ea8c990c96e91f7",
            member_role: "1370633723577634926",
            roles: {
                senior: "1215996847873589378",
                active: "1147667882315100200",
            },
        },
        SCL: {
            is_guild: true,
            guild_id: "607a0d7c8ea8c9c0ff983976",
            member_role: "1370633860299358310",
            roles: {
                senior: "1215996847873589378",
                active: "1147667882315100200",
            },
        },
        CatCult: {
            is_guild: false,
            guild_id: "6834af778ea8c9156ef24cf3",
            member_role: "1372867965581791264",
            roles: {},
        }
    },
    SBU: {
        SCF: {
            guild_id: "638b9e6a8ea8c990c96e91f7",
            member_role: "1198654827668967544",
            roles: {},
        },
        SCL: {
            guild_id: "607a0d7c8ea8c9c0ff983976",
            member_role: "1227984925106503680",
            roles: {},
        },
        "SB University": {
            guild_id: "6111fcb48ea8c95240436c57",
            member_role: "803695821094125585",
            roles: {},
        },
        "SB Alpha Psi": {
            guild_id: "604a765e8ea8c962f2bb3b7a",
            member_role: "821080619332796437",
            roles: {},
        },
        "SB Lambda Pi": {
            guild_id: "60a16b088ea8c9bb7f6d9052",
            member_role: "843871813481267270",
            roles: {},
        },
        "SB Sigma Chi": {
            guild_id: "60352e858ea8c90182d34af7",
            member_role: "1099688245383663776",
            roles: {},
        },
        "SB Masters": {
            guild_id: "570940fb0cf2d37483e106b3",
            member_role: "944524838553399326",
            roles: {},
        },
        "SB Masters Jr": {
            guild_id: "6125800e8ea8c92e1833e851",
            member_role: "1088508095258439710",
            roles: {},
        }
    }
};

let features_configuration = {
    SCF: {
        reset_nick: true,
        recheck_verification: true,
        nick_roles: {
            //"cat": "1372867965581791264"
        }
    },
    SBU: {
        reset_nick: false,
        recheck_verification: false,
        nick_roles: {}
    }
}

const guilds = guild_configuration?.[process.env.GUILD_CONFIG];
const features = features_configuration?.[process.env.GUILD_CONFIG];

if (guilds == undefined) {
    throw "Invalid Guild Configuration. Check GUILD_CONFIG var.";
}

if (features == undefined) {
    throw "Invalid Guild Configuration. Check GUILD_CONFIG var.";
}

module.exports = {
    tokens: {
        scf: process.env.SCF_TOKEN,
        hypixel: process.env.HYPIXEL_TOKEN,
        discord: process.env.DISCORD_TOKEN,
    },
    verification: {
        provider: process.env.VERIFICATION_PROVIDER,
    },
    discord: {
        server: process.env.DISCORD_SERVER,
        logging: process.env.LOGGING_CHANNEL,
        warning: process.env.WARNING_CONTENT,
    },
    roles: {
        verified: process.env.ROLE_VERIFIED,
        guild_member: process.env.ROLE_GUILD_MEMBER,

        skip_check: process.env.ROLE_SKIP,
    },
    guilds: guilds,
    features: features,
    preferences: {
        refresh_interval: 6 * 60 * 60 * 1000,
    },
};
