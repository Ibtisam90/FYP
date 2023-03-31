const User = require('../../models/user');
const Topic = require('../../models/topic');
const jwt = require('jsonwebtoken');
const { validate } = require('deep-email-validator');
var nodemailer = require('nodemailer');

const myEmail = 'victoni216@gmail.com';
const myPassword = 'oszycgnmvkfstbeu';
var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: myEmail,
      pass: myPassword
    }
  });

  function generatePassword() {
    var length = 8,
        charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
        retVal = "";
    for (var i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
  }

  function generateUserNum() {
    var length = 3,
        charset = "0123456789",
        retVal = "";
    for (var i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
  }

exports.signup= async(req, res ) =>
{
    const personal_topics = await Topic.find();
    personal_topics[0].locked=false;

    const emailValid = await validate(req.body.email);
    if(emailValid.valid){
        

    User.findOne({ email: req.body.email})
    .exec((error,user) => {
        if(user) return res.status(400).json({
        message: 'Player already registered'
     });

    const randomPassword = generatePassword();
    console.log("Generated Password is: ", randomPassword);
         var mailOptions = {
        from: myEmail,
        to: req.body.email,
        subject: 'Email Authentication',
        text: 'Your Password is: '+randomPassword
      };
      
      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log("Error in Sending the Mail: ",error);
          return res.status(400).json({
            message: 'Email could not be sent'
        });
        } else {
          console.log('Email sent: ' + info.response);
        }
      });

     const {
        firstName,
        lastName,
        email,
   
     } = req.body;
     const password=randomPassword;
     const userName= firstName+ generateUserNum();
     const _user = new User({
        firstName ,
        lastName , 
        email, 
        password,
        personalTopics:personal_topics,
        username: userName,
        role:'user'
    });
    _user.save((error , data)=>{
        if(error){
            return res.status(400).json({
                message: 'User could not be registered...Something went wrong', 
                error: error
            });
        }
        if(data)
        {
            return res.status(200).json({
                message:'Player created Successfully',
                savedUser_Detail: data
            })
        }
      });
    });
}
else{
    return res.status(400).json({
        message: 'Given Email does not Exist'
    });
}
}
exports.signin =async (req , res ) => {

    console.log("here login..");
    const emailValid = await validate(req.body.email)
    // if(emailValid.valid){

            User.findOne({email: req.body.email})
            .exec((error, user) => {
                if (error) return res.status(400).json({
                    message: 'Login Failed'
                });
                if(user){
                if(user.authenticate(req.body.password) && user.role === 'user'){
                    const token = jwt.sign({id:user._id}, process.env.JWT_SECRET,{expiresIn:'1h'}); 
                    const {_id ,firstName,lastName,email,role,fullName, profilePicture, personalTopics,friendRequests} = user;
                    res.status(200).json({
                        token,
                        user: {
                            _id, firstName,lastName,email,role,fullName,profilePicture,personalTopics,friendRequests
                        }
                    });
                }else{
                    console.log('Invalid Password');
                    return res.status(400).json({
                    message: 'Invalid Password'
                    })
                }
                }else{
                    console.log('Something went wrong');
                    return res.status(400).json({message:'Email is invalid'})
                }
            });
    }
    // else{
    //     return res.status(400).json({
    //         message: 'Given Email does not Exist'
    //     });
    // }
// }
exports.requireSignin = (req , res , next) =>
{
    const token = req.headers.authorization.split("")[1];

   // console.log(token);
    // const  jwt.decode(token,process.JWT_SECRET);
    const user = jwt.verify(token, process.JWT_SECRET);
    req.user= user;
    next();
    //jwt.decode()
}