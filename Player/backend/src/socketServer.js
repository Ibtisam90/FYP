const express=require("express");
const app=express();
const server= require("http").createServer(app);
const io=require("socket.io")(server);
const port=8080;
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const Memcached = require('memcached');
const cors = require('cors');

const corsOptions = {
  origin: '*',
};

app.use(cors(corsOptions));
// app.use(cors({ origin: 'http://localhost:19007' }));

// Connect to the Memcached server
const memcached = new Memcached('localhost:11211');



const onlineUsers = new Set();
const users = {};
const questions={};
const gameInProgess=[]

io.on("connection", socket=> {
  // console.log("A user connected.."); 
    // send the message to client
    console.log("New Connection..",socket.id);

  socket.on('login', userId => {
    
    onlineUsers.add(userId);
    users[userId] = socket.id;
    console.log("Online users list: ",onlineUsers);
    console.log("Socket ID's: ",users);

    // io.emit('userConnected', userId);
    io.emit('userConnected',JSON.stringify([...onlineUsers]));
  });

  socket.on('logout', userId => {
    onlineUsers.delete(userId);
    console.log(userId," left the game."," New Online users list: ",onlineUsers);
    // io.emit('userDisconnected', userId);
    io.emit('userDisconnected', JSON.stringify([...onlineUsers]));
  });

  socket.on('sendChallengeRequest', (data) => {

    // if(gameInProgess.indexOf(data.challengee) == -1){
    const challengeeSocketId = users[data.challengee];
    
    console.log(users);
    // console.log(socket.broadcast);

    socket.to(challengeeSocketId).emit('challengeRequest', {
      challenger: data.challenger,
      challengee: data.challengee,
    });
  // }
  // else{
  //   socket.emit('inProgress', {
  //     // gameFrom: data.gameFrom,
  //     gameWith: data.challengee,
  //   });
  // }
  });


  socket.on('acceptChallenge', (data) => {
    const gameWithSocketId = users[data.gameWith];
    const gameFromSocketId = users[data.gameFrom];
    // Generate a new UUID
    const gameSessionId = uuidv4();
    
    console.log("Challenge Accepted",users);
    
    const url = 'http://localhost:3000/api/questions';

    axios.get(url)
      .then(response => {
        questions[gameSessionId]=response.data

        // console.log(questions[gameSessionId]);

        const sessionId = gameSessionId;
        const sessionData = {
          // player1: { 
          //   id: data.gameWith, 
          //   totalScore: 0
          // }
          // ,
          // player2: { 
          //   id: data.gameFrom,
          //   totalScore: 0
          // },
          players:{},
          settings: {
            difficulty: 'easy',
            timeLimit: 60
          },
          questions: questions[gameSessionId],
          // progress: {},
          winner:"",
          currQues:0
        };
        sessionData.players[data.gameWith]={
          progress: {},
          Total_Score:0
        }
        sessionData.players[data.gameFrom]={
          progress: {},
          Total_Score:0
        }

        memcached.set(sessionId, sessionData, 360, (err) => {
          if (err) {
            console.error("Error in memcached:",err);
          } else {
            console.log('Game session data stored in Memcached');
            
            gameInProgess.push(data.gameFrom,  data.gameWith);

            socket.to(gameFromSocketId).emit('startGame', {
              gameFrom: data.gameFrom,
              // gameWith: data.gameWith,
              gameData: sessionData,
              sessionId:sessionId,
             
            });


            socket.emit('startGame', {
              // gameFrom: data.gameFrom,
              gameWith: data.gameWith,
              
              gameData: sessionData,
              sessionId:sessionId,
            });
          }
        });

      })
      .catch(error => {
        console.log("Error in fetching Questions",error);
        questions[gameSessionId]=-1
      });


  });


  socket.on('rejectChallenge', (data) => {
    const gameWithSocketId = users[data.gameWith];
    const gameFromSocketId = users[data.gameFrom];

    socket.to(gameFromSocketId).emit('challengeDenied', {
      // gameFrom: data.gameFrom,
      gameWith: data.gameWith,
      // gameData: sessionData,
     
    });

  });

  socket.on('answered', (data) => {
    const selectedOpt=data.res;
    const selectBy=data.currUserId;
    const sessionId=data.sessionId;

    

    memcached.get(sessionId, (err, sessionData) => {
      if (err) {
        console.error("Error in memcached:",err);
      } else if (!sessionData) {
        console.log("Session data not found in Memcached");
      } else {
        // console.log('Session data retrieved from Memcached');
        // update the session data object
        sessionData.currQues = sessionData.currQues+ 1;
       
        sessionData.players[selectBy].progress=selectedOpt;

        const twoUsers = Object.keys(sessionData.players);
       
        let otherUser=twoUsers[0];
        if(otherUser==selectBy){
          otherUser=twoUsers[1];
        }
        const otherSocketId = users[otherUser];

        console.log(sessionData.players);
    
        // store the updated session data object back in Memcached
        memcached.replace(sessionId, sessionData, 360, (err) => {
          if (err) {
            console.error("Error updating session data in Memcached:",err);
          } else {
            console.log('Session data updated in Memcached');

            socket.to(otherSocketId).emit('nextQues', {
             
              currQues:sessionData.currQues
             
            });


            socket.emit('nextQues', {
              currQues:sessionData.currQues
            });
          }
        });
      }
    });

  });


  socket.on('submit', (data) => {
    
    const selectBy=data.currUserId;
    const sessionId=data.sessionId;

    memcached.get(sessionId, (err, sessionData) => {
      if (err) {
        console.error("Error in memcached:",err);
      } else if (!sessionData) {
        console.log("Session data not found in Memcached");
      } else {
        console.log('Session data retrieved from Memcached');
       
        let totalScore=0;

        for (let p_id in sessionData.players){
          sessionData.players[p_id].Total_Score = sessionData.players[p_id].progress.reduce((acc, curr) => {
            if (curr.IsCorrect) {
              return acc + 1;
            } else {
              return acc;
            }
          }, 0);
        }
  
        // const p1_prog=sessionData.players.progress[sessionData.player1.id];
        // const p2_prog=sessionData.progress[sessionData.player2.id];
        let winner="";

        // const p1_Correct = p1_prog.reduce((acc, curr) => {
        //   if (curr.IsCorrect) {
        //     return acc + 1;
        //   } else {
        //     return acc;
        //   }
        // }, 0);

        // const p2_Correct = p2_prog.reduce((acc, curr) => {
        //   if (curr.IsCorrect) {
        //     return acc + 1;
        //   } else {
        //     return acc;
        //   }
        // }, 0);

        // if(p1_Correct>p2_Correct){
        //   winner=sessionData.player1.id;
        // }
        // else if(p1_Correct<p2_Correct){
        //   winner=sessionData.player2.id;
        // }
        // sessionData.player1.totalScore=p1_Correct;
        // sessionData.player2.totalScore=p2_Correct;
        // sessionData.winner=winner;

        // console.log("P1: ",p1_Correct)
        // console.log("P2: ",p2_Correct)
        // console.log("Winner: ",winner)

        console.log("Final Result:", sessionData);


        const twoUsers = Object.keys(sessionData.players);
       
        let otherUser=twoUsers[0];
        if(otherUser==selectBy){
          otherUser=twoUsers[1];
        }
        const otherSocketId = users[otherUser];

        // store the updated session data object back in Memcached
        memcached.replace(sessionId, sessionData, 360, (err) => {
          if (err) {
            console.error("Error updating session data in Memcached:",err);
          } else {
            console.log('Session data updated in Memcached');

            socket.to(otherSocketId).emit('FinalResult', {
             
              gameData: sessionData,
              sessionId:sessionId,
             
            });


            socket.emit('FinalResult', {
             
              gameData: sessionData,
              sessionId:sessionId,
            });
          }
        });
      }
    });

  });
});


server.listen(port,  ()=> console.log("server running on port "+ port));