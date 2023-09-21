## Tiny Buddy for FRIEND.TECH

Easy to use tool to quicly sell all the keys that you own

## Installation
Install all required dependencies
```sh
npm i
or
yarn
```
Requires [Node.js](https://nodejs.org/) v16+ to run.

## Setup

Rename **.env.example** to **.env** and fill **BOT_KEY** and **BASE_RPC** values. **BOT_KEY** is a your FRIEND.TECH private key, for example 0x02020202.

-   Note **PROXY** is not important

## Usage

Parse all existing keys 

```sh
node app.mjs parse-friends
```

Sell existing keys

```sh
node app.mjs mass-seller
```

In order to keep your data correct, stop the script with CTRL+C, that way script will finish last working tasks and exit

More methods will be added a bit later 