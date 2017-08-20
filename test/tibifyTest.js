'use strict';
const chai = require('chai');
let rewire = require('rewire');
const tibify = rewire('../tibify.js');
const assert = chai.assert;

let fsStub = {
  writeFileSync: function(path, data, encoding, callback) {
    return JSON.stringify(data);
  },
  readFileSync: function(path, encoding, callback) {
    let dummyData = {"characters":{"data":{"name":"Beerju","level":"170","world":"Magera",
                    "last_login":[{"date":"2017-08-03 07:30:40.000000","timezone_type":2,"timezone":"CEST"}]},
                    "deaths":[{"date":{"date":"2017-08-01 08:12:16.000000","timezone_type":2,"timezone":"CEST"},
                    "level":"170","reason":"a hero"}],"other_characters":[{"name":"Asteran Birju","world":"Astera","status":"offline"},
                    {"name":"Beerju","world":"Magera","status":"offline"},{"name":"Birjsds","world":"Magera","status":"offline"},
                    {"name":"Birju","world":"Magera","status":"offline"},{"name":"Birjwe","world":"Magera","status":"offline"},
                    {"name":"Elite Brown","world":"Xantera","status":"offline"},{"name":"Sharp shooter","world":"Thera","status":"offline"}
                    ]}};
    return JSON.parse(dummyData);
  }
}
tibify.__set__('fs', fsStub);

describe('Tibify', function() {
  before(function() {
    this.tibify = new tibify();
  });

  it('should be an object', function() {
    assert.equal(typeof this.tibify, 'object');
  });

  it('should have defined properties', function() {
    assert.equal(typeof this.tibify.worldData, 'object');
    assert.equal(typeof this.tibify.userDeaths, 'object');
    assert.equal(typeof this.tibify.userLevels, 'object');
    assert.equal(typeof this.tibify.currentOnlineUsers, 'object');
    assert.equal(typeof this.tibify.previouslyOnlineUsers, 'object');
  });

  describe('saveConfigData', function() {
    it('should return undefined', function() {
      let data = {};
      assert.equal(this.tibify.saveConfigData('test', data), undefined);
    });
  });

  describe('getUserData', function() {
    it('should ')
  });
});