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
    console.log(`Hi. ${client.user.username} is ready.`);
});

// 特定の絵文字リアクションを検知して処理
client.on("messageReactionAdd", async (reaction, user) => {
    if (reaction.emoji.name === "🏮") {
        const result = await omatsurify(reaction.message.content);
        await reaction.message.channel.send(result);
    }
});

// テキストをお祭り変換する関数
async function omatsurify(text) {
    return new Promise((resolve, reject) => {
        kuromoji.builder({ dicPath: "node_modules/kuromoji/dict" }).build(function (err, tokenizer) {
            if (err) return reject(err);

            const tokens = tokenizer.tokenize(text);

            // ヘルパー関数の定義
            function norn_first_asshi(surface_form){
                const norn_first = [
                    '私', 'わたし', 'ワタシ', 'わたくし', 'ワタクシ', 'あたし', 'アタシ',
                    '俺', 'おれ', 'オレ', '僕', 'ぼく', 'ボク', 
                    'おら', 'オラ', 'おいら', 'オイラ',
                    'わい', 'ワイ', 'わし', 'ワシ',
                ];
                return norn_first.includes(surface_form);
            }

            function norn_second_omee(surface_form){
                const norn_second = [
                    'あなた', 'アナタ',
                    '君', 'きみ', 'キミ', 
                    'お前', 'おまえ', 'オマエ',
                ];
                return norn_second.includes(surface_form);
            }

            function verb_whitch(basic_form){
                const verb_godan_basic = ["く", "ぐ", "す", "つ", "ぬ", "ぶ", "む", "る", "う"];
                const verb_godan_renyou = ["き", "ぎ", "し", "ち", "に", "び", "み", "り", "い"];
                const last_char = basic_form.slice(-1);
                const index = verb_godan_basic.indexOf(last_char);
                if (index !== -1) {
                    return verb_godan_renyou[index];
                } else {
                    return last_char; // デフォルトはそのまま
                }
            }

            tokens.push({ surface_form: '' });
            let newtokens = [];
            for (let i = 0; i < tokens.length; i++) {
                if (!tokens[i] || tokens[i].surface_form === '') {
                    break;
                }
                if (!tokens[i + 1]) {
                    tokens.push({ surface_form: '' });
                }
                if (!tokens[i + 2]) {
                    tokens.push({ surface_form: '' });
                }

                if (tokens[i].word_type !== "KNOWN") {
                    newtokens.push(tokens[i].surface_form);
                } else if (norn_first_asshi(tokens[i].surface_form)) {
                    // 一人称→あっし
                    newtokens.push('あっし');
                } else if (norn_second_omee(tokens[i].surface_form)) {
                    // 二人称→おめえ
                    newtokens.push('おめえ');
                } else if (tokens[i].pos_detail_3 === "姓" && tokens[i + 1].pos_detail_1 === "接尾") {
                    // 三人称→◯◯の旦那
                    newtokens.push(tokens[i].surface_form);
                    newtokens.push('の');
                    newtokens.push('旦那');
                    i += 1;
                } else if (tokens[i].surface_form === 'て' && tokens[i].pos_detail_1 === '接続助詞') {
                    // 〜ています→〜とります
                    if (tokens[i + 1].basic_form === 'ます' && tokens[i + 1].pos === '助動詞') {
                        newtokens.push('と');
                        newtokens.push('り');
                        if (tokens[i + 1].surface_form === 'ます') {
                            newtokens.push('やす');
                        } else if (tokens[i + 1].surface_form === 'まし') {
                            newtokens.push('やし');
                        } else if (tokens[i + 1].surface_form === 'ませ') {
                            newtokens.push('やせ');
                        } else {
                            newtokens.push(tokens[i + 1].surface_form);
                        }
                        i += 1;
                    } else if (tokens[i + 1].surface_form === 'い' && tokens[i + 1].pos === '動詞') {
                        if (tokens[i + 2].basic_form === 'ます') {
                            newtokens.push('と');
                            newtokens.push('り');
                            if (tokens[i + 2].surface_form === 'ます') {
                                newtokens.push('やす');
                            } else if (tokens[i + 2].surface_form === 'まし') {
                                newtokens.push('やし');
                            } else if (tokens[i + 2].surface_form === 'ませ') {
                                newtokens.push('やせ');
                            } else {
                                newtokens.push(tokens[i + 2].surface_form);
                            }
                            i += 2;
                        } else {
                            newtokens.push(tokens[i].surface_form);
                            newtokens.push(tokens[i + 1].surface_form);
                            i += 1;
                        }
                    } else if (tokens[i + 1].surface_form.startsWith('しま') && tokens[i + 1].pos === '動詞') {
                        // 〜てしまう→〜ちまう
                        newtokens.push('ちま' + tokens[i + 1].surface_form.slice(2));
                        i += 1;
                    } else {
                        newtokens.push(tokens[i].surface_form);
                    }
                } else if (tokens[i].pos === '動詞' && tokens[i + 1].surface_form.startsWith('ちゃ') && tokens[i + 1].pos === '動詞') {
                    newtokens.push(tokens[i].surface_form);
                    newtokens.push('ちま' + tokens[i + 1].surface_form.slice(2));
                    i += 1;
                } else if (tokens[i].surface_form === 'で' && tokens[i].pos_detail_1 === '接続助詞') {
                    // 〜でいます→〜どります
                    if (tokens[i + 1].basic_form === 'ます') {
                        newtokens.push('ど');
                        newtokens.push('り');
                        if (tokens[i + 1].surface_form === 'ます') {
                            newtokens.push('やす');
                        } else if (tokens[i + 1].surface_form === 'まし') {
                            newtokens.push('やし');
                        } else if (tokens[i + 1].surface_form === 'ませ') {
                            newtokens.push('やせ');
                        } else {
                            newtokens.push(tokens[i + 1].surface_form);
                        }
                        i += 1;
                    } else if (tokens[i + 1].surface_form === 'い') {
                        if (tokens[i + 2].basic_form === 'ます') {
                            newtokens.push('ど');
                            newtokens.push('り');
                            if (tokens[i + 2].surface_form === 'ます') {
                                newtokens.push('やす');
                            } else if (tokens[i + 2].surface_form === 'まし') {
                                newtokens.push('やし');
                            } else if (tokens[i + 2].surface_form === 'ませ') {
                                newtokens.push('やせ');
                            } else {
                                newtokens.push(tokens[i + 2].surface_form);
                            }
                            i += 2;
                        } else {
                            newtokens.push(tokens[i].surface_form);
                            newtokens.push(tokens[i + 1].surface_form);
                            i += 1;
                        }
                    } else {
                        newtokens.push(tokens[i].surface_form);
                    }
                } else if (tokens[i].surface_form === 'ます' && tokens[i].pos === '助動詞') {
                    // 〜ます→〜やす
                    newtokens.push('やす');
                } else if (tokens[i].surface_form === 'まし' && tokens[i].pos === '助動詞') {
                    // 〜ました→〜やした
                    newtokens.push('やし');
                } else if (tokens[i].surface_form === 'ませ' && tokens[i].pos === '助動詞') {
                    // 〜ません→〜やせん
                    newtokens.push('やせ');
                } else if ((tokens[i].surface_form === 'ない' || tokens[i].reading === 'ナイ') && (tokens[i].pos === '助動詞' || tokens[i].pos === '形容詞')) {
                    // 〜ない→〜ねぇ
                    newtokens.push('ねぇ');
                } else if (tokens[i].surface_form === 'ください' || tokens[i].reading === 'クダサイ') {
                    // 〜ください→〜くだせぇ
                    newtokens.push('くだせぇ');
                } else if (tokens[i].surface_form === 'という' && tokens[i].pos === '助詞') {
                    // 助詞「という」→「ってぇ」
                    newtokens.push('ってぇ');
                } else if (tokens[i].surface_form === 'と' && tokens[i].pos === '助詞' && tokens[i + 1].surface_form === 'の') {
                    // 引用の助詞「と」＋助詞「の」→「ってぇ」
                    newtokens.push('ってぇ');
                    i += 1;
                } else if (tokens[i].surface_form === 'を' && tokens[i].pos === '助詞' && tokens[i + 1].surface_form === '、') {
                    // 助詞「を」＋記号「、」→「をだな、」
                    newtokens.push('をだな');
                    newtokens.push('、');
                    i += 1;
                } else if (tokens[i].pos === '動詞' && tokens[i + 1].surface_form === 'たい' && tokens[i + 1].pos === '助動詞') {
                    // 動詞＋助動詞「たい」→動詞＋「てぇ」
                    newtokens.push(tokens[i].surface_form);
                    newtokens.push('てぇ');
                    i += 1;
                } else if (tokens[i].surface_form === 'ござい' && tokens[i].pos === '助動詞') {
                    // 助動詞「ござい」→「ごぜぇ」
                    newtokens.push('ごぜぇ');
                } else if (tokens[i].surface_form === 'たく' && tokens[i].pos === '助動詞' && tokens[i + 1].surface_form === 'ない') {
                    // 助動詞「たく」＋助動詞「ない」→「たかぁねぇ」
                    newtokens.push('たかぁ');
                    newtokens.push('ねぇ');
                    i += 1;
                } else if (tokens[i].pos === '名詞' &&
                    (tokens[i + 1].surface_form === 'だ' || tokens[i + 1].surface_form === 'です') &&
                    tokens[i + 1].pos === '助動詞'
                ) {
                    // 名詞 + 助動詞「だ」「です」→ 名詞 + 「でい」
                    if (tokens[i + 2] && ['！', '。', '\n'].includes(tokens[i + 2].surface_form)) {
                        newtokens.push(tokens[i].surface_form);
                        newtokens.push('でい');
                        i += 1;
                    } else if (tokens[i + 2] && tokens[i + 2].pos_detail_1 === '終助詞') {
                        newtokens.push(tokens[i].surface_form);
                        newtokens.push('でい');
                        i += 2;
                    } else {
                        newtokens.push(tokens[i].surface_form);
                        newtokens.push(tokens[i + 1].surface_form);
                        i += 1;
                    }
                } else if (tokens[i].pos === "名詞" && ['！', '。', '\n', ''].includes(tokens[i + 1].surface_form)) {
                    // 文末かつ（名詞）→（名詞）でい
                    newtokens.push(tokens[i].surface_form);
                    newtokens.push('でい');
                } else if (tokens[i].pos === "助動詞" && tokens[i].basic_form === "です" &&
                    (!['！', '。', '\n', ''].includes(tokens[i + 1].surface_form) ||
                     !['！', '。', '\n', ''].includes(tokens[i + 2]?.surface_form) ||
                     (tokens[i + 3] && !['！', '。', '\n', ''].includes(tokens[i + 3].surface_form)))
                ) {
                    // 文末ではない「です」→「でごぜぇやす」
                    if (tokens[i].surface_form === 'です') {
                        newtokens.push('でごぜぇやす');
                    } else {
                        newtokens.push(tokens[i].surface_form);
                    }
                } else if (
                    tokens[i].pos === "動詞" && (tokens[i].conjugated_type === "一段" || tokens[i].conjugated_type === "サ変・スル") &&
                    tokens[i + 1].basic_form === "た" && tokens[i + 1].pos === "助動詞" && 
                    ['！', '。', '\n', ''].includes(tokens[i + 2]?.surface_form)
                ) {
                    // 文末　一段動詞＋「た」→「やし」
                    newtokens.push(tokens[i].surface_form);
                    newtokens.push('やし');
                    i += 1;
                } else if (
                    tokens[i].pos === "動詞" && tokens[i].conjugated_type.startsWith("五段") &&
                    tokens[i + 1].basic_form === "た" && tokens[i + 1].pos === "助動詞" && 
                    ['！', '。', '\n', ''].includes(tokens[i + 2]?.surface_form)
                ){
                    // 文末 五段動詞＋「た」→語尾変換＋「やし」
                    newtokens.push(tokens[i].surface_form.slice(0, -1));
                    newtokens.push(verb_whitch(tokens[i].basic_form));
                    newtokens.push('やし');
                    i += 1;
                } else if (
                    tokens[i].pos === "動詞" && tokens[i].conjugated_type === "一段" && tokens[i].basic_form === tokens[i].surface_form &&
                    ['！', '。', '\n', ''].includes(tokens[i + 1]?.surface_form)
                ){
                    // 文末　一段動詞→語尾変換
                    newtokens.push(tokens[i].surface_form.slice(0, -1));
                    newtokens.push('やす');
                } else if (
                    tokens[i].pos === "動詞" && tokens[i].conjugated_type.startsWith("五段") && tokens[i].basic_form === tokens[i].surface_form &&
                    ['！', '。', '\n', ''].includes(tokens[i + 1]?.surface_form)
                ){
                    // 文末 五段動詞→語尾変換
                    newtokens.push(tokens[i].surface_form.slice(0, -1));
                    newtokens.push(verb_whitch(tokens[i].basic_form));
                    newtokens.push('やす');
                } else if (tokens[i].pos === "形容詞" && 
                    ['！', '。', '\n', ''].includes(tokens[i + 1]?.surface_form)
                ){
                    // 文末の形容詞→「でごぜぇやす」
                    newtokens.push(tokens[i].surface_form);
                    newtokens.push('でごぜぇやす');
                } else if (tokens[i].pos === "形容詞" &&
                    ((tokens[i + 1].surface_form === "です" && tokens[i + 1].pos === "助動詞") || tokens[i + 1].pos_detail_1 === "終助詞") &&
                    ['！', '。', '\n', ''].includes(tokens[i + 2]?.surface_form)
                ){
                    // 文末の形容詞＋助動詞「です」→「でごぜぇやす」
                    newtokens.push(tokens[i].surface_form);
                    newtokens.push('でごぜぇやす');
                    if (tokens[i + 1].pos_detail_1 === "終助詞"){
                        newtokens.push(tokens[i + 1].surface_form);
                    }
                    i += 1;
                } else {
                    newtokens.push(tokens[i].surface_form);
                }
            }

            const transformedText = newtokens.join('');
            resolve(transformedText);
        });
    });
}
