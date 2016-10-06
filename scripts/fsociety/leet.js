'use strict';
const scriptInfo = {
    name: 'leet',
    file: 'leet.js',
    createdBy: 'Dave Richer'
};


const leetSpeak = require('../../helpers').leetSpeak;
const _ = require('lodash');
/*
    Send an elite message
    leet <nick> <message>
*/
module.exports = app => {
    const leet = (to, from, text, message) => {
      let textArray = text.split(' ');
        if (!textArray.length) {
            app.say(from, 'I need some more information...');
            return;
        }
        let [nick] = textArray;
        let body = _.without(textArray,nick).join(' ');
        if (!nick || !body) {
            app.say(from, 'I need some more information...');
            return;
        }
        let leetBody = leetSpeak(body);
        app.say(nick, leetBody);
        app.say(from, 'I have told ' + nick + '  ' + leetBody);
    };

    // Terminate the bot and the proc watcher that keeps it up
    app.Commands.set('leet', {
        desc: 'leet [nick] [message] : Reach out and touch somebody',
        access: app.Config.accessLevels.owner,
        call: leet,
        deps: ['tell']
    });

    // Return the script info
    return scriptInfo;
};
