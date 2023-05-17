const express = require("express");
const mongoose = require('mongoose');
const querystring = require('querystring');
const axios = require('axios');
const router = express.Router();
const User=require("../models/user");
const Question = require("../models/question");
const Topic = require("../models/topic");
const Difficulty = require("../models/difficulty");
const Category = require("../models/category");
const Stage = require('../models/stage');
const path = require("path");
const question = require("../models/question");
const e = require("express");
const { request } = require("http");

// router.get('/questions',(req, res)=>{

//     Question.aggregate(
//         [
//             {
//                 $unwind: {
//                   path: "$options"
//                 }
//               },
//               {
//                 $sample: {
//                   size: 10 //to shuffle values upto particular index
//                 }
//               },
//               {
//                 $group: {
//                   _id: "$_id",
//                   questionContent: {
//                     "$first": "$questionContent"
//                   },
//                   correctAnswer: {
//                     "$first": "$correctAnswer"
//                   },
//                   options: {
//                     $push: "$options"
//                   },
//                   topic: {
//                     "$first": "$topic"
//                   },
//                   difficulty: {
//                     "$first": "$difficulty"
//                   },
//                   category: {
//                     "$first": "$category"
//                   }
//                 }
//               }
//         ]
//      ).exec((error, question)=> {
//         if(error){
//             return res.status(400).json({
//                 message: "Error in Displaying Questions",
//                 Err: error
//             });
//         }
//         else{
//             return res.status(200).json(question)
//         }
//     })
// });


// Define the generateOptions function
function generateOptions(correctOption) {
  const options = [];
  const variance = 20; // adjust this to change how close the options are to the correct answer
  const min = Math.max(0, correctOption - variance);
  const max = Math.min(100, correctOption + variance);
  options.push(correctOption.toString()); // Convert the correct option to a string
  while (options.length < 4) {
    const randomOption = Math.floor(Math.random() * (max - min + 1) + min);
    const randomOptionString = randomOption.toString(); // Convert the random option to a string
    if (!options.includes(randomOptionString)) {
      options.push(randomOptionString);
    }
  }
  // shuffle the options using the Fisher-Yates algorithm
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return options;
}

router.get("/Druns", async(req, res) => {
  const category = await Category.findOne({ cName: "dry run's" });
  const categoryId = category._id;
  const min = 2;
  const max = 16;

  Question.aggregate([
    {
      $match: {
        category: categoryId,
      },
    },
    {
      $sample: {
        size: 3,
      },
    },
    {
      $unwind: {
        path: "$options",
      },
    },
    {
      $group: {
        _id: "$_id",
        questionContent: {
          $first: "$questionContent",
        },
        noOfInputs: {
          $first: "$noOfInputs",
        },
        inputVal: {
          $first: "$inputVal",
        },
        correctAnswer: {
          $first: "$correctAnswer",
        },
        options: {
          $push: "$options",
        },
        topic: {
          $first: "$topic",
        },
        difficulty: {
          $first: "$difficulty",
        },
        category: {
          $first: "$category",
        },
      },
    },
    {
      $project: {
        options: 1,
        questionContent: 1,
        correctAnswer: 1,
        topic: 1,
        difficulty: 1,
        category: 1,
        noOfInputs: 1,
        inputVal: 1,
      },
    },
  ])
    .exec()
    .then((questions) => {
      let dryRuns = [];

      const promises = questions.map((question) => {
        return new Promise((resolve, reject) => {
          let inputVal = "";
          for (let i = 0; i < question.noOfInputs; i++) {
            const randomInput = Math.floor(Math.random() * (max - min + 1)) + min;
            inputVal += randomInput.toString() + " ";
          }

          axios
            .post("https://api.codex.jaagrav.in", {
              code: question.questionContent,
              language: "cpp",
              input: inputVal,
            })
            .then((response) => {
              const correctOption = parseInt(response.data.output);
              const options = generateOptions(correctOption);
              question.inputVal = inputVal;
              question.correctAnswer = correctOption.toString();
              question.options = options;
              dryRuns.push(question);
              resolve();
            })
            .catch((error) => {
              console.log("Error:", error.message);
              reject(error);
            });
        });
      });
      
      Promise.all(promises)
        .then(() => {
          return res.status(200).json(dryRuns);
        })
        .catch((error) => {
          return res.status(400).json({ error });
        });
    })
    .catch((error) => {
      return res.status(400).json({
        message: "Error in Displaying Questions",
        Err: error,
      });
    });
});




router.get("/questions", (req, res) => {
  Question.aggregate([
    {
      $sample: {
        size: 7, //to shuffle values upto particular index
      },
    },
    {
      $unwind: {
        path: "$options",
      },
    },
    {
      $group: {
        _id: "$_id",
        questionContent: {
          $first: "$questionContent",
        },
        correctAnswer: {
          $first: "$correctAnswer",
        },
        options: {
          $push: "$options",
        },
        topic: {
          $first: "$topic",
        },
        difficulty: {
          $first: "$difficulty",
        },
        category: {
          $first: "$category",
        },
      },
    },
    {
      $project: {
        options: 1,
        questionContent: 1,
        correctAnswer: 1,
        topic: 1,
        difficulty: 1,
        category: 1,
      },
    },
  ]).exec((error, question) => {
    if (error) {
      return res.status(400).json({
        message: "Error in Displaying Questions",
        Err: error,
      });
    } else {
       axios
        .get("http://localhost:3000/api//Druns")
        .then((response) => {
          const dryRuns = response.data;
          dryRuns.forEach((dryRun, index) => {
            question.push(dryRun);
          });
          return res.status(200).json(question);
        })
        .catch((error) => {
          console.log("Error:", error.message);
          return res.status(400).json({ error });
        });
    }
  });
});

router.get("/questions/:topic", (req, res) => {
  const topic = mongoose.Types.ObjectId(req.params.topic);

  Question.aggregate([
    {
      $match: { topic },
    },
    {
      $group: {
        _id: "$difficulty",
        questions: { $push: "$$ROOT" },
      },
    },
    {
      $project: {
        easy: {
          // $slice: ["$questions", 4] // you can change this to your preferred number of questions
          $slice: [{ $slice: ["$questions", 2, { $size: "$questions" }] }, 2], // you can change this to your preferred number of questions
        },
        medium: {
          $slice: [{ $slice: ["$questions", 0, { $size: "$questions" }] }, 0], // you can change this to your preferred number of questions
        },
        hard: {
          $slice: [{ $slice: ["$questions", 1, { $size: "$questions" }] }, 1], // you can change this to your preferred number of questions
        },
      },
    },
    {
      $project: {
        questions: {
          $concatArrays: ["$easy", "$medium", "$hard"],
        },
      },
    },
    {
      $unwind: "$questions",
    },
    {
      $sample: { size: 3 }, // you can change this to your preferred number of questions
    },
    {
      $replaceRoot: { newRoot: "$questions" },
    },
    {
      $project: {
        options: 1,
        questionContent: 1,
        correctAnswer: 1,
        topic: 1,
        difficulty: 1,
        category: 1,
      },
    },
  ]).exec((error, question) => {
    if (error) {
      return res.status(400).json({
        message: "Error in Displaying Questions",
        Err: error,
      });
    } else {
      return res.status(200).json(question);
    }
  });
});


router.get("/questions_CMode/:easyno/:mediumno/:hardno", (req, res) => {
  const easyno = parseInt(req.params.easyno);
  const mediumno = parseInt(req.params.mediumno);
  const hardno = parseInt(req.params.hardno);

  const easy = mongoose.Types.ObjectId("637da44e532f263d8e18b707");
  const medium = mongoose.Types.ObjectId("637da440532f263d8e18b704");
  const hard = mongoose.Types.ObjectId("637da455532f263d8e18b70a");
  Question.aggregate([
    {
      $group: {
        _id: "$difficulty",
        questions: {
          $push: "$$ROOT",
        },
      },
    },

    {
      $facet: {
        easy: [
          { $match: { _id: easy } },
          {
            $project: {
              questions: {
                $map: {
                  input: "$questions",
                  as: "q",
                  in: { $mergeObjects: ["$$q", { random: { $rand: {} } }] },
                },
              },
            },
          },
          { $unwind: "$questions" },
          { $sort: { "questions.random": 1 } },
          { $limit: easyno },
          { $group: { _id: "$_id", questions: { $push: "$questions" } } },
        ],

        medium: [
          { $match: { _id: medium } },
          {
            $project: {
              questions: {
                $map: {
                  input: "$questions",
                  as: "q",
                  in: { $mergeObjects: ["$$q", { random: { $rand: {} } }] },
                },
              },
            },
          },
          { $unwind: "$questions" },
          { $sort: { "questions.random": 1 } },
          { $limit: mediumno },
          { $group: { _id: "$_id", questions: { $push: "$questions" } } },
        ],
        hard: [
          { $match: { _id: hard } },
          {
            $project: {
              questions: {
                $map: {
                  input: "$questions",
                  as: "q",
                  in: { $mergeObjects: ["$$q", { random: { $rand: {} } }] },
                },
              },
            },
          },
          { $unwind: "$questions" },
          { $sort: { "questions.random": 1 } },
          { $limit: hardno },
          { $group: { _id: "$_id", questions: { $push: "$questions" } } },
        ],
      },
    },

    {
      $project: {
        questions: {
          $concatArrays: [
            "$easy.questions",
            "$medium.questions",
            "$hard.questions",
          ],
        },
      },
    },

    {
      $unwind: "$questions",
    },

    {
      $unwind: "$questions",
    },

    {
      $group: {
        _id: "$questions._id",
        questionContent: {
          $first: "$questions.questionContent",
        },
        options: {
          $addToSet: "$questions.options",
          // $push: {
          //   $shuffle: "$questions.options"
          // }
          // $push: "$questions.options"
        },
        correctAnswer: {
          $first: "$questions.correctAnswer",
        },
        difficulty: {
          $first: "$questions.difficulty",
        },

        topic: {
          $first: "$questions.topic",
        },
        category: {
          $first: "$questions.category",
        },
      },
    },

    {
      $sample: {
        size: 6,
      },
    },
  ]).exec((err, questions) => {
    if (err) {
      console.log(err);
      return res.status(500).json({
        message: "Error getting questions",
      });
    } else {
      console.log(questions);
      return res.status(200).json(questions);
    }
  });
});



router.get('/questions/:topic/:easyno/:mediumno/:hardno', (req, res) => {
  
  const easyno=parseInt(req.params.easyno)
  const mediumno=parseInt(req.params.mediumno)
  const hardno=parseInt(req.params.hardno)
  const topic = mongoose.Types.ObjectId(req.params.topic);
  const easy= mongoose.Types.ObjectId("637da44e532f263d8e18b707")
  const medium= mongoose.Types.ObjectId("637da440532f263d8e18b704")
  const hard= mongoose.Types.ObjectId("637da455532f263d8e18b70a")
  Question.aggregate([
    {
      $match: {
        topic: topic
      }
      
    },
    
    {
      $group: {
        _id: "$difficulty",
        questions: {
          $push: "$$ROOT"
        }
      }
    },
    
    {
      $facet: {
        easy: [
          { $match: { _id: easy } },
          { $project: { questions: { $map: { input: "$questions", as: "q", in: { $mergeObjects: [ "$$q", { random: { $rand: {} } } ] } } } } },
          { $unwind: "$questions" },
          { $sort: { "questions.random": 1 } },
          { $limit: easyno },
          { $group: { _id: "$_id", questions: { $push: "$questions" } } }
        ],
       
    
        medium: [
          { $match: { _id: medium } },
          { $project: { questions: { $map: { input: "$questions", as: "q", in: { $mergeObjects: [ "$$q", { random: { $rand: {} } } ] } } } } },
          { $unwind: "$questions" },
          { $sort: { "questions.random": 1 } },
          { $limit: mediumno },
          { $group: { _id: "$_id", questions: { $push: "$questions" } } }
        ],
        hard: [
          { $match: { _id: hard} },
          { $project: { questions: { $map: { input: "$questions", as: "q", in: { $mergeObjects: [ "$$q", { random: { $rand: {} } } ] } } } } },
          { $unwind: "$questions" },
          { $sort: { "questions.random": 1 } },
          { $limit: hardno },
          { $group: { _id: "$_id", questions: { $push: "$questions" } } }
        ]
      }
    },
    
    {
      $project: {
        questions: {
          $concatArrays: [ "$easy.questions", "$medium.questions", "$hard.questions" ]
        }
      }
    },
    

    {
      $unwind: "$questions"
    },
    
    {
      $unwind: "$questions"
    },
    
    {
            $group: {
              _id: "$questions._id",
              questionContent: {
                $first: "$questions.questionContent"
              },
              options: {
                $addToSet: "$questions.options"
                // $push: {
                //   $shuffle: "$questions.options"
                // }
                // $push: "$questions.options"
              },
              correctAnswer: {
                $first: "$questions.correctAnswer"
              },
              difficulty: {
                $first: "$questions.difficulty"
              },
              topic: {
                $first: "$questions.topic"
              },
              category: {
                $first: "$questions.category"
              }
            }
          
    },
    
    {
            $sample: {
              size: 6
            }
   }
    ]).exec((err, questions) => {
      if (err) {
        console.log(err);
        return res.status(500).json({
          message: "Error getting questions"
        });
      } else {
        console.log(questions);
        return res.status(200).json(questions);
      }
    });
  });


  // router.post('/stages', async (req, res) => {
  //   try {
  //     const { weightage, numberOfQuestions,stageName, skillType } = req.body;
  //     const total = weightage.reduce((acc, curr, i) => acc + (curr * numberOfQuestions[i]), 0);
  
  //     const stage = new Stage({
  //       weightage,
  //       numberOfQuestions,
  //       stageName,
  //       skillType,
  //       total
  //     });
  
  //     const savedStage = await stage.save(); // save the document to the database
  
  //     res.status(201).json(savedStage); // return the saved document as a JSON response
  //   } catch (error) {
  //     console.error(error);
  //     res.status(500).json({ message: 'Error creating stage' });
  //   }
  // });

  router.post('/calculateResult', async (req, res) => {
    let totalScore=0
    let count=0;
    const stage = req.body.stage;
    const optionsRes = req.body.optionsRes;
    
    
    const difficulty = await Difficulty.find()
    let difficulties={
      easy:"",
      medium:"",
      hard:"",
    }
    difficulty.map(item=>{
      if(item.dName=="easy"){
        difficulties.easy=item._id;
      }
      else if(item.dName=="medium"){
        difficulties.medium=item._id;
      }
      else if(item.dName=="hard"){
        difficulties.hard=item._id;
      }
    })
    console.log(difficulties)
    
    try {
      
      const stagefound = await Stage.findOne({ stageName: stage });
  
      if (!stagefound) {
        return res.status(404).json({ message: 'Stage not found' });
      }
      const { weightage, total } = stagefound;
      
      const values = weightage.join(',');
      const array = values.split(',');
      
      optionsRes.map(item => {
        console.log(item)
        if(item.difficulty===difficulties.easy.toString()){
        
          if(item.IsCorrect){
            totalScore=totalScore+parseInt(array[0])
            count++;
          }
      
        }
        else if(item.difficulty===difficulties.medium.toString())
        {
          if(item.IsCorrect){
            totalScore=totalScore+parseInt(array[1])
            count++;
          }

        }
        else if(item.difficulty===difficulties.hard.toString()){
          if(item.IsCorrect){
            totalScore=totalScore+parseInt(array[2])
            count++;
          }
        }
        
      })

      
      
      // const additionalInfo = response.data;

      // const { weightage, numberOfQuestions } = stage;

      // const result = weightage.map((w, i) => ({
      //   weightage: w,
      //   numberOfQuestions: numberOfQuestions[i]
      // }));
      console.log(totalScore)

      
     
     
      let percentageScore=(totalScore/total)*100

      const data = { totalScore, percentageScore, total,count};
      res.json(data)
     

      // res.json({totalScore});
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  router.post('/updateSkill', async (req, res) => {
    const player = req.body.player;
    const nextStage = req.body.nextStage;
    const topicid = mongoose.Types.ObjectId(req.body.topicid);
    const score = req.body.score
    try {
      // Find the player by ID
      const foundPlayer = await User.findById(player);
      // Find the topic in the personalTopics array
      const topicIndex = foundPlayer.personalTopics.findIndex(topic => topic._id.toString() === topicid.toString());
      console.log(topicIndex)
      if (topicIndex === -1) {
        // The topic was not found in the personalTopics array
        return res.status(404).json({ message: 'Topic not found for this player' });
      } else {
        // Update the skill level for the topic
        if(score>10){
          foundPlayer.personalTopics[topicIndex].assessmentCompleted=true

          if(topicIndex+1!=foundPlayer.personalTopics.length){
            foundPlayer.personalTopics[topicIndex+1].locked=false
          }
        }
        foundPlayer.personalTopics[topicIndex].stage = nextStage;
        if(foundPlayer.personalTopics[topicIndex].stage === "S1" || foundPlayer.personalTopics[topicIndex].stage === "S2" || foundPlayer.personalTopics[topicIndex].stage === "S3" || foundPlayer.personalTopics[topicIndex].stage==="S4"){
          foundPlayer.personalTopics[topicIndex].skillLevel = 1;
         
        }
        else if(foundPlayer.personalTopics[topicIndex].stage === "S5" || foundPlayer.personalTopics[topicIndex].stage === "S6" || foundPlayer.personalTopics[topicIndex].stage === "S7" || foundPlayer.personalTopics[topicIndex].stage==="S8"  || foundPlayer.personalTopics[topicIndex].stage === "S9" || foundPlayer.personalTopics[topicIndex].stage === "S10" || foundPlayer.personalTopics[topicIndex].stage==="S11"){
          foundPlayer.personalTopics[topicIndex].skillLevel = 2;
        }
        else if(foundPlayer.personalTopics[topicIndex].stage === "S12"){
          foundPlayer.personalTopics[topicIndex].skillLevel = 3;
        }
        
         // Update the player document in the database
        await User.updateOne({ _id: player }, { $set: { personalTopics: foundPlayer.personalTopics } });

        // Find the updated player document
        const updatedPlayer = await User.findById(player);
        
        // Return the updated player document
        return res.status(200).json(updatedPlayer);
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  router.get('/stages/:topic/:name', async (req, res) => {
    try {
      const stage = await Stage.findOne({ stageName: req.params.name });
  
      if (!stage) {
        return res.status(404).json({ message: 'Stage not found' });
      }
      const { numberOfQuestions } = stage;
      const values = numberOfQuestions.join(',');
      const array = values.split(',');
      
      const response = await axios.get(`http://localhost:3000/api/questions/${req.params.topic}/${array[0]}/${array[1]}/${array[2]}`);
      // const additionalInfo = response.data;

      // const { weightage, numberOfQuestions } = stage;

      // const result = weightage.map((w, i) => ({
      //   weightage: w,
      //   numberOfQuestions: numberOfQuestions[i]
      // }));
      res.send(response.data)
      // res.json(response);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });


module.exports = router;
