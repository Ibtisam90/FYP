const express = require('express');
const env = require ('dotenv');
const app = express();
const bodyParse = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');

app.use(cors());
// app.use(cors({ origin: 'http://localhost:19007' }));

// const io = require("socket.io")(4000,{
//   cors:{
//       origin:"http://192.168.42.232:19000",
//   },
// });

// io.on("connection", (socket)=>{
//   console.log("A user connected");
// })


//routes
const authRoutes= require('./routes/auth');
const playerRoutes= require('./routes/player/auth');
const QuesRoutes= require('./routes/question');
const topicRoutes= require('./routes/topic');
const difficultyRoutes= require('./routes/difficulty');
const categoryRoutes= require('./routes/category');
const userRoutes= require('./routes/user');
const resultRoute=  require('./routes/result');
const userAnaRoute=  require('./routes/userAnalytics');
const socketRoute= require('./socketServer');
//environment variable
env.config();
//mongo connection
mongoose.connect(
    //mongodb+srv://root:<password>@cluster0.sf0pb7x.mongodb.net/?retryWrites=true&w=majority
    `mongodb+srv://${process.env.MONGO_DB_USER}:${process.env.MONGO_DB_PASSWORD}@cluster0.07v8s.mongodb.net/${process.env.MONGO_DB_DATABASE}?retryWrites=true&w=majority`,
    {
        useNewUrlParser: true,
        useUnifiedTopology: true
        //useCreateIndex: true
    }).then(() => {
      console.log('Database connected');
});

app.use(bodyParse.urlencoded({
    extended: true
  }));
app.use(bodyParse.json());

app.use('/api', authRoutes);
app.use('/api', playerRoutes);
app.use('/api', QuesRoutes);
app.use('/api', topicRoutes);
app.use('/api', difficultyRoutes);
app.use('/api', categoryRoutes);
app.use('/api', userRoutes);
app.use('/api', resultRoute);
app.use('/api', userAnaRoute);


app.listen(process.env.PORT, () => {
    
    console.log(`Server is running on port ${process.env.PORT}`);
});
