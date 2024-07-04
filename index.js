const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
// const { OAuth2Client } = require('google-auth-library'); //google
const multer = require('multer');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const saltRounds = 10;
// const googleClientId = 'your-google-client-id'; // google

// const oauth2Client = new OAuth2Client(googleClientId); // google

// Connection URL
//  'mongodb://127.0.0.1:27017/'; 
 // "mongodb+srv://parth02122004:wJdtB8Aj6VD3tFq@cllgweb.rorgtpx.mongodb.net/?retryWrites=true&w=majority&appName=CllgWeb"; // mongodb+srv://parth02122004:wJdtB8Aj6VD3t
const url = 'mongodb+srv://parth02122004:mhRKjrkcFJ1IexXJ@manav-rachna.z1x7dka.mongodb.net/'
const client = new MongoClient(url);
// Database Name
const dbName = 'mriirs';

// app.use(bodyParser.urlencoded({ extended: true }));

// app.get('/', function (req, res) {
//   res.sendFile('/');
// });
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/');
  },
  filename: function (req, file, cb) {
    const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniquePrefix + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

console.log("hello");

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

app.use(cookieParser());

// Secret key for JWT
const secretKey = 'your_secret_key';

// Authentication middleware
const authenticateJWT = (req, res, next) => {
  const token = req.cookies.token;

  if (token) {
    jwt.verify(token, secretKey, (err, user) => {
      if (err) {
        return res.sendStatus(403);
      }
      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

app.get('/', function (req, res) {
  app.use(express.static(__dirname))

  res.sendFile(__dirname + '/index.html');
});

// async function verifyGoogleEmail(email) {
//   const ticket = await oauth2Client.verifyIdToken({
//       idToken: email,
//       audience: googleClientId,                          // google
//   });
//   const payload = ticket.getPayload();
//   return payload && payload.email_verified;
// }

app.post('/sign', async function (req, res) {
  let p = req.body['user'];
  let q = req.body['Password'];
  
  if (!p || !q) {
    return res.status(400).send('Username and Password are required');
  }

  // const isGoogleEmail = await verifyGoogleEmail(p);
  //   if (!isGoogleEmail) {                                 // google
  //       return res.status(400).send('Invalid Google email address');
  //   }       
 

  try {
    await client.connect();
    console.log('Connected successfully to server');
    const db = client.db(dbName);
    const collection = db.collection('users');

    const existingUser = await collection.findOne({ username: p });
    if (existingUser) {
        return res.status(400).send('Email already exists');
    }
    const hashedPassword = await bcrypt.hash(q, saltRounds);
    await collection.insertOne({ username: p, password: hashedPassword });


    

    // await collection.updateOne({ username: user }, { $set: { lastLogin: new Date() } });

    // const a = document.getElementById('username');
    // if(a === client){
    //   alert("you already have an account");
    // }else{
      console.log('User inserted');
      res.redirect('/login'); // Redirect to login page after signup
    // }
    
  } catch (e) {
    console.error(e);
    res.status(500).send('Error while signing up');
  } finally {
    await client.close();
  }
});

app.get('/login', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

app.post('/login', async function (req, res) {
  // const { user, password } = req.body;

  const{user} = req.body;
  const{password} = req.body;

  if (!user || !password) {
    return res.status(400).send('Username and Password are required');
}

  try {
    await client.connect();
    console.log('Connected successfully to server');
    const db = client.db(dbName);
    const collection = db.collection('users');
    
    // await collection.insertOne({ username: user, password: password });

    const userRecord = await collection.findOne({ username: user });
    if (!userRecord) {
      return res.status(401).send('Invalid username or password');
    }
    // else{
      //   window.location.assign("index.html")
      // }
      
      const match = await bcrypt.compare(password, userRecord.password);
      if (!match) {
        return res.status(401).send('Invalid username or password');
      }
      // else{
        //   window.location.assign("index.html")
        // }

        // Get the current date and time in IST
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000; // IST offset in milliseconds
        const istTime = new Date(now.getTime() + istOffset);
        const loginTime = istTime.toISOString().replace('T', ' ').substr(0, 19);

        // Update the user's last login time in the database
        await collection.updateOne({ username: user }, { $set: { lastLogin: loginTime } });
        
        const token = jwt.sign({ username: user }, secretKey, { expiresIn: '1h' });
        res.cookie('token', token, { httpOnly: true });
        app.use(express.static(__dirname))
    // res.redirect('/index'); // Redirect to login page after signup
        res.sendFile(__dirname + '/main.html');
      } catch (e) {
        console.error(e);
        res.status(500).send('Error while logging in');
      } finally {
    await client.close();
  }
});

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/main.html');
});



app.post('/home', authenticateJWT, upload.single('uploaded_file'),async function (req, res)  {   
  const{} = req.body
  let a = req.body['user_email'];
  let b = req.body['user_name'];
  let c = req.body['user_location'];
  let d = req.body['user_message'];
  let e = req.file?.path || null;
  console.log(a, b, c, d);

  try {
    await client.connect();
    console.log('Connected successfully to server');
    const db = client.db(dbName);
    const collection = db.collection('complaint');
    await collection.insertOne({ email: a, name: b, location: c, message: d, img_path: e });
    console.log('Complaint inserted');
    // alert("Your Information Submitted Successfully")
    // app.post('/logout', function (req, res) {
    //   res.clearCookie('token');
    //   res.send('Logged out successfully');
    // });
    res.sendFile(__dirname + '/contact.html'); // Send home.html directly after complaint submission
  } catch (e) {
    console.error(e);
    res.status(500).send('Error while submitting complaint');
  } finally {
    await client.close();
  }
});


app.listen(3200, () => {
  console.log('Server is running on port 3200');
});
