'use strict';
const scriptInfo = {
    name: 'SED Correction',
    file: 'correction.js',
    createdBy: 'Dave Richer'
};

const Models = require('bookshelf-model-loader');
const _ = require('lodash');
const c = require('irc-colors');

module.exports = app => {
    // Assure the database and logging table exists
    if (!app.Database && !Models.Logging) {
        return;
    }

    // Logging Model
    const loggingModel = Models.Logging;

    // Configuration
    const totalDbResults = 50;
    const triggerStart = 's';
    const specialChar = 'ᴥ';
    const delimiter = '/';
    // Computed
    const trigger = triggerStart + delimiter;
    const doubleDelimiter = delimiter + delimiter;

    /**
      Correct Listener Handler
      performs SED style corrections
    **/
    const correct = (to, from, text, message) => {
        // Trim Inital Input
        text = _.trim(text);

        // Bail if we do not have input, we are not triggered, we include the special char
        if (!text || !_.startsWith(text, trigger) || _.includes(text, specialChar)) return;

        // Remove any trailing delimiters
        if (text[text.length - 1] == delimiter) text = _.slice(text, 0, -1);

        // Remove the trigger, and escape double delimiters with special char
        text = _.replace(text, trigger, '').replaceAll(doubleDelimiter, specialChar);

        // Create the replacement string from a slice of the text
        // Bail if this results in a empty string
        let replacement = text.slice(text.lastIndexOf(delimiter));
        if (!replacement) return;

        // Remove the replacement from the text, and trim
        text = _.replace(text, replacement, '').trim();

        // Remove the leading delimiter, and unescape special char, then trim the replacement
        replacement = replacement.substr(1).replaceAll(specialChar, doubleDelimiter).trim();

        // Unescape and trim the text
        text = text.replaceAll(specialChar, doubleDelimiter).trim();

        // Bail if we have neither text or replacement
        if (!text || !replacement) return;

        // Initial found flag to false
        // This is used to bail out of the foreach ish TODO find a better way
        let found = false;

        // Perform the database query
        Models.Logging.query(qb => {
                qb
                    .select(['id', 'to', 'from', 'text'])
                    // Where the same channel the message is recieved from
                    .where('to', to)
                    // Where the text is not another correction line
                    .andWhere('text', 'not like', 's/%')
                    // Order desc and limit
                    .orderBy('id', 'desc')
                    .limit(totalDbResults)
            })
            .fetchAll()
            .then(results => {
                // Bail if we have no results
                if (!results || !results.length) return;

                // Interate over the database results
                results.forEach(result => {
                    let resultText = result.get('text');
                    let resultFrom = result.get('from');
                    let resultTo = result.get('to');

                    // Bail if we have previously found a math or
                    // if there are missing fiends in the database response or
                    // if the result text does not include the correction text
                    if (found || !resultText || !resultFrom || !resultTo || !_.includes(resultText, text)) return;
                    // Set the found flag
                    found = true;

                    // Is the corector the correctee
                    let isSamePerson = resultFrom === from && resultTo === to;

                    // Make final replacement, and bail if it ends up an empty string
                    let finalReplacement = _.replace(resultText, text, replacement);
                    if (!finalReplacement) return;
                    // The correctee and the corrector are the same person, modify the database
                    // This will allow for chaning
                    if (isSamePerson) {
                        result.set('text', finalReplacement);
                        result.save();
                    }
                    // Report back to IRC
                    let colorDelim = c.grey.bold('/');
                    let colorResultFrom = isSamePerson ? c.bold(resultFrom) : resultFrom;
                    let headerText = isSamePerson ? resultFrom : `${from}${colorDelim}${resultFrom}`;
                    app.say(to, `${c.grey.bold('[')}${c.red('SED')} ${headerText}${c.grey.bold(']')} ${finalReplacement}`);
                });
            });
    };

    // Listen and Correct
    app.Listeners.set('corrections', {
        desc: 'SED Corrections',
        call: correct
    });

    return scriptInfo;
};
