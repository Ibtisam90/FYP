const express = require('express');
const axios = require("axios")
const router = express.Router();
const Result = require('../models/Result');
const MultiplayerResult = require('../models/multiplayerResult');
const User = require("../models/user");
const mongoose = require('mongoose');
const Question = require("../models/question");

router.get('/multiplayerMatchResults/:playerId', async (req, res) => {

    const playerId = mongoose.Types.ObjectId(req.params.playerId);
    
    MultiplayerResult.aggregate([
        // Match documents that contain the specified player ID
        { $match: { 'players': { $elemMatch: { [playerId]: { $exists: true } } } } },
        
        { $group: {
          _id: null, // Remove the grouping by 'winner' field
          gamesWon: {
            $sum: {
              $cond: {
                if: {
                  $and: [
                    
                    { $eq: ['$winner', playerId] } // Check if playerId is the winner
                  ]
                },
                then: 1,
                else: 0
              }
            }
          },
          gamesLost: {
            $sum: {
              $cond: {
                if: {
                  $and: [
                   
                    { $ne: ['$winner', playerId] } // Check if playerId is not the winner
                  ]
                },
                then: 1,
                else: 0
              }
            }
          },
          totalGames: { $sum: 1 } 

        }},
        { $project: { _id: 0 } } // Exclude the _id field from the final output
      ], (err, results) => {
        if (err) {
          console.error(err);
          res.status(500).send('Error retrieving results');
        } else {
           
          res.json(results);
        }
      });
      
      
});

router.get('/multiplayerAllResults', async (req, res) => {

    const players = await User.find({},{_id:1});
    allResults = []
    // console.log(players);

    for(i=0; i<players.length; i++){

        console.log(players[i]._id)
        p_id = players[i]._id.toString();

      await MultiplayerResult.aggregate([
            // Match documents that contain the specified player ID
            { $match: { 'players': { $elemMatch: { [p_id]: { $exists: true } } } } },
            // Group the results by the winner field and calculate the count of games won and lost
            { $group: {
              _id: '$winner',
              gamesWon: { $sum: { $cond: { if: { $eq: ['$winner', p_id] }, then: 1, else: 0 } } },
              gamesLost: { $sum: { $cond: { if: { $ne: ['$winner', p_id] }, then: 1, else: 0 } } }
            }},
            // // Optionally, project the results to exclude the _id field
            // { $project: { _id: 0 } }
          ], (err, results) => {
            if (err) {
              console.error(err);
              res.status(500).send('Error retrieving results');
            } else {
                // console.log(results.length);
    
            myIndex=0;
            if(results[0]._id==p_id){
                results[0].gamesWon=results[1].gamesLost;
            }
            else{
                results[1].gamesWon=results[0].gamesLost;
                myIndex=1;
            }
    
            results[myIndex]["totalGames"] = results[myIndex].gamesWon + results[myIndex].gamesLost;
            allResults.push(results[myIndex]);
            //   res.json(results[myIndex]);
            }
          });
    }

    res.json(allResults);
});


router.get('/multiplayerMatchResults', async (req, res) => {
  try {
    const users = await User.find();
    const playerResults = {};

    await Promise.all(users.map(async (user) => {
      const playerId = user._id;

      try {
        const results = await MultiplayerResult.aggregate([
          { $match: { 'players': { $elemMatch: { [playerId]: { $exists: true } } } } },
          {
            $group: {
              _id: null,
              gamesWon: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$winner', playerId] }
                      ]
                    },
                    then: 1,
                    else: 0
                  }
                }
              },
              gamesLost: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        { $ne: ['$winner', playerId] }
                      ]
                    },
                    then: 1,
                    else: 0
                  }
                }
              },
              totalGames: { $sum: 1 }
            }
          },
          { $project: { _id: 0 } }
        ]);

        playerResults[playerId] = results;
      } catch (err) {
        console.error(err);
        res.status(500).send('Error retrieving results');
      }
    }));

    res.json(playerResults);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error retrieving results');
  }
});

module.exports = router