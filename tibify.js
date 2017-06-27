'use strict';
const fs = require('fs');
const request = require('request-promise');

class Tibify {

  constructor() {
    this.userDeaths = [];
    this.userLevels = [];
    this.currentOnlineUsers = [];
    this.previouslyOnlineUsers = {};
  }

  saveConfigData(data) {
    fs.writeFileSync('./config.json', JSON.stringify(data), 'utf-8', err => {
      if (err) {
        console.log(`There has been an error saving the saved data: ${err.message}`);
      }
    });
  }

  getUserData(name) {
    return request.get(`https://api.tibiadata.com/v1/characters/${name}.json`);
  }

  saveNewUserData(username) {
    if (!this.userNameExists(username.characters.data.name)) {
      this.saveAllUserData(username);
    }
  }

  userNameExists(username) {
    const dataFile = './data.json';
    if (fs.existsSync(dataFile)) {
      try {
        let data = this.getFileData('data');
        return data.hasOwnProperty(username);
      } catch (err) {
        console.log('There was an error reading the saved data');
      }
    }
    return false;
  }

  getFileData(filename) {
    if (fs.existsSync(`./${filename}.json`)) {
      try {
        return JSON.parse(fs.readFileSync(`./${filename}.json`, 'utf-8'));
      } catch (err) {
        console.log(`There has been an error retrieving the saved data: ${err}`);
        return;
      }
    }
    return {};
  }

  saveAllUserData(user) {
    let savedData = this.getFileData('data');
    savedData[user.characters.data.name] = user;

    fs.writeFileSync('./data.json', JSON.stringify(savedData), 'utf-8', err => {
      if (err) {
        console.log(`There has been an error saving the saved data: ${err.message}`);
      }
    });
  }

  updateUserData() {
    let promises = [];
    let data = this.getFileData('data');

    Object.keys(data).forEach(key => {
      promises.push(this.getUserData(key));
    });

    return Promise.all(promises).then(results => {
      results.forEach(json => {
        this.saveAllUserData(JSON.parse(json));
      });
    });
  }

  updatePreviouslyOnlineUsers(username) {
    let previouslyOnline = this.previouslyOnlineUsers;
    let userCharacterList = this.getListOfUsers(username);
    
    userCharacterList.forEach(user => {
      if (user.status === 'online' && !previouslyOnline.hasOwnProperty(user.name)) {
        this.currentOnlineUsers.push(user.name);
        this.previouslyOnlineUsers[user.name] = user.name;        
      } else {
        delete this.previouslyOnlineUsers[user.name];
      }
    });
  }

  getListOfUsers(username) {
    let listOfUsers = [];
    let data = this.getFileData('data');
    let length = data[username].characters.other_characters.length;

    data[username].characters.other_characters.forEach(character => {
      listOfUsers.push({
        name: character.name,
        status: character.status
      });
    });
    return listOfUsers;
  }

  updateUserDeaths(username) {
    let data = this.getFileData('data');
    let user = this.getUserFromNotificationArray(this.userDeaths, username);
    let updatedDeathCount = data[username].characters.deaths.length;

    if (user) {
      if (updatedDeathCount > user.deathCount) {
        user.notified = false;
      }
      user.deaths = data[username].characters.deaths;
      user.deathCount = updatedDeathCount;
    } else {
      this.userDeaths.push({
        name: username,
        notified: false,
        deaths: data[username].characters.deaths,
        deathCount: data[username].characters.deaths.length
      });
    }
  }

  getUserFromNotificationArray(array, username) {
    for (let i = 0; i < array.length; i++) {
      if (array[i].name === username) {
        return array[i];
      }
    }
    return null;
  }

  updateUserLevels(username) {
    let data = this.getFileData('data');
    let user = this.getUserFromNotificationArray(this.userLevels, username);
    let updatedUserLevel = data[username].characters.data.level;

    if (user) {
      if (Number(updatedUserLevel) > Number(user.level)) {
        user.notified = false;
        user.leveledUp = true;
      }
      user.level = updatedUserLevel;
    } else {
      this.userLevels.push({
        name: username,
        notified: false,
        leveledUp: false,
        level: data[username].characters.level
      });
    }
  }
}

module.exports = Tibify;