// characters.js
module.exports = function(app, db) {
    var Character = require('../../entity/character')(db);

    // all characters for a user
    app.get('/api/user/:userId/characters', function(req, res) {
        var userId = parseInt(req.params.userId, 10);

        if(userId === 0) {
            // guest
            if(req.cookies.guestCharacterId) {
                Character.get(req.cookies.guestCharacterId).then(function(character) {
                    res.send([character]);
                }, function(err) {
                    res.send(404, 'error loading guest character');
                });
            } else {
                res.send([]);
            }
        } else {
            // lock this down to only your own user (todo: allow admin)
            if(req.isAuthenticated() && req.user.id === userId) {
                Character.getAllForUser(userId).then(function(characters) {
                    res.send(characters);
                }, function(err) {
                    res.send(404, 'error loading characters for user: ' + userId);
                });
            } else {
                res.send(403, 'Cannot retreive characters that aren\'t yours');
            }
        }
    });

    app.post('/api/user/:userId/characters', app.ensureAuthenticated, function(req, res) {
        var userId = parseInt(req.params.userId, 10);

        if(req.user.id !== userId) {
            res.send(403, 'Cannot create characters for someone else!');
            return;
        }

        var character = new Character(req.body);
        character.user = userId;
        character.$create().then(function() {
            // object should be updated from DB with ID and whatever else...
            res.send(character);
        }, function(err) {
            res.send(500, err);
        });
    });

    app['delete']('/api/user/:userId/characters/:characterId', app.ensureAuthenticated, function(req, res) {
        // todo: allow admin to delete a user's char? (&& req.user.admin !== 1)
        var userId = parseInt(req.params.userId, 10),
            characterId = parseInt(req.params.characterId, 10);

        if(req.user.id !== userId) {
            res.send(403, 'Cannot delete another user\'s character!');
            return;
        }

        Character.get(characterId)
            .then(function(character) {
                // double check character and user match
                if(character.user === userId) {
                    character.$delete().then(function() {
                        if(req.user.characterused === character.id) {
                            req.user.characterused = 0;
                            // todo: persist!
                        }
                        res.send('OK');
                    }, function(err) {
                        res.send(500, 'error deleting character! ' + err);
                    });
                } else {
                    res.send(403, 'Cannot delete another user\'s character!');
                }
            }, function(err) {
                if(err === 'not found') {
                    res.send(404, err);
                } else {
                    res.send(500, err);
                }
            });
    });

    app.post('/api/user/:userId/characters', function(req, res) {
        var userId = parseInt(req.params.userId, 10);

        if(userId === 0) {
            // guest
            if(req.cookies.guestCharacterId) {
                Character.get(req.cookies.guestCharacterId).then(function(character) {
                    res.send(character);
                }, function(err) {
                    res.send(404, 'error loading guest character');
                });
            } else {
                // generate a new random one
                Character.getRandom(userId).then(function(character) {
                    res.cookie('guestCharacterId', character.id, { maxAge: 900000, httpOnly: false});
                    res.send(character);
                }, function(err) {
                    res.send(500, err);
                });
            }
        } else {
            // create character
            res.send('creating new character for ' + userId);
        }
    });
};