//FSCProject TakingSomethingbot
//npm module
var fs = require('fs');
const config = JSON.parse(fs.readFileSync('config.json','utf8'))
var path = require('path');
const Telegraf = require('telegraf');
const sharp = require('sharp');
const cheerio = require('cheerio')
const request = require('superagent');
//define
const bot = new Telegraf(config.apikey);
const roundedCorners = new Buffer('<svg><circle r="90" cx="90" cy="90"/></svg>');
//file
try{
	fs.accessSync('botavatarcache.json')
}catch(err){
	fs.writeFileSync('botavatarcache.json','{}')
}
//bot
bot.telegram.getMe().then((botInfo) => {bot.options.username = botInfo.username})
bot.on('inline_query',(ctx)=>{inlineGet(ctx);console.log(ctx.inlineQuery)});
bot.command('take',(ctx)=>{
	var username = ctx.message.text.substr(ctx.message.entities[0]['length']+1);
	if (username.charAt(0) == '@'){
		commandGet(ctx,username.substr(1));
	}else{
		commandGet(ctx,username);
	}
});
bot.help((ctx)=>{ctx.reply('摸摸头 /take @用户名',{'reply_to_message_id':ctx.message.message_id})})
bot.command('about',(ctx)=>{ctx.replyWithMarkdown(`[本Bot图片素材来源](https://github.com/Sodium-Aluminate/Take-StickerPack)
程序&运维&服务器提供:@KerbalSpaceCenter
本Bot使用了[Telegraf电报机器人框架](https://telegraf.js.org/) [Sharp图片处理库](https://github.com/lovell/sharp)
`,{'reply_to_message_id':ctx.message.message_id})})
bot.startPolling();
//function	
async function inlineGet(ctx){
	var me = await getMeAvatar()
	if (ctx.inlineQuery.query == ''){		
		let avatarLink = await getUserAvatarLink(ctx.inlineQuery.from.username);
		if (avatarLink == ''){
			ctx.answerInlineQuery([{
				type:'sticker',
				id:'1',
				sticker_file_id:me
			}],{is_personal:true})
		}else{
			var stickerID = await getStickerFile(ctx,avatarLink);			
			ctx.answerInlineQuery([{
				type:'sticker',
				id:'1',
				sticker_file_id:stickerID
			},
			{
				type:'sticker',
				id:'2',
				sticker_file_id:me
			}],{cache_time:600,is_personal:true})
		}
		return
	}
	if (ctx.inlineQuery.query.charAt(0) == '@'){
		var avatarLink = await getUserAvatarLink(ctx.inlineQuery.query.substr(1));
	}else{
		var avatarLink = await getUserAvatarLink(ctx.inlineQuery.query);
	}	
	if (avatarLink == ''){
		ctx.answerInlineQuery([{
			type:'article',
			id:'1',
			title:"用户名不存在或此用户未设置头像",
			input_message_content:{message_text:"用户名不存在或此用户未设置头像"}
		}])
	}else{
		var stickerID = await getStickerFile(ctx,avatarLink);
		ctx.answerInlineQuery([{
			type:'sticker',
			id:'1',
			sticker_file_id:stickerID
		}],{cache_time:600})
	}
}
async function getStickerFile(ctx,avatarLink){
	var avatarData = request.get(avatarLink);
	var pict = await genPicPNG(genCircleAvatar(avatarData));
	var file = await bot.telegram.sendSticker(config.logchannel,{source:pict});
	bot.telegram.sendMessage(config.logchannel,'```\n'+`${JSON.stringify({queryContext:ctx.inlineQuery,stickerInfo:file.sticker})}`+'\n```',{'reply_to_message_id':file.message_id,parse_mode:'Markdown'})
	return file.sticker.file_id;
}
async function commandGet(ctx,username){
	var avatarLink = await getUserAvatarLink(username)
	if (avatarLink == ''){
		ctx.reply('用户名不存在或此用户未设置头像!')
	}else{
		var avatarData = request.get(avatarLink);
		var pict = await genPicPNG(genCircleAvatar(avatarData))
		ctx.replyWithSticker({source:pict},{'reply_to_message_id':ctx.message.message_id})
	}
}
async function getUserAvatarLink(username){//获取用户头像
	var tgweb = await request.get(`https://t.me/${username}`);
	const $ = cheerio.load(tgweb.text);
	const avatarFileLink = $('.tgme_page_photo_image').attr('src');
	if (avatarFileLink === undefined){return ''}
	return avatarFileLink
}
async function genPic(avatarStream,filename){//图片套模板
	data = await streamToBuffer(avatarStream)
	return await sharp('template1.png').overlayWith(data,{gravity:sharp.gravity.southeast}).webp().toBuffer()
}
async function genPicPNG(avatarStream,filename){//图片套模板
	data = await streamToBuffer(avatarStream)
	return await sharp('template1.png').overlayWith(data,{gravity:sharp.gravity.southeast}).png().toBuffer()
}
function genCircleAvatar(origStream){//圆形头像
	const pipeline = sharp()
	.resize(180, 180)
    .overlayWith(roundedCorners, { cutout: true })
    .png();
	return origStream.pipe(pipeline)
}
function filebuffer(data,filename){
	fs.writeFileSync(filename,data);
	return filename
}
function streamToBuffer(stream) {  
  return new Promise((resolve, reject) => {
    let buffers = [];
    stream.on('error', reject);
    stream.on('data', (data) => buffers.push(data))
    stream.on('end', () => resolve(Buffer.concat(buffers)))
  });
}
async function getMeAvatar(){
	var avatar = JSON.parse(fs.readFileSync('botavatarcache.json','utf8'))
	if (avatar.avatarid == null){
		var me = await getStickerFile('',await getUserAvatarLink(bot.options.username))
		fs.writeFileSync('botavatarcache.json',JSON.stringify({avatarid:me}))
		return me
	}
	return avatar.avatarid
}