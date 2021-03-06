'use strict';
const _ = require('lodash');
const pusher = require('../../lib/pusher');

module.exports = results => new Promise(resolve => {
  // Bail if we do not have pusher
  if (!pusher) return resolve(results);

  // Decide which pusher channel to push over
  let channel = /\.(gif|jpg|jpeg|tiff|png)$/i.test(results.url) ? 'image' : 'url';

  // Grab a timestamp
  let timestamp = Date.now();

  // Prepare Output
  let output = {
    url: results.url,
    to: results.to,
    from: results.from,
    timestamp,
    title: results.title || '',
    threat: _.isEmpty(results.threats)
  };

  // Include an ID if we have one
  if (results.id) output.id = results.id;
  // Include a ShortUrl if we have one
  if (results.shortUrl) output.shortUrl = results.shortUrl;

  // Set output to Pusher
  pusher.trigger('public', channel, output);

  // Append results
  results.delivered.push({
    protocol: 'pusher',
    to: channel,
    on: timestamp
  });

  // Trigger a update on the youtube channel if we have a youtube link
  // Fire off youtube data
  if (pusher && results.youTube) pusher.trigger('public', 'youtube', Object.assign(results.youTube, {
    to: results.to,
    from: results.from,
    timestamp: timestamp,
    index: results.youTube.index || 0,
    seekTime: results.youTube.seekTime || 0
  }));

  resolve(results);
});
