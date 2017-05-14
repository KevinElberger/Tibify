'use strict';
const fs = require('fs');
const clear = require('clear');
const inquirer = require('inquirer');
const request = require('request');

class Tibify {
  constructor() {
    this.onlineUsers = {};
  }
  // if (configFileExists()) {
  //   setInterval(function() {
  //     updateConfigInfo().then(() => { checkForUpdatesWithAllUsers(); });
  //   }, 30000);
  // }

  // promptForUserName(function() {
  //     getUserData(arguments[0].addFriend, (err, response, body) => {
  //       saveNewUserData(JSON.parse(body));
  //     });
  // });

  promptForUserName(callback) {
    let question = [
      {
        name: 'addFriend',
        type: 'input',
        message: 'Enter the name of the player you want to monitor:',
        validate: function (value) {
          if (value.length) {
            return true;
          } else {
            return 'Please enter a valid name';
          }
        }
      }
    ];

    inquirer.prompt(question).then(callback);
  }

  getUserData(name, callback) {
    request.get(`https://api.tibiadata.com/v1/characters/${name}.json`, callback);
  }

  saveNewUserData(username) {
    if (userNameExists(username.characters.data.name)) {
      console.log('This user has already been added');
      return;
    } else {
      saveAllUserData(username);
    }
  }

  userNameExists(username) {
    let data;

    if (configFileExists()) {
      data = retrieveCurrentData();
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
      if (configFileExists()) {
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
    let savedData = retrieveCurrentData();
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
    return new Promise(function(resolve, reject) {
      let data = retrieveCurrentData();

      resolve(
        Object.keys(data).forEach(key => {
          getUserData(key, (err, response, body) => {
            saveAllUserData(JSON.parse(body));
          });
        })
      )
    });
  }

  checkForUpdatesWithAllUsers() {
    let data = retrieveCurrentData();
    for (let key in data) {
      userIsOnline(key);
    }
  }

  userIsOnline(username) {
    let userCharacterList = getListOfUsers(username);

    for (let i = 0; i < userCharacterList.length; i++) {
      if (userCharacterList[i].status === 'online' && onlineUsers[userCharacterList[i].name] === undefined) {
        console.log(`${userCharacterList[i].name} is online!`);
        onlineUsers[userCharacterList[i].name] = userCharacterList[i].name;
      } else if (userCharacterList[i].status === 'offline' && onlineUsers[userCharacterList[i].name] !== undefined) {
        delete onlineUsers[userCharacterList[i].name];
      }
    }
  }

  getListOfUsers(username) {
    let listOfUsers = [];
    let data = retrieveCurrentData();
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

module.exports = function() {
  Tibify
}