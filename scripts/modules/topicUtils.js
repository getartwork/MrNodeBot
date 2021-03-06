'use strict';
const scriptInfo = {
  name: 'Topic Utilities',
  desc: 'Utilites to view and manipulate the channel topic',
  createdBy: 'IronY'
};
const Models = require('bookshelf-model-loader');
const Moment = require('moment');
// Used to break up topics
const divider = ' | ';

module.exports = app => {
  // Bailout if we do not have database
  if (!app.Database || !Models.Topics) return;

  // Get the last 5 topics
  const topics = (to, from, text, message) => {
    let channel = text || to;
    Models.Topics.query(qb => qb
        .where('channel', 'like', channel)
        .orderBy('timestamp', 'desc')
        .limit(20)
        .select(['topic', 'nick', 'timestamp'])
      )
      .fetchAll()
      .then(results => {
        if (!results.length) {
          app.say(to, `There is no data available for ${channel}`);
          return;
        }
        app.say(to, `The Topic history has been private messaged to you ${from}`);
        results.each((result, index) => app.say(from, `[${index + 1}]: ${result.get('topic')} | ${result.get('nick')} ${Moment(result.get('timestamp')).fromNow()}`));
      });
  };
  app.Commands.set('topics', {
    desc: '[channel] get the last 20 topics',
    access: app.Config.accessLevels.identified,
    call: topics
  });

  // Helper function to get a the a promise on the channels topics
  const getTopics = (channel, limit) => Models.Topics.query(qb => {
    qb.where('channel', channel).orderBy('timestamp', 'desc');
    if (limit) qb.limit(limit);
    qb.select(['topic'])
  }).fetchAll();

  // Revert to the last known topic
  const revertTopic = (to, from, text, message) => {
    if (!app._ircClient.canModifyTopic(to)) {
      app.say(to, `I am unable to change the topic in this channel ${from}`);
      return;
    }

    getTopics(to, 2)
      .then(results => {
        if (results.length < 2) {
          app.say(to, 'There is not enough data available for this channel');
          return;
        }
        app.say(to, `Attempting to revert the topic as per your request ${from}`);
        app._ircClient.send('topic', to, results.pluck('topic')[1]);
      });
  };
  app.Commands.set('topic-revert', {
    desc: 'Restore the topic in the active channel to its previous state',
    access: app.Config.accessLevels.admin,
    call: revertTopic
  });

  // Append a topic segment
  const appendTopic = (to, from, text, message) => {
    if (!message) {
      app.say(to, 'You need to give me something to work with here...');
      return;
    }
    if (!app._ircClient.canModifyTopic(to)) {
      app.say(to, `I am unable to change the topic in this channel ${from}`);
      return;
    }
    getTopics(to, 1)
      .then(results => {
        if (!results.length) {
          app.say(to, 'There is no topics available for this channel');
          return;
        }
        let topic = results.pluck('topic')[0];
        let topicString = topic || '';
        let dividerstring = topic ? divider : '';
        app._ircClient.send('topic', to, `${topicString}${dividerstring}${text}`);
      });
  };
  app.Commands.set('topic-append', {
    desc: 'Append to the previous topic (in channel)',
    access: app.Config.accessLevels.admin,
    call: appendTopic
  });

  // Subtract a topic segment
  const subtractTopic = (to, from, text, message) => {
    if (!app._ircClient.canModifyTopic(to)) {
      app.say(to, `I am unable to change the topic in this channel ${from}`);
      return;
    }

    getTopics(to, 1)
      .then(results => {
        if (!results.length) {
          app.say(to, 'There is not topics available for this channel');
          return;
        }

        let topic = results.pluck('topic')[0];

        if (!topic) {
          app.say(to, 'That is all she wrote folks');
          return;
        }

        topic = topic.split(divider);

        if (!text) topic.splice(-1, 1);
        else {
          let index = topic.indexOf(text);
          if (index === -1) {
            app.say(to, `I am not sure you are reading that correctly ${from}`);
            return;
          }
          topic.splice(index, 1);
        }

        topic = topic.join(divider);
        app._ircClient.send('topic', to, topic);
      });
  };
  app.Commands.set('topic-subtract', {
    desc: 'Remove a segement from the channels topic',
    access: app.Config.accessLevels.admin,
    call: subtractTopic
  });

  // Get a list of the topics segments
  const topicSegments = (to, from, text, message) => {
    getTopics(to, 1)
      .then(results => {
        if (!results.length) {
          app.say(to, 'There is not topics available for this channel');
          return;
        }

        let topic = results.pluck('topic')[0];

        if (!topic) {
          app.say(from, `There is no topic data available for ${to}`);
          return;
        }

        topic = topic.split(divider);

        if (!topic.length) {
          app.say(from, `There is no segments available for the topic in ${to}`);
          return;
        }

        app.say(to, `I have oh so personally delivered that information to you ${from}`);
        app.say(from, `Here are the topic segements for ${to}`);
        topic.forEach((r, x) => app.say(from, `[${x + 1}] ${r}`));
      });
  };
  app.Commands.set('topic-segments', {
    desc: 'Get a list of the current topic segments',
    access: app.Config.accessLevels.identified,
    call: topicSegments
  });

  // Return the script info
  return scriptInfo;
};
