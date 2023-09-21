import { forEachLimit } from "async";

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
    }

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

    async mass_seller() {
        return new Promise((r) => {
            forEachLimit(
                this.FRIENDS_DB,
                1,
                async (item) => {
                    if (global.stop) return;
                    if (item.sold) return;
                    try {
                        const getSellPrice = await this.FRIENDTECH_CONTRACT.methods.getSellPriceAfterFee(item.address, item.balance).call();
                        const formatedSellPrice = this.WEB3.utils.fromWei(getSellPrice, "ether");

                        await this.contract_sellShares(item.address, item.balance);
                        console.log(`::FRIENDS.TECH KEY SELL :: ${item.address} ${item.balance} KEYS FOR ${formatedSellPrice} ETH`);
                        item.sold = true;
                        this.FRIENDS_DB_STATE.push("");
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
}
