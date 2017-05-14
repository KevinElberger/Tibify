'use strict';
const fs = require('fs');
const clear = require('clear');
const inquirer = require('inquirer');
const request = require('request');

class Tibify {

  constructor() {
    this.onlineUsers = {};
    this.notifyNames = [];
  }

  getUserData(name, callback) {
    request.get(`https://api.tibiadata.com/v1/characters/${name}.json`, callback);
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
    let data;

    if (this.configFileExists()) {
      data = this.retrieveCurrentData();
    } else {
      return false;
    }

    try {
      return data[username] !== undefined;
    } catch (err) {
      console.log('There was an error reading the saved data');
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
    let data;

    try {
      if (this.configFileExists()) {
        data = fs.readFileSync('./config.json'); 
      } else {
        return {};
      }
    } catch (err) {
      console.log('There has been an error retrieving the saved data: ' + err);
      return;
    }
    return JSON.parse(data);
  }

  saveAllUserData(user) {
    let savedData = this.retrieveCurrentData();
    savedData[user.characters.data.name] = user;

    fs.writeFile('./config.json', JSON.stringify(savedData), function (err) {
      if (err) {
        console.log('There has been an error saving the saved data');
        console.log(err.message);
        return;
      }
    });
  }


  updateConfigInfo() {
    var that = this;
    return new Promise(function(resolve, reject) {
      let data = that.retrieveCurrentData();

      resolve(
        Object.keys(data).forEach(key => {
          that.getUserData(key, (err, response, body) => {
            console.log(err);
            that.saveAllUserData(JSON.parse(body));
          });
        })
      )
    });
  }

  checkForUpdatesWithAllUsers() {
    let data = this.retrieveCurrentData();
    for (let key in data) {
      this.updateOnlineUsers(key);
    }
  }

  updateOnlineUsers(username) {
    let userCharacterList = this.getListOfUsers(username);

    for (let i = 0; i < userCharacterList.length; i++) {
      if (userCharacterList[i].status === 'online' && this.onlineUsers[userCharacterList[i].name] === undefined) {
        this.notifyNames.push(userCharacterList[i].name);
        this.onlineUsers[userCharacterList[i].name] = userCharacterList[i].name;
      } else if (userCharacterList[i].status === 'offline' && this.onlineUsers[userCharacterList[i].name] !== undefined) {
        delete this.onlineUsers[userCharacterList[i].name];
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