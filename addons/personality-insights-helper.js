'use strict';

require( 'dotenv' ).config( {silent: true} );

/**
 * twitter-helper is required to interface with the Twitter API to retrieve tweets (getTweetsAsync), 
 * to determine which tweets are written in English and are not retweets (englishAndNoRetweet), and to
 * convert the retrieved tweets to a contentItems object to be consumed by the Personality Insights profile 
 * function.
 */
var twitterHelper = require('./twitter-helper');
/**
 * Create an instance of the personality insights wrapper
 * Credentials are provided in the .env file
 */
var watson = require('watson-developer-cloud');
var personalityInsights = new watson.PersonalityInsightsV2({
  version_date: '2016-08-31'
});

/**
 * Public functions for this module
 */
module.exports = {
  invokePersonalityAsync: invokePersonalityAsync,
  setUserPersonality: setUserPersonality
};

function invokePersonalityAsync(tweets) {
  console.log('getPersonalityProfileAsync');
  return new Promise(
      function(resolve, reject) {
        personalityInsights.profile({'contentItems': twitterHelper.getContentItems(tweets)},
            (err, response) => {
              if (err) {
                reject(err);
              } else {
                resolve(response);
              }
            });
      });
}


/**
 * updateUserTone processes the Tone Analyzer payload to pull out the emotion, language and social
 * tones, and identify the meaningful tones (i.e., those tones that meet the specified thresholds).
 * The conversationPayload json object is updated to include these tones.
 * @param {Json} conversationPayload json object returned by the Watson Conversation Service
 * @param {Json} toneAnalyzerPayload json object returned by the Watson Tone Analyzer Service
 * @param {boolean} maintainHistory set history for each user turn in the  history context variable
 * @returns {void}
 */
function setUserPersonality(conversationPayload, personalityInsightsPayload) {
  var personality = null;
  var conscientiousness = null;
  var neuroticism = null; 
  var self_discipline = null;
  var immoderation = null;
  var dutifulness = null;

  conversationPayload.context.user.personality = initPersonality();
  var tree = personalityInsightsPayload.tree.children;

  personalityInsightsPayload.tree.children.forEach(
      function(category) {
        if (category.id === "personality") {
          personality = category;
        }
      });

  personality.children[0].children.forEach(
      function(facet) {
        if (facet.id === "Neuroticism") {
          neuroticism = facet;
        }
        if (facet.id === "Conscientiousness") {
          conscientiousness = facet;
        }
      });

  neuroticism.children.forEach(
      function(facet) {
        if (facet.id === "Immoderation") {
          immoderation = facet;
        }
      });

  conscientiousness.children.forEach(
      function(facet) {
        if (facet.id === "Self-discipline") {
          self_discipline = facet;
        }
        if (facet.id === "Dutifulness") {
          dutifulness = facet;
        }
      });

  conversationPayload.context.user.personality.neuroticism = neuroticism.percentage;
  conversationPayload.context.user.personality.conscientiousness = conscientiousness.percentage;
  conversationPayload.context.user.personality.dutifulness = dutifulness.percentage;
  conversationPayload.context.user.personality.immoderation = immoderation.percentage;
  conversationPayload.context.user.personality.self_discipline = self_discipline.percentage;

  if(neuroticism.percentage > 0.75 || immoderation.percentage > 0.75 || self_discipline.percentage < 0.25) conversationPayload.context.user.personality.likely_to_eat_unhealthy = "true";
  if(conscientiousness.percentage > 0.75 || dutifulness.percentage > 0.75 || self_discipline.percentage > 0.75) conversationPayload.context.user.personality.likely_to_eat_healthy = "true";

  return conversationPayload;
}

function initPersonality() {
  return (
    {
      
      'conscientiousness': null,
      'immoderation': null,
      'dutifulness': null,
      'neuroticism': null,
      'self_discipline': null,
      'likely_to_eat_unhealthy': null,
      'likely_to_eat_healthy': null
    });
}

