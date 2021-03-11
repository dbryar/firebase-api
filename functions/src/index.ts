import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import * as bodyParser from 'body-parser';
//import * as cors from 'cors';
import * as express from 'express';
import { respond } from './func';
require('dotenv').config()

admin.initializeApp(functions.config().firebase);

console.log('API is ready for requests', process.env.FIREBASE_CONFIG, process.env.API_KEY);

// const { ApolloServer, gql } = require('apollo-server-express');
// const typeDefs = gql`
//   type Submission {
//     submittedBy: String
//     isComplete: Boolean
//     modified: String
//     formName: String
//     formData: String
//   }
//   type Query {
//     Submissions: [Submission]
//   }
// `;
// const subData = admin
//   .firestore()
//   .collection('submissions');
// const resolvers = {
//   Query: {
//     Submissions: () =>
//       subData.get().then(function(snapshot) {
//         const subArr:any = [];
//         snapshot.forEach((doc) => {
//           const sub = doc.data();
//           sub.id = doc.id;
//           subArr.push(sub);
//         })
//         return subArr;
//       })
//   }
// };

// define Express.js as the main app
// const app = express();
const api = require('express')()
const main = require('express')()
const cors = require('cors')

// Allow cross-origin requests from authorised domains
const allowlist = [
  'http://localhost:8080',
  'https://innovate-noosa.firebaseapp.com/',
  'https://innovatenoosa.com.au',
  'https://develop.innovatenoosa.com.au',
  'https://staging.innovatenoosa.com.au',
]
// console.log('Allowed CORS Domains', allowlist)
const corsOptions = {
  origin: function (origin: any, callback: any) {
    if (allowlist.indexOf(origin) !== -1 || !origin) {
      console.log((!origin)?'CORS direct hit':'CORS hit')
      callback(null, true)
    } else {
      console.log('CORS miss')
      callback(new Error('Invalid CORS domain'), false)
    }
  },
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-correlation-id',
    'x-request-id',
    'x-source-id',
  ],
  methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
}

// define our API enpoint base, and set the parser for JSON
main.use('/api/v1', api);
api.options('*', cors(corsOptions)) // handle any pre-flight CORS checks
api.use(cors(corsOptions))
api.use(bodyParser.json());

// // define our Apollo GraphQL endpoint
// const apollo = new ApolloServer({ typeDefs, resolvers, introspection: true, playground: true });
// apollo.applyMiddleware({ app, path: "/", cors: true });
// exports.graphql = functions.https.onRequest(app);

// define the app as a cloud funtion called webApi (referenced in firebase.json)
export const webApi = functions.https.onRequest(main);

// Automatically allow cross-origin requests
//app.use(cors({ origin: true }));

// test endpoint for confirming connectivity
api.get('/ready', (req:express.Request, res:express.Response) => {
    res.send(`API is active on ${req.path}`);
});

api.post('/auth', (req:express.Request, res:express.Response) => {
  // ** TO DO ** set API Key as an environment variable
  const apiKey = process.env.API_KEY
  const user = req.body.email
  const pass = req.body.password
  const rst = req.body.returnSecureToken
  if (!user || !pass || !rst) {
    return respond(res, {
      code: 401,
      message:`Request requires valid 'email' and 'password' values.`,
      trace:'GL.001'
    })
  } else {
    res.redirect(
      307,
      `https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyPassword?key=${apiKey}`
    )
    return
  }
});

// authentication router
const postRouter = require('./post');
api.use('/post', postRouter);
