"use strict";

// include the node.js native http package 
var http = require('http');
var https = require('https');

// Include Flickr package
var Flickr = require("node-flickr");

// flickr app key
var keys = {"api_key": "YOUR FLICKR KEY"}

// initialize the Flickr client
var flickr = new Flickr(keys);

// Include TelegramBot package
var TelegramBot = require('node-telegram-bot-api');

// Telegram bot token (given when you create a new bot using the BotFather);
var telegramBotToken = 'YOUR BOT TOKEN';

// Telegram bot setup
var telegramBot = new TelegramBot(telegramBotToken, {polling: false});    

// By default, handler is called when the Lambda function is run.  
// 'event' contains all of the information about the request, including the Telegram user's info and their message
// See the 'sample-message.json' file for an example
exports.handler = function(event, context, lambdaCallback) {
    // normally we would do some sort of command parsing, but for this example we are just going to reply with the photo list whenever we receive any request

    // parse the chat ID so we can respond
    var chatId = event.message.chat.id;
    
    // let them know we're working
    telegramBot.sendMessage(chatId, "Howdy! I'm fetching your images, just one second...");

    // track how many images have been sent to the Telegram user
    var sentImageCount = 0;

    // get the list of interesting images from the flickr API. url_m will ensure we get the image URL
    flickr.get("interestingness.getList", {extras: "url_m", per_page: 5}, function(err, result){
        if (err) return console.error('Flickr error: ' + err);

        // loop through all of the photos in the photo set
        for(var x in result.photos.photo) {

            // get the photo JSON object we are working with
            var photo = result.photos.photo[x];
            
            // Fetch the binary image buffer from flickr
            getImageBuffer(photo, function(err, photo, buffer) {

                // build a URL so the user can visit the photos page if they like
                var photoUrl = "https://www.flickr.com/photos/" + photo.owner + "/" + photo.id;
                
                // build the caption using the photo title and url
                var caption = photo.title + "\n" + photoUrl;

                // now that we have the buffer, we can send it to the Telegram user
                // For more options, see the Telegram bot API docs
                telegramBot.sendPhoto(chatId, buffer, {caption: caption}).then(function() {
                    sentImageCount++;

                    // if we've sent all of the images, call the Lambda callback, which ends the Lambda process
                    if(sentImageCount == result.photos.length) {
                        lambdaCallback(null,'');
                    }
                });
            });

        }
    });


};

function getImageBuffer(photo, callback) {

    // request the image from flickr
    var req = https.get(photo.url_m, function(res) {
        
        // the data will come as Buffers in chunks.  We setup an array to hold all of the chunks
        var data = [ ];

        // every time we receive a chunk, add it to our array
        res.on('data', function(chunk) {
            data.push(chunk);
        });

        // this is called once all of the data has been received
        res.on('end', function() {

            // combine all of the chunks into a single buffer
            var binary = Buffer.concat(data);

            // return the buffer to the callback
            callback(null, photo, binary);
        });

        // handle errors
        res.on('error', function(err) {
            console.log("Error during HTTP request");
            callback(err.message);
        });
    });


}