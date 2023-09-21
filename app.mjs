import { appendFileSync, existsSync, writeFileSync, readFileSync } from "fs";
import Web3 from "web3";
import * as dotenv from "dotenv";
import { queue } from "async";
import fetch from "node-fetch";
import { HttpsProxyAgent } from "https-proxy-agent";
dotenv.config();

import { TinyBuddy } from "./friends.mjs";

const PROXY = process.env.PROXY || "";
const RPC = process.env.BASE_RPC;
const BOK_KEY = process.env.BOT_KEY;
if (!BOK_KEY || !RPC) {
    console.log(`Setup RPC and BOT_KEY in .env`);
    process.exit();
}
const WEB3 = new Web3(new Web3.providers.HttpProvider(RPC));
const WALLET = WEB3.eth.accounts.privateKeyToAccount(BOK_KEY);

const parseFriends = async (pageStart) => {
    const options = {
        headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/114.0",
            Accept: "*/*",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate, br",
            Referer: "https://www.friend.tech/",
            Origin: "https://www.friend.tech",
        },
        ...(PROXY ? { agent: new HttpsProxyAgent(PROXY) } : {}),
    };
    const response = await fetch(
        `https://prod-api.kosetto.com/users/${WALLET.address}/token-holdings${pageStart ? `?pageStart=${pageStart}` : ``}`,
        options,
    );
    if (response.status === 200) {
        return await response.json();
    }
    throw new Error(`Can't parse friends: ${response.status}`);
};
(async () => {
    const task = process.argv[2];
    const option_1 = process.argv[3];

    const FRIENDS_DB_PATH = "friends.json";

    if (!existsSync(FRIENDS_DB_PATH)) {
        appendFileSync(FRIENDS_DB_PATH, "[]");
    }

    let FRIENDS_DB = JSON.parse(readFileSync(FRIENDS_DB_PATH, "utf-8"));
    const FRIENDS_DB_STATE = queue((_, cb) => {
        writeFileSync(FRIENDS_DB_PATH, JSON.stringify(FRIENDS_DB));
        cb(null);
    }, 1);

    const TinyFriend = new TinyBuddy(WEB3, WALLET, BOK_KEY, FRIENDS_DB, FRIENDS_DB_STATE);

    switch (task) {
        case "parse-friends":
            {
                console.log(`::FRIENDS.TECH KEY PARSING STARTED`);
                let pageStart = 0;
                const KEYS = [];
                while (true) {
                    const data = await parseFriends(pageStart);
                    const users = data.users;
                    pageStart = data.nextPageStart;
                    KEYS.push(...users);
                    if (users.length < 50) break;
                }
                FRIENDS_DB = KEYS;
                console.log(`::FRIENDS.TECH KEY PARSING COMPLETED :: TOTAL HOLDINGS :: ${FRIENDS_DB.length}`);
                writeFileSync(FRIENDS_DB_PATH, JSON.stringify(FRIENDS_DB));
            }
            break;
        case "mass-seller":
            {
                console.log(`::FRIENDS.TECH MASS SELLING STARTED`);
                await TinyFriend.mass_seller();
                console.log(`::FRIENDS.TECH MASS SELLING COMPLETED`);
            }
            break;
        default:
            console.log("No such task");
            process.exit();
    }
})();

process.on("SIGINT", () => {
    if (!global.stop) {
        console.log(`SIGINT signal received: PLEASE WAIT TILL RUNNING TASKS WILL BE COMPLETED!`);
        global.stop = true;
    }
});
