// This module takes a raw xml rss feed and parses out the parts that are
// relevant to a podcast player

const xml2js = require('xml-js').xml2js

function parseFeedItem(item) {
  return {
    title: item.title._text,
    date: item.pubDate._text,
    url: item.enclosure._attributes.url
  }
}

function parseFeed(xmlFeed) {
  const feed = xml2js(xmlFeed, { compact: true }).rss.channel

  return {
    title: feed.title._text,
    description: feed.description._text || feed.description._cdata,
    image: feed.image
      ? feed.image.url._text
      : feed['itunes:image']._attributes.href,
    items: feed.item.map(parseFeedItem)
  }
}

module.exports = parseFeed
