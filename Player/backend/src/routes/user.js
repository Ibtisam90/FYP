const express = require("express");
const router = express.Router();
const User = require("../models/user");
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');

 // Store the selected Pictures in the 'public/uploads' directory
const Storage=multer.diskStorage({
  destination : './public/uploads/',
  filename: (req, file, cb)=>{
    // cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    let r = (Math.random() + 1).toString(36).substring(7);
    cb(null, file.originalname+'-' +r+ '-' + path.extname(file.originalname));
    // cb(null, file.originalname);
  }
});

const upload = multer({
  storage: Storage
});


//get Profile Picture
router.get('/Image/:id', async (req, res) => {

  let reqPath = path.join(__dirname, '../../');
  const filepath = `${reqPath}/public/uploads/${req.params.id}`;
  res.sendFile(filepath);
});

//Send request to a user

router.put("/:id/request", async (req, res) => {
  // req.body.userId --> ID of Current-User
  // req.params.id --> ID of Requested-User
  if (req.body.userId !== req.params.id) {
    try {
      const user = await User.findById(req.params.id);
      const currentUser = await User.findById(req.body.userId);
      if (!user.friendRequests.includes(req.body.userId)) {
        await user.updateOne({ $push: { friendRequests: currentUser._id } });
        await currentUser.updateOne({ $push: { sentRequests: user._id } });
        //   await currentUser.updateOne({ $push: { followings: req.params.id } });
        res.status(200).json("Friend Request has been sent");
      } else {
        res.status(403).json("You have already Requested this user");
      }
    } catch (err) {
      res.status(500).json(err);
    }
  } else {
    res.status(403).json("You cannot send request to yourself");
  }
});


//Remove user from the friend-list

router.put("/:id/unfriend", async (req, res) => {
  // req.body.userId --> ID of Current-User (In Body)
  // req.params.id --> ID of user to be removed (In URL)
  if (req.body.userId !== req.params.id) {
    try {
      const user = await User.findById(req.params.id);
      const currentUser = await User.findById(req.body.userId);
      if (user.friends.includes(req.body.userId)) {

        await currentUser.updateOne({ $pull: { friends: user._id } });

        await user.updateOne({ $pull: { friends: currentUser._id } });
        //   await currentUser.updateOne({ $push: { followings: req.params.id } });
        res.status(200).json("Friend has been removed from the friend-list");
      } else {
        res.status(403).json("The user is not in your friend list");
      }
    } catch (err) {
      res.status(500).json(err);
    }
  } else {
    res.status(403).json("You cannot send request to yourself");
  }
});

//Accept request of user

router.put("/:id/accept", async (req, res) => {
  // req.body.userId --> ID of Current-User
  // req.params.id --> ID of Requested-User
  if (req.body.userId !== req.params.id) {
    try {
      const user = await User.findById(req.params.id);
      const currentUser = await User.findById(req.body.userId);

      if (!currentUser.friends.includes(req.params.id)) {
        await currentUser.updateOne({ $pull: { friendRequests: user._id } });

        await currentUser.updateOne({ $push: { friends: user._id } });

        await user.updateOne({ $push: { friends: currentUser._id } });

        await user.updateOne({ $pull: { sentRequests: currentUser._id } });

        res.status(200).json("Friend Request has been accepted");
      } else {
        res.status(403).json("Request cannot be accepted");
      }
    } catch (err) {
      res.status(500).json(err);
    }
  } else {
    res.status(403).json("You cannot become friend of yourself");
  }
});

//Decline request of user

router.put("/:id/decline", async (req, res) => {
  // req.body.userId --> ID of Current-User
  // req.params.id --> ID of Requested-User
  if (req.body.userId !== req.params.id) {
    try {
      const user = await User.findById(req.params.id);
      const currentUser = await User.findById(req.body.userId);

      if (currentUser.friendRequests.includes(req.params.id)) {
        await currentUser.updateOne({ $pull: { friendRequests: user._id } });

        await user.updateOne({ $pull: { sentRequests: currentUser._id } });

        res.status(200).json("Friend Request has been declined");
      } else {
        res.status(403).json("Request cannot be declined");
      }
    } catch (err) {
      res.status(500).json(err);
    }
  } else {
    res.status(403).json("You cannot become friend of yourself");
  }
});


//get friends
router.get("/friends/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    const friends = await Promise.all(
      user.friends.map((friendId) => {
        return User.findById(friendId);
      })
    );
   
    let friendList = [];
   
    friends.map((friend) => {
      if(friend){
      const { _id, firstName, lastName, username, email, profilePicture } =  friend;
      friendList.push({
        _id,
        firstName,
        lastName,
        username,
        email,
        profilePicture,
      });
    }
    });
    
    res.status(200).json(friendList);
  } catch (err) {
    console.log("err to show friends");
    res.status(500).json(err);
  }
});



//get online friends
router.get("/onlineFriends/:userId/:onlineUser", async (req, res) => {

  // console.log("<------:Online FRIENDS API called:------> ")
  // console.log("Online Users: ", req.params.onlineUser)
  try {
    const user = await User.findById(req.params.userId);
    const friends = await Promise.all(
      user.friends.map((friendId) => {
        return User.findById(friendId);
      })
    );
    let onlineFriendList = [];
    friends.map((friend) => {
      if(friend){
      const { _id, firstName, lastName, username, email, profilePicture } =  friend;
        // console.log("Friends Id: ",_id, "--> ",req.params.onlineUser.includes(_id));
        if(req.params.onlineUser.includes(_id)){
          onlineFriendList.push({
        _id,
        firstName,
        lastName,
        username,
        email,
        profilePicture,
      });
    }}
    });
    res.status(200).json(onlineFriendList);
  } catch (err) {
    res.status(500).json(err);
  }
});



//get friend Requests
router.get("/friendRequests/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    const friends = await Promise.all(
      user.friendRequests.map((friendId) => {
        return User.findById(friendId);
      })
    );
    let friendList = [];
    friends.map((friend) => {
      if(friend){
      const { _id, firstName, lastName, username, email, profilePicture } =
        friend;
      friendList.push({
        _id,
        firstName,
        lastName,
        username,
        email,
        profilePicture,
      });
    }
    });
    res.status(200).json(friendList);
  } catch (err) {
    res.status(500).json(err);
  }
});

//get all users
router.get("/users", async (req, res) => {
  try {
    User.find().exec((error, user) => {
      if (error) {
        return res.status(400).json({
          message: "Error in Displaying Users",
          Err: error,
        });
      } else {
        return res.status(200).json(user);
      }
    });
  } catch (err) {
    res.status(500).json(err);
  }
});

//get all non-friend users
router.get("/nonFriends/:userId", async (req, res) => {
  try {
    // Current logged-in user
    const user = await User.findById(req.params.userId);

    User.find({
      $and: [
        { _id: { $nin: user.friendRequests } },
        { _id: { $nin: user.sentRequests } },
        { _id: { $nin: user.friends } },
        { _id: { $nin: user._id } },
      ],
    }).exec((error, user) => {
      if (error) {
        return res.status(400).json({
          message: "Error in Displaying Non-Friend Users",
          Err: error,
        });
      } else {
        return res.status(200).json(user);
      }
    });
  } catch (err) {
    res.status(500).json(err);
  }
});


router.get("/reqNum/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    const friendRequestCount = user.friendRequests.length;
    res.status(200).json({ friendRequestCount });
  } catch (err) {
    res.status(500).json(err);  
  }
});

// Edit the profile of user
// router.post("/:id/edit",upload.single('UserImage') ,async (req, res) => {
//   // router.post("/:id/edit" ,async (req, res) => {
  
//   // fs.readFile('./public/uploads/'+req.file.filename, (error, data) => {
//   //   if (error) throw error;
  
//   //   // Convert the data to a base64-encoded string
//   //   const encoded = Buffer.from(data).toString('base64');

//   let keepGoing=false;
  
//    User.findOne({_id: req.params.id})
//             .exec((error, user) => {
//               if(user.authenticate(req.body.OldPassword)){
//                 keepGoing=true

//                 User.findOneAndUpdate(
//                   { _id: req.params.id },
//                   {
//                     $set: {
//                        hash_password: bcrypt.hashSync(req.body.NewPassword, 10) ,
                        
//                       },
//                       $set: {
//                         profilePicture: req.file.filename,
//                       },
              
//                   },
//                   { new: true },
//                   (err, ans) => {
//                     if (err) {
//                       res.send(err);
//                     } else{
//                       console.log(ans);
//                       return res.status(200).json(ans);
//                     }
//                   }
//                 );

//               }
//               else{
//                 keepGoing=false;
//                 return res.status(400).json(
//                   "Incorrect Old Password"
//                 );
//               }

//             });
// });


// API to update user password
router.post("/:id/update-password", async (req, res) => {
  console.log("update password ")
  // Check if old password is correct
  const user = await User.findOne({_id: req.params.id});
  if (user.authenticate(req.body.OldPassword)) {
    // Update password
    const updatedUser = await User.findOneAndUpdate(
      {_id: req.params.id},
      { $set: { hash_password: bcrypt.hashSync(req.body.NewPassword, 10) } },
      { new: true }
    );
    return res.status(200).json(updatedUser);
  } else {
    return res.status(400).json({message:"Incorrect Old Password"})
  }
});

// API to update user profile picture
// API to update user profile picture
router.post("/:id/update-profile-picture", upload.single('UserImage'), async (req, res) => {
  const user = await User.findOne({_id: req.params.id});

  // Check if the request contains a file
  if (req.file) {
    // Update profile picture
    const updatedUser = await User.findOneAndUpdate(
      { _id: req.params.id },
      { $set: { profilePicture: req.file.filename } },
      { new: true }
    );
    return res.status(200).json(updatedUser);
  } else {
    // Keep previous profile picture if no new photo is uploaded
    const updatedUser = await User.findOneAndUpdate(
      { _id: req.params.id },
      { $set: { profilePicture: user.profilePicture } },
      { new: true }
    );
    return res.status(200).json(updatedUser);
  }
});

module.exports = router;
