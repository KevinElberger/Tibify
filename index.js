var fs = require('fs');
var clear = require('clear');
var inquirer = require('inquirer');
var requestify = require('requestify');


(function() {
    'use strict';

    clear();
    promptForUserName(function() {
        getUserData(arguments[0].addFriend);
    });

    function promptForUserName(callback) {
        let question = [
            {
                name: 'addFriend',
                type: 'input',
                message: 'Enter the name of the player you want to monitor:',
                validate: function(value) {
                    if (value.length) {
                        return true;
                    } else {
                        return 'Please enter a valid name';
                    }
                }
            }
        ]

        inquirer.prompt(question).then(callback);
    }

    function getUserData(name) {
        requestify.get('https://api.tibiadata.com/v1/characters/' + name + '.json').then(function(response) {
            saveUserData(response.getBody());
        });
    }

    function saveUserData(user) {
        let dataContainer;
        let userData = JSON.stringify(user);

        if (userNameExists(user.characters.data.name)) {
            console.log('This user has already been added');
            return;
        } else {
            dataContainer = retrieveCurrentData();
            dataContainer[user.characters.data.name] = userData;

            fs.writeFile('./config.json', JSON.stringify(dataContainer), function(err) {
                if (err) {
                    console.log('There has been an error saving the saved data');
                    console.log(err.message);
                    return;
                }
                console.log('Configuration saved successfully');
            });
        }
    }

    function userNameExists(username) {
        let data;
        
        if (configFileExists()) {
            data = retrieveCurrentData();    
        } else {
            return false;
        }     

        try {
            if(data[username] === undefined) {
                return false;
            }
            return true;
        } catch(err) {
            console.log('There was an error reading the saved data');
        }
        return false;
    }

    function configFileExists() {
        if (fs.existsSync('./config.json')) {
            return true;
        }
        return false;
    }

    function retrieveCurrentData() {
        let data;

        try {
            if (!configFileExists()) {
                return {};
            } else {
                data = fs.readFileSync('./config.json');
            }

            return JSON.parse(data);
        } catch(err) {
            console.log('There has been an error retrieving the saved data');
            console.log(err);
            return;
        }
        return data;
    }

}());