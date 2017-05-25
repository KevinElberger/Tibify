'use strict';
const fs = require('fs');
const request = require('request-promise');

class Tibify {

  constructor() {
    this.notifyNames = [];
    this.previouslyOnlineUsers = {};
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
    if (this.configFileExists()) {
      try {
        let data = this.retrieveCurrentData();
        return data.hasOwnProperty(username);
      } catch (err) {
        console.log('There was an error reading the saved data');
      }
    }
    return false;
  }

  configFileExists() {
    if (fs.existsSync('./config.json')) {
      return true;
    }
    return false;
  }

  retrieveCurrentData() {
    if (this.configFileExists()) {
      try {
        return JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
      } catch (err) {
        console.log('There has been an error retrieving the saved data: ' + err);
        return;
      }
    }
    return {};
  }

  saveAllUserData(user) {
    let savedData = this.retrieveCurrentData();
    savedData[user.characters.data.name] = user;

    fs.writeFileSync('./config.json', JSON.stringify(savedData), function (err) {
      if (err) {
        console.log('There has been an error saving the saved data: ' + err.message);
        return;
      }
    });
  }

  updateConfigInfo() {
    var that = this;
    let data = that.retrieveCurrentData();
    let promises = [];

    Object.keys(data).forEach(key => {
      promises.push(that.getUserData(key));
    });

    return Promise.all(promises).then(results => {
      results.forEach(json => {
        that.saveAllUserData(JSON.parse(json));
      });
    });
  }

  checkForUpdatesWithAllUsers() {
    let data = this.retrieveCurrentData();
    for (let key in data) {
      this.updatePreviouslyOnlineUsers(key);
    }
  }

  updatePreviouslyOnlineUsers(username) {
    let userCharacterList = this.getListOfUsers(username);

    for (let i = 0; i < userCharacterList.length; i++) {
      if (userCharacterList[i].status === 'online' && this.previouslyOnlineUsers[userCharacterList[i].name] === undefined) {
        this.notifyNames.push(userCharacterList[i].name);
        this.previouslyOnlineUsers[userCharacterList[i].name] = userCharacterList[i].name;
      } else if (userCharacterList[i].status === 'offline' && this.previouslyOnlineUsers[userCharacterList[i].name] !== undefined) {
        delete this.previouslyOnlineUsers[userCharacterList[i].name];
      }
    }
  }

  getListOfUsers(username) {
    let listOfUsers = [];
    let data = this.retrieveCurrentData();
    let length = data[username].characters.other_characters.length;

    for (let i = 0; i < length; i++) {
      listOfUsers.push({
        name: data[username].characters.other_characters[i].name,
        status: data[username].characters.other_characters[i].status
      });
    }
    return listOfUsers;
  }
}

module.exports = Tibify;