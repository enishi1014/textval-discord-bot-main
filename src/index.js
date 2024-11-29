const { Client, GatewayIntentBits } = require("discord.js");
const { config } = require("dotenv");
const kuromoji = require("kuromoji");
const express = require("express"); // ヘルスチェック用に追加

config();

// Discord Botの設定
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
    ],
});

// Webサーバーの設定（ヘルスチェック用）
const app = express();
const port = 8000; // Koyebがチェックするポート

// ヘルスチェック用のエンドポイント
app.get("/", (req, res) => {
    res.send("Bot is running!");
});

// サーバーの起動
app.listen(port, () => {
    console.log(`Health check server running on port ${port}`);
});

// Discord Botのログイン
client.login(process.env.DISCORD_TOKEN);

// Botが準備完了時にログを出力
client.on("ready", () => {
    console.log(`Hi.${client.user.username} is ready.`);
});

// 特定の絵文字リアクションを検知して処理
client.on("messageReactionAdd", async (reaction, user) => {
    if (reaction.emoji.name === "🏮") {
        result = await omatsurify(reaction.message.content);
        await reaction.message.channel.send(result);
    }
});

// テキストを解析する関数
async function omatsurify(text) {
    return new Promise((resolve, reject) => {
        kuromoji.builder({ dicPath: "node_modules/kuromoji/dict" }).build(function (err, tokenizer) {
            if (err) return reject(err);

            const path = tokenizer.tokenize(text);
            let response_temp = "";

            for (let i = 0; i < path.length; i++) {
                response_temp += `${path[i].surface_form} (${path[i].pos}) `;
            }

            resolve(response_temp);
        });
    });
}
