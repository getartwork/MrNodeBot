'use strict';
const scriptInfo = {
    name: 'tell',
    file: 'tell.js',
    createdBy: 'Dave Richer'
};

const _ = require('lodash');

/*
    Send a message
    tell <nick> <message>
*/
module.exports = app => {
    const tell = (to, from, text, message) => {
        let textArray = text.split(' ');
        if (!textArray.length) {
            app.say(to, 'I need some more information...');
            return;
        }
        let [nick] = textArray;
        let body = _.without(textArray, nick);
        if (!nick || !body) {
            app.say(to, 'I need some more information...');
            return;
        }
        app.say(nick, body);
        app.say(to, 'I have told ' + nick + '  ' + body);
    };
    // Terminate the bot and the proc watcher that keeps it up
    app.Commands.set('tell', {
        desc: 'tell [nick] [message] : Reach out and touch somebody',
        access: app.Config.accessLevels.owner,
        call: tell
    });

    // Return the script info
    return scriptInfo;
};
