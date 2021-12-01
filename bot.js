"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const telegraf_1 = require("telegraf");
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = require("dotenv");
const mongoose_1 = __importDefault(require("mongoose"));
const { Schema } = mongoose_1.default;
mongoose_1.default.Promise = global.Promise;
(0, dotenv_1.config)();
const TOKEN = String(process.env.TOKEN);
const API_KEY = String(process.env.API_KEY);
const CHANNEL_ID = Number(process.env.CHANNEL_ID) || 1214585391;
const DB_URL = String(process.env.DB_URL);
const SEARCH_URL = "https://wallhaven.cc/api/v1/search?q=id:1&categories=010&purity=110&sorting=date_added";
const bot = new telegraf_1.Telegraf(TOKEN);
mongoose_1.default.connect(DB_URL)
    .catch(e => console.log(e));
const post_schema = new Schema({
    _id: String,
    post_id: String
});
const PostTracker = mongoose_1.default.model('tracker', post_schema);
var EMOJI;
(function (EMOJI) {
    EMOJI["heart"] = "\u2764\uFE0F";
    EMOJI["like"] = "\uD83D\uDC4D";
    EMOJI["dislike"] = "\uD83D\uDC4E";
})(EMOJI || (EMOJI = {}));
class WallPaper {
    constructor(data) {
        this.id = '';
        this.resolution = '';
        this.size = 0;
        this.path = '';
        this.thumb = '';
        this.id = data.id;
        this.resolution = data.resolution;
        this.size = data.size;
        this.path = data.path;
        this.thumb = data.thumb;
    }
    send() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield bot.telegram.sendPhoto(CHANNEL_ID, this.thumb, {
                    caption: `Anime (<code>${this.resolution}</code>)\n@Not_Anime_Wallpapers`,
                    parse_mode: "HTML",
                });
                yield bot.telegram.sendDocument(CHANNEL_ID, this.path, {
                    caption: `Anime (<code>${this.resolution}</code>)\n@Not_Anime_Wallpapers`,
                    parse_mode: "HTML",
                    reply_markup: {
                        inline_keyboard: [[
                                { text: EMOJI.heart, callback_data: "0:heart" },
                                { text: EMOJI.like, callback_data: "0:like" },
                                { text: EMOJI.dislike, callback_data: "0:dislike" }
                            ]]
                    }
                });
            }
            catch (e) {
                console.log(e);
            }
            return;
        });
    }
}
const auto_post = () => __awaiter(void 0, void 0, void 0, function* () {
    var wall_search = yield axios_1.default.get(SEARCH_URL, {
        headers: {
            'X-Api-Key': API_KEY,
            "Cache-Control": "no-cache, private",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36"
        }
    });
    var dbPost = yield PostTracker.findById("tracker");
    var latestPostId = dbPost.post_id;
    if (wall_search.status === 200) {
        var wall_data = wall_search.data;
        var counter = 24;
        var posts = [];
        if (latestPostId === "") {
            for (const _x of wall_data.data) {
                if (_x.file_size >= 1024 * 1024) {
                    posts.push(new WallPaper({
                        id: _x.id,
                        resolution: _x.resolution,
                        size: _x.file_size,
                        path: _x.path,
                        thumb: _x.thumbs.original
                    }));
                }
            }
        }
        if (latestPostId !== "") {
            for (const wall of wall_data.data) {
                if (wall_data.data.indexOf(wall) < counter) {
                    if (wall.id !== latestPostId && wall.file_size >= 1024 * 1024) {
                        posts.push(new WallPaper({
                            id: wall.id,
                            resolution: wall.resolution,
                            size: wall.file_size,
                            path: wall.path,
                            thumb: wall.thumbs.original
                        }));
                    }
                    if (wall.id === latestPostId) {
                        counter = wall_data.data.indexOf(wall);
                    }
                }
                else {
                    continue;
                }
            }
        }
        posts.reverse();
        if (posts.length <= 0) {
            console.log("Noting to Post");
        }
        if (posts.length > 0) {
            console.log("Loop Started");
            for (const post of posts) {
                yield post.send();
            }
            console.log(posts[posts.length - 1].id);
            try {
                yield PostTracker.updateOne({ _id: "tracker" }, { "$set": { post_id: posts[posts.length - 1].id } });
            }
            catch (e) {
                console.log(e);
            }
            console.log("Loop completed");
        }
    }
    else {
        console.log(wall_search.statusText);
    }
});
bot.action(/[0-9]+:(heart|like|dislike)/, (context) => __awaiter(void 0, void 0, void 0, function* () {
    const query = context.callbackQuery;
    const msg = query.message;
    if ("reply_markup" in msg) {
        var buttons = msg.reply_markup.inline_keyboard[0];
    }
    if ("caption_entities" in msg) {
        var entities = msg.caption_entities;
    }
    if ("data" in query) {
        var data = query.data.split(":");
    }
    if ("caption" in msg) {
        var caption = msg.caption;
    }
    const new_count = Number(data[0]) + 1;
    if (data[1] === "heart") {
        var _buttons = [[
                { text: `${EMOJI.heart} ${new_count}`, callback_data: `${new_count}:heart` },
                buttons[1],
                buttons[2]
            ]];
    }
    if (data[1] === "like") {
        _buttons = [[
                buttons[0],
                { text: `${EMOJI.like} ${new_count}`, callback_data: `${new_count}:like` },
                buttons[2]
            ]];
    }
    if (data[1] === "dislike") {
        _buttons = [[
                buttons[0],
                buttons[1],
                { text: `${EMOJI.dislike} ${new_count}`, callback_data: `${new_count}:dislike` }
            ]];
    }
    try {
        yield bot.telegram.editMessageCaption(CHANNEL_ID, msg.message_id, undefined, caption, {
            caption_entities: entities,
            reply_markup: {
                inline_keyboard: _buttons
            }
        });
    }
    catch (e) {
        console.log(e);
    }
}));
setInterval(auto_post, 120000);
console.log("Starting The Bot...");
bot.launch();
