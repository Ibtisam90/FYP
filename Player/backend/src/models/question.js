const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
    questionContent: {
        type: String,
        required:true,
    },
    noOfInputs: {
      type:Number,
      default:0,
    },
    inputVal: {
      type:String,
      default:"",
    },
    correctAnswer: {
        type: String,
        required:true,
    },
    options: [],
    topic: { 
      type: mongoose.Schema.Types.ObjectId, ref: 'Topic',
      required:true,
     },
    difficulty: { 
      type: mongoose.Schema.Types.ObjectId, ref: 'Difficulty',
      required:true,
     },
    category: { 
      type: mongoose.Schema.Types.ObjectId, ref: 'Category',
      required:true,
     },
}, {
  toJSON: {
    virtuals: true,
  },
});

module.exports = mongoose.model('Question', QuestionSchema);