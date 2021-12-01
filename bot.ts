import { Telegraf } from "telegraf";
import axios from "axios";
import {config} from 'dotenv';
import {Message} from 'typegram';
import mongoose from 'mongoose';
const { Schema } = mongoose;

mongoose.Promise = global.Promise
config()

const TOKEN = String(process.env.TOKEN)
const API_KEY = String(process.env.API_KEY)
const CHANNEL_ID = Number(process.env.CHANNEL_ID) || 1214585391
const DB_URL = String(process.env.DB_URL)
const SEARCH_URL = "https://wallhaven.cc/api/v1/search?q=id:1&categories=010&purity=110&sorting=date_added"
const bot = new Telegraf(TOKEN)

mongoose.connect(DB_URL)
.catch(e => console.log(e))

const post_schema = new Schema({
    _id: String,
    post_id: String
})

const PostTracker = mongoose.model('tracker', post_schema)



type WallpaperType = {
    id: string;
    resolution: string;
    size: number;
    path: string;
    send(): Promise<void>;
}

enum EMOJI {
    heart = "❤️",
    like = "👍",
    dislike = "👎"
}

class WallPaper implements WallpaperType {
    public id = ''
    public resolution = ''
    public size = 0
    public path = ''
    constructor(data: WallpaperType) {
        this.id = data.id
        this.resolution = data.resolution
        this.size = data.size
        this.path = data.path
    }

    async send() {
        try {
            await bot.telegram.sendPhoto(CHANNEL_ID, this.path, {
                caption: `Anime (<code>${this.resolution}</code>)\n@Not_Anime_Wallpapers`,
                parse_mode: "HTML",
            })
            await bot.telegram.sendDocument(CHANNEL_ID, this.path, {
                caption: `Anime (<code>${this.resolution}</code>)\n@Not_Anime_Wallpapers`,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [[
                        {text: EMOJI.heart, callback_data: "0:heart"},
                        {text: EMOJI.like, callback_data: "0:like"},
                        {text: EMOJI.dislike, callback_data: "0:dislike"}
                    ]]
                }
            })
        }
        catch(e) {
            console.log(e)
        }
        return
    }
}

const auto_post = async () => {
    var wall_search = await axios.get(SEARCH_URL, {
        headers: {
            'X-Api-Key': API_KEY,
            "Cache-Control": "no-cache, private",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36"
        }
    })
    var dbPost = await PostTracker.findById("tracker")
    var latestPostId = dbPost.post_id
    if(wall_search.status === 200) {
        var wall_data = wall_search.data
        var counter = 24
        var posts = [] as WallpaperType[]
        if(latestPostId === "") {
            for (const _x of wall_data.data) {
                if (_x.file_size >= 1024 * 1024) {
                    posts.push(new WallPaper({
                        id: _x.id,
                        resolution: _x.resolution,
                        size: _x.file_size,
                        path: _x.path
                    } as WallpaperType));
                }
            }
        }
        if(latestPostId !== "") {
            for(const wall of wall_data.data) {
                if(wall_data.data.indexOf(wall) < counter) {
                    if(wall.id !== latestPostId && wall.file_size >= 1024*1024) {
                        posts.push(
                            new WallPaper({
                                id: wall.id,
                                resolution: wall.resolution,
                                size: wall.file_size,
                                path: wall.path
                            } as WallpaperType)
                        )
                    }
                    if(wall.id === latestPostId) {
                        counter = wall_data.data.indexOf(wall)
                    }
                }
                else {
                    continue
                }   
            }
        }   
        posts.reverse()
        if(posts.length <= 0) {
            console.log("Noting to Post")
        }
        if(posts.length > 0) {
            console.log("Loop Started")
            for(const post of posts) {
                await post.send()
            }
            console.log(posts[posts.length-1].id)
            try {
                await PostTracker.updateOne({_id: "tracker"}, {"$set": {post_id: posts[posts.length-1].id}})
            }
            catch(e) {
                console.log(e)
            }
            console.log("Loop completed")
        }
    }
    else {
        console.log(wall_search.statusText)
    }
}


bot.action(/[0-9]+:(heart|like|dislike)/, async context => {
    const query = context.callbackQuery
    const msg: Message = query.message!
    if("reply_markup" in msg) {
        var buttons = msg.reply_markup.inline_keyboard[0]
    }
    if("caption_entities" in msg) {
        var entities = msg.caption_entities
    }
    if("data" in query) {
        var data: string[] = query.data.split(":")
    }
    if("caption" in msg) {
        var caption = msg.caption
    }
    const new_count = Number(data[0])+1
    if(data[1] === "heart") {
        var _buttons = [[
            {text: `${EMOJI.heart} ${new_count}`, callback_data: `${new_count}:heart`},
            buttons[1], 
            buttons[2]
        ]]
    }
    if(data[1] === "like") {
        _buttons = [[
            buttons[0],
            {text: `${EMOJI.like} ${new_count}`, callback_data: `${new_count}:like`},
            buttons[2]
        ]]
    }
    if(data[1] === "dislike") {
        _buttons = [[
            buttons[0],
            buttons[1],
            {text: `${EMOJI.dislike} ${new_count}`, callback_data: `${new_count}:dislike`}
        ]]
    }
    try {
        await bot.telegram.editMessageCaption(CHANNEL_ID, msg.message_id, undefined, caption, {
            caption_entities: entities,
            reply_markup: {
                inline_keyboard: _buttons
            }
        })
    }
    catch(e) {
        console.log(e)
    }
})

setInterval(auto_post, 120000)

console.log("Starting The Bot...")
bot.launch()