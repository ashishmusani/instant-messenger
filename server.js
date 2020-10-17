const express = require('express');
const mongoose = require('mongoose');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const cors = require('cors')
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

const dbConnectionUrl = `mongodb+srv://im_admin:HAkqPt8yOHjQn6GI@cluster0.dgglj.mongodb.net/instant_messenger?retryWrites=true&w=majority`
mongoose.connect(dbConnectionUrl, {'useNewUrlParser': true, useUnifiedTopology: true } );
const User = require('./models/userModel');

io.on('connect',socket=>{
  socket.on('login',(username, isMobileDevice)=>{
      socket.join('conference_room');
      socket.join('PM_'+username);

      User.updateOne({username}, {
        isOnline: true,
        lastSeen: null,
        isMobileDevice: isMobileDevice,
        currentSocketId: socket.id 
      }, (err, n)=>{
        if(!err){
          broadcastOnlineUsersList();
        }
      })
  })
  socket.on('broadcast-to-server',(envelope)=>{
      socket.to('conference_room').emit('broadcast-to-clients',envelope);
  })
  socket.on('personal_message',(envelope)=>{
    socket.to('PM_'+envelope.to).emit('personal_message',envelope);
  })
  socket.on('disconnect', ()=>{
    User.updateOne({currentSocketId: socket.id}, {
      isOnline: false,
      lastSeen: new Date(),
      isMobileDevice: null,
      currentSocketId: null  
    }, (err, n)=>{
      if(!err){
        broadcastOnlineUsersList();
      }
    })
  })
  socket.on('image',image => {
    socket.to('conference_room').emit('image_received',image);
  });

  socket.on('make_call_request', (from_peerId, to_user, from_user) => {
      console.log('Call request from '+ from_user + 'to ' + to_user);
      socket.to('PM_'+to_user).emit('incoming_call_request',from_peerId, from_user);
  });

  socket.on('end_ongoing_call', (with_user) => {
    socket.to('PM_'+with_user).emit('end_ongoing_call');
  });

})

const broadcastOnlineUsersList = () =>{
  User.find((err, users)=>{
    if(!err){
      io.emit('online-users-list', users)
    }
  })
}

server.listen(PORT, ()=>{
  console.log("Server listening on port " + PORT)
})

app.get('/', (req,res) => {
  res.send("Welcome");
})

app.post('/login', (req,res)=>{
  const username = req.body.username;
  const password = req.body.password;
  User.findOne({username}, (err, user)=>{
    if(err){
      //console.log(err);
      return res.send(err);
    } else {
      if(user.password === password){
        if(user.isOnline) {
          return res.status(403).send("User is already logged in")
        } else {
          return res.status(200).send("Success");
        }
      } else {
        return res.status(401).send("Incorrect Credentials");
      }
    }
  })
})

app.get('/users',(req,res)=>{
        User.find((err, users)=>{
          if(err){
            return res.send(err);
          }
          return res.json(users);
        })
      })
    .post('/users', (req,res)=>{
      const newUser = req.body;
      User.create(newUser, (err,data)=>{
        if(err){
          return res.status(500).send(err);
        } else {
          return res.status(200).send(data)
        }
      })
    })