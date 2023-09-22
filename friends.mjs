import { forEachLimit } from "async";
import fetch from "node-fetch";
import { HttpsProxyAgent } from "https-proxy-agent";

import { FRIENDS_TECH_ABI } from "./abi.mjs";

export class TinyBuddy {
    constructor(WEB3, WALLET, BOT_KEY, FRIENDS_DB, FRIENDS_DB_STATE) {
        this.WEB3 = WEB3;
        this.WALLET = WALLET;
        this.BOT_KEY = BOT_KEY;
        this.FRIENDS_DB = FRIENDS_DB;
        this.FRIENDS_DB_STATE = FRIENDS_DB_STATE;
        this.FRIENDTECH_ADDRESS = "0xcf205808ed36593aa40a44f10c7f7c2f67d4a4d4";
        this.FRIENDTECH_CONTRACT = new this.WEB3.eth.Contract(FRIENDS_TECH_ABI, this.FRIENDTECH_ADDRESS);
        this.pageStart = 0;
    }

    /**
     * FRIEND.TECH API call to get all existing holding for the specified address
     * @param {*} address
     * @returns
     */
    async api_token_holdings(address = this.WALLET.address) {
        const options = {
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/114.0",
                Accept: "*/*",
                "Accept-Language": "en-US,en;q=0.5",
                "Accept-Encoding": "gzip, deflate, br",
                Referer: "https://www.friend.tech/",
                Origin: "https://www.friend.tech",
            },
            ...(process.env.PROXY ? { agent: new HttpsProxyAgent(process.env.PROXY) } : {}),
        };
        const response = await fetch(
            `https://prod-api.kosetto.com/users/${address}/token-holdings${this.pageStart ? `?pageStart=${this.pageStart}` : ``}`,
            options,
        );
        if (response.status === 200) {
            return await response.json();
        }
        throw new Error(`Can't parse friends: ${response.status}`);
    }

    async get_all_keys(address = this.WALLET.address) {
        const KEYS = [];
        while (true) {
            const data = await this.api_token_holdings(address);
            const users = data.users;
            this.pageStart = data.nextPageStart;
            KEYS.push(...users);
            if (users.length < 50) break;
        }
        return KEYS;
    }

    /**
     * FRIEND.TECH CONTRACT call to sell a key
     * @param {*} address
     * @param {*} sell_keys
     */
    async contract_sellShares(address, sell_keys = 1) {
        const query = this.FRIENDTECH_CONTRACT.methods.sellShares(address, sell_keys);

        const tx = {
            type: 2,
            from: this.WALLET.address,
            to: this.FRIENDTECH_ADDRESS,
            maxFeePerGas: this.WEB3.utils.toWei("1", "gwei"),
            maxPriorityFeePerGas: this.WEB3.utils.toWei("0.1", "gwei"),
            data: query.encodeABI(),
        };

        tx.gas = await this.WEB3.eth.estimateGas(tx);
        const signed = await this.WEB3.eth.accounts.signTransaction(tx, this.BOT_KEY);
        await this.WEB3.eth.sendSignedTransaction(signed.rawTransaction);
    }

    /**
     * FRIEND.TECH CONTRACT call to buy a key
     * @param {*} address
     * @param {*} sell_keys
     */
    async contract_buyShares(address, number_of_keys = 1) {
        const query = this.FRIENDTECH_CONTRACT.methods.buyShares(address, number_of_keys);

        const buy_price = (await this.FRIENDTECH_CONTRACT.methods.getBuyPriceAfterFee(address, number_of_keys).call()).toString();
        const human_price = parseFloat(this.WEB3.utils.fromWei(buy_price, "ether").toString());
        const tx = {
            type: 2,
            from: this.WALLET.address,
            to: this.FRIENDTECH_ADDRESS,
            value: buy_price,
            maxFeePerGas: this.WEB3.utils.toWei("1", "gwei"),
            maxPriorityFeePerGas: this.WEB3.utils.toWei("0.1", "gwei"),
            data: query.encodeABI(),
        };

        tx.gas = await this.WEB3.eth.estimateGas(tx);
        const signed = await this.WEB3.eth.accounts.signTransaction(tx, this.BOT_KEY);
        await this.WEB3.eth.sendSignedTransaction(signed.rawTransaction);

        console.log(`\n::FRIENDS.TECH KEY PURCHASE COMPLETED :: ${address} :: ${number_of_keys} :: PAID :: ${human_price} ETH`);
    }

    async mass_seller(KEYS) {
        return new Promise((r) => {
            forEachLimit(
                KEYS,
                1,
                async (item) => {
                    if (global.stop) return;
                    try {
                        const getSellPrice = await this.FRIENDTECH_CONTRACT.methods.getSellPriceAfterFee(item.address, item.balance).call();
                        const formatedSellPrice = this.WEB3.utils.fromWei(getSellPrice, "ether");
                        await this.contract_sellShares(item.address, item.balance);
                        console.log(`::FRIENDS.TECH KEY SELL :: ${item.address} ${item.balance} KEYS FOR ${formatedSellPrice} ETH`);
                    } catch (e) {
                        console.log(`::FRIENDS.TECH KEY SELL :: ERROR :: ${e.message}`);
                    }
                },
                (e) => {
                    if (e) {
                        console.log(e);
                    }
                    r();
                },
            );
        });
    }

    /**
     * Calculate portfolio value after fee for the specified address
     * @param {*} address
     */
    async portfolio_value(address = this.WALLET.address) {
        const result = [];
        let TOTAL = 0;
        const KEYS = await this.get_all_keys(address);
        let TOTAL_KEYS = 0;
        for (let key of KEYS) {
            const getSellPrice = await this.FRIENDTECH_CONTRACT.methods.getSellPriceAfterFee(key.address, key.balance).call();
            const formatedSellPrice = this.WEB3.utils.fromWei(getSellPrice, "ether");
            if (formatedSellPrice) {
                TOTAL_KEYS += parseInt(key.balance);
                TOTAL += parseFloat(formatedSellPrice);
            }
        }
        result.push({
            address,
            total_holding: KEYS.length,
            total_keys: TOTAL_KEYS,
            after_fee_value: TOTAL,
        });

        console.table(result);
    }
}
