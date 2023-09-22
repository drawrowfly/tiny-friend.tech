## Tiny Buddy for FRIEND.TECH

Easy to use tool to quickly sell all the keys that you own, view your own or other users portfolio value and more comming

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

Sell all existing keys

```sh
node app.mjs mass-seller
```

Calculate after fee portfolio value

```sh
// To calculate your own portfolio value
node app.mjs portfolio-value

// To calculate anyone else's portfolio value
node app.mjs portfolio-value 0xfd7232e66a69e1ae01e1e0ea8fab4776e2d325a9
```
###### Output example

![](https://i.imgur.com/zgWjSHO.png)

Buy key

```sh
// Buy single key
node app.mjs buy-key 0xfd7232e66a69e1ae01e1e0ea8fab4776e2d325a9

// Buy N amounts of key. For example 3 in command below
node app.mjs buy-key 0xfd7232e66a69e1ae01e1e0ea8fab4776e2d325a9 3
```


## Other things to note

In order to keep your data correct, stop the script with CTRL+C, that way script will finish last working tasks and exit properly

**More methods will be added a bit later**
