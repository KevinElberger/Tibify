'use strict';
let fs = require('fs');
const request = require('request-promise');

class Tibify {

  constructor() {
    this.worldData = {};
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
    let encodedName = name.split(' ').join('%20');
    return request.get(`https://api.tibiadata.com/v1/characters/${encodedName}.json`);
  }

  getWorldData(name) {
    return request.get(`https://api.tibiadata.com/v1/worlds/${name}.json`);
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

  updateWorldData() {
    let promises = [];
    let data = this.getFileData('data');

    Object.keys(data).forEach(key => {
      if (data[key].characters.other_characters.length < 1) {
        promises.push(this.getWorldData(data[key].characters.data.world));
      }
    });

    return Promise.all(promises);
  }

  updatePreviouslyOnlineUsers(username) {
    let user = this.getCorrectUser(username);
    let previouslyOnline = this.previouslyOnlineUsers;

    if (user.status === 'online' && !previouslyOnline.hasOwnProperty(user.name)) {
      this.currentOnlineUsers.push(user.name);
      previouslyOnline[user.name] = user.name;        
    } else if (user.status === 'offline' && previouslyOnline.hasOwnProperty(user.name)) {
      delete previouslyOnline[user.name];
    }
  }

  getCorrectUser(username) {
    let onlinePlayers;
    let data = this.getFileData('data');
    let newUser = { name: '', status: '' };
    let otherCharacters = data[username].characters.other_characters;

    if (otherCharacters.length === 0) {
      newUser = this.getUserFromWorldData(username);
      return newUser;
    } else {
      ({name: newUser.name, status: newUser.status} = otherCharacters.find(user => {
          return user.name === username;
      }));
      return newUser;
    }
  }

  getUserFromWorldData(username) {
    let user = {name: '', status: ''};
    let onlinePlayers = this.worldData[username].worlds.players_online;

    Object.keys(onlinePlayers).forEach(player => {
      if (onlinePlayers[player].name === username) {
        user.name = onlinePlayers[player].name;
        user.status = 'online';
        return user;
      }
    });

    if (user.length < 1) {
      user.name = username;
      user.status = 'offline';
    }
    return user;
  }

  updateUserDeaths(username) {
    let data = this.getFileData('data');
    let user = this.userDeaths.find(user => user.name === username);
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

  updateUserLevels(username) {
    let data = this.getFileData('data');
    let user = this.userLevels.find(user => user.name === username);
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

const tibify = new Tibify();
Object.freeze(tibify);

module.exports = tibify;