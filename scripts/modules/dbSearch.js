'use strict';
const scriptInfo = {
  name: 'dbSearch',
  desc: 'Provides some interaction with the message logging model, such has total messages, random line' +
    'and last mentioned',
  createdBy: 'IronY'
};
const _ = require('lodash');
const Moment = require('moment');
const Models = require('bookshelf-model-loader');
const logger = require('../../lib/logger');


// Database Specific Commands
// Commands: last-mentioned, random-line
module.exports = app => {
  // Only enabled if there is a database available
  if (!Models.Logging) return scriptInfo;

  const total = (to, from, text, message) => Models.Logging
    .where('to', '=', to)
    .count()
    .then(result => app.say(to, `Total Messages from ${to}: ${result}`));

  const randomLine = (to, from, text, message) => {
    Models.Logging.query(qb => {
        qb.select('from', 'text').where('to', to).orderByRaw('rand()').limit(1);
        if (text) qb.andWhere('text', 'like', text);
      })
      .fetch()
      .then(result =>
        app.say(to, !result ?
          `Nothing like that has ever been said in here... yet!` :
          `${result.get('from')} : ${result.get('text')}`
        )
      );
  };

  // Search channel by search terms
  const searchTerms = (to, from, text, message) => {
    let [terms, channel, nicks] = text.split(' ');

    channel = channel || to;
    terms = _.without(terms.split('|'), '');
    nicks = !_.isUndefined(nicks) ? _.without(nicks.split('|'), '') : [];
    if (!terms.length) {
      app.say(to, `You have not presented any search terms`);
      return;
    }
    Models.Logging
      .query(qb => qb
        .where('to', 'like', channel).andWhere(clause => terms.forEach(term => clause.andWhere('text', 'like', `%${term}%`)))
        .andWhere(clause => nicks.forEach(nick => clause.andWhere('from', 'like', nick)))
        .orderBy('timestamp', 'desc')
      )
      .fetchAll()
      .then(results => {
        if (!results.length) {
          app.say(to, `No results found for terms ${terms.join(', ')} in ${channel}`);
          return;
        }
        app.say(to, `Sending ${results.length} result(s) for your search on ${terms.join(', ')} in ${channel}`);
        app.say(from, `Providing ${results.length} result(s) for term(s) ${terms.join(', ')} in ${channel}`);
        let delay = 0;
        results.forEach(result => {
          delay = delay + 1;
          setTimeout(
            () => app.say(from, `${result.attributes.from} ${Moment(result.attributes.timestamp).fromNow()} - ${result.attributes.text}`),
            delay * 2000,
            result,
            from
          );
        });
      })
      .catch(err => logger.error('Error in searchTerms', {
        err
      }));
  };

  // Total Messages command
  app.Commands.set('search-terms', {
    desc: '[terms] [channel?] - Search Buffer by terms',
    access: app.Config.accessLevels.admin,
    call: searchTerms
  });

  const lastSaid = (to, from, text, message) => {
    // No text was provided
    if (!text) {
      app.say(to, 'You did not enter in a word, silly');
      return;
    }
    Models.Logging
      .query(qb => qb
        .where('to', 'like', to)
        .andWhere('text', 'like', text)
        .orderBy('id', 'desc')
        .limit(1)
      )
      .fetch()
      .then(result => {
        if (!result) {
          app.say(to, 'Nothing was ever said like that in this channel');
          return;
        }

        let resFrom = result.get('from');
        let resTo = result.get('to');

        if (resTo === resFrom) {
          // The request is from the originator of the private message
          if (resfrom !== from) app.say(to, 'The last utterance of that was told to me in private and I am not willing to share');
          // Request is from someone other than who sent the message
          else app.say(from, `You said "${result.get('text')}" ${Moment(result.get('timestamp')).fromNow()} in a private message`);
        } else app.say(to, `${resFrom} said "${result.get('text')}" on ${Moment(result.get('timestamp')).fromNow()} in this channel`);

      });
  };

  // Total Messages command
  app.Commands.set('total', {
    desc: 'Get total amount of recorded messages for the current channel',
    access: app.Config.accessLevels.identified,
    call: total
  });

  // random-line command
  app.Commands.set('random-line', {
    desc: '[Search Text?] Get a random line from the channel, accepts argument as search string',
    access: app.Config.accessLevels.identified,
    call: randomLine
  });

  // last-mentioned command
  app.Commands.set('last-said', {
    desc: '[phrase] Get the last time a phrase was said',
    access: app.Config.accessLevels.identified,
    call: lastSaid
  });

  // Return the script info
  return scriptInfo;
};
