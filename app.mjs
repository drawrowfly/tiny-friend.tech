import { appendFileSync, existsSync, writeFileSync, readFileSync } from "fs";
import Web3 from "web3";
import * as dotenv from "dotenv";
import { queue } from "async";
dotenv.config();

import { TinyBuddy } from "./friends.mjs";

const RPC = process.env.BASE_RPC;
const BOK_KEY = process.env.BOT_KEY;
if (!BOK_KEY || !RPC) {
    console.log(`Setup RPC and BOT_KEY in .env`);
    process.exit();
}
const WEB3 = new Web3(new Web3.providers.HttpProvider(RPC));
const WALLET = WEB3.eth.accounts.privateKeyToAccount(BOK_KEY);

(async () => {
    const task = process.argv[2];
    const option_1 = process.argv[3];
    const option_2 = process.argv[4];

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
        case "buy-key":
            {
                if (!option_1) {
                    console.log(`Specifie address of a key to buy`);
                    process.exit();
                }

                console.log(`::FRIENDS.TECH BUY KEY STARTED\n`);
                await TinyFriend.contract_buyShares(option_1, parseInt(option_2) || 1);
                console.log(`\n::FRIENDS.TECH BUY KEY COMPLETED`);
            }
            break;
        case "mass-seller":
            {
                console.log(`::FRIENDS.TECH MASS SELLING STARTED\n`);
                const KEYS = await TinyFriend.get_all_keys();
                await TinyFriend.mass_seller(KEYS);
                console.log(`\n::FRIENDS.TECH MASS SELLING COMPLETED`);
            }
            break;
        case "portfolio-value":
            {
                console.log(`::FRIENDS.TECH AFTER FEE PORTFOLIO VALUE CALCULATION STARTED\n`);
                await TinyFriend.portfolio_value(option_1);
                console.log(`\n::FRIENDS.TECH AFTER FEE PORTFOLIO VALUE CALCULATION COMPLETED`);
            }
            break;
        case "random-wallet":
            {
                const wallet = WEB3.eth.accounts.create();
                console.table({
                    address: wallet.address,
                    private_key: wallet.privateKey,
                });
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
