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
    fs.writeFileSync('./config.json', JSON.stringify(data), function (err) {
      if (err) {
        console.log('There has been an error saving the saved data: ' + err.message);
        return;
      }
    });
  }

  getUserData(name) {
    return request.get(`https://api.tibiadata.com/v1/characters/${name}.json`);
  }

  saveNewUserData(username) {
    if (this.userNameExists(username.characters.data.name)) {
      console.log('This user has already been added');
      return;
    } else {
      this.saveAllUserData(username);
    }
  }

  userNameExists(username) {
    if (fs.existsSync('./data.json')) {
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
        console.log('There has been an error retrieving the saved data: ' + err);
        return;
      }
    }
    return {};
  }

  saveAllUserData(user) {
    let savedData = this.getFileData('data');
    savedData[user.characters.data.name] = user;

    fs.writeFileSync('./data.json', JSON.stringify(savedData), function (err) {
      if (err) {
        console.log('There has been an error saving the saved data: ' + err.message);
        return;
      }
    });
  }

  updateUserData() {
    var that = this;
    let promises = [];
    let data = that.getFileData('data');

    Object.keys(data).forEach(key => {
      promises.push(that.getUserData(key));
    });

    return Promise.all(promises).then(results => {
      results.forEach(json => {
        that.saveAllUserData(JSON.parse(json));
      });
    });
  }

  updatePreviouslyOnlineUsers(username) {
    let userCharacterList = this.getListOfUsers(username);

    for (let i = 0; i < userCharacterList.length; i++) {
      if (userCharacterList[i].status === 'online' && this.previouslyOnlineUsers[userCharacterList[i].name] === undefined) {
        this.currentOnlineUsers.push(userCharacterList[i].name);
        this.previouslyOnlineUsers[userCharacterList[i].name] = userCharacterList[i].name;
      } else if (userCharacterList[i].status === 'offline' && this.previouslyOnlineUsers[userCharacterList[i].name] !== undefined) {
        delete this.previouslyOnlineUsers[userCharacterList[i].name];
      }
    }
  }

  getListOfUsers(username) {
    let listOfUsers = [];
    let data = this.getFileData('data');
    let length = data[username].characters.other_characters.length;

    for (let i = 0; i < length; i++) {
      listOfUsers.push({
        name: data[username].characters.other_characters[i].name,
        status: data[username].characters.other_characters[i].status
      });
    }
    return listOfUsers;
  }

  updateUserDeaths(username) {
    let data = this.getFileData('data');
    let user = this.getUserInUserDeaths(username);
    let updatedDeathCount = data[username].characters.deaths.length;

    if (user !== null) {
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

  getUserInUserDeaths(username) {
    for (let i = 0; i < this.userDeaths.length; i++) {
      if (this.userDeaths[i].name === username) {
        return this.userDeaths[i];
      }
    }
    return null;
  }

  updateUserLevels(username) {
    let data = this.getFileData('data');
    let user = this.getUserInLevelArray(username);
    let updatedUserLevel = data[username].characters.data.level;

    if (user !== null) {
      if (Number(updatedUserLevel) > Number(user.level)) {
        user.notified = false;
      }
      user.level = updatedUserLevel;
    } else {
      this.userLevels.push({
        name: username,
        notified: false,
        level: data[username].characters.level
      });
    }
  }

  getUserInLevelArray(username) {
    for (let i = 0; i < this.userLevels.length; i++) {
      if (this.userLevels[i].name === username) {
        return this.userLevels[i];
      }
    }
    return null;
  }
}

module.exports = Tibify;