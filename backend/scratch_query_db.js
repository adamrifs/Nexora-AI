const dotenv = require('dotenv');
dotenv.config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB!");
  
  const users = await User.find({});
  console.log("Registered Users in DB:");
  console.log(JSON.stringify(users, null, 2));
  
  await mongoose.connection.close();
}

test().catch(console.error);
