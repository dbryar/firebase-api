import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import * as bodyParser from 'body-parser';
//import * as cors from 'cors';
import { Request, Response } from 'express';

admin.initializeApp(functions.config().firebase);

console.log('Ready for requests');

const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const typeDefs = gql`
  type Submission {
    submittedBy: String
    isComplete: Boolean
    modified: String
    formName: String
    formData: String
  }
  type Query {
    Submissions: [Submission]
  }
`;
const subData = admin
  .firestore()
  .collection('submissions');
const resolvers = {
  Query: {
    Submissions: () =>
      subData.get().then(function(snapshot) {
        const subArr:any = [];
        snapshot.forEach((doc) => {
          const sub = doc.data();
          sub.id = doc.id;
          subArr.push(sub);
        })
        return subArr;
      })
  }
};

// define Express.js as the main app
const app = express();
const api = express();
const main = express();

// define our API enpoint base, and set the parser for JSON
main.use('/api/v1', api);
main.use(bodyParser.json());
//main.use(cors({ origin:true }));

// define our Apollo GraphQL endpoint
const apollo = new ApolloServer({ typeDefs, resolvers, introspection: true, playground: true });
apollo.applyMiddleware({ app, path: "/", cors: true });
exports.graphql = functions.https.onRequest(app);

// define the app as a cloud funtion called webApi (referenced in firebase.json)
export const webApi = functions.https.onRequest(main);

// Automatically allow cross-origin requests
//app.use(cors({ origin: true }));

// test endpoint for confirming connectivity
api.get('/ready', (req:Request,res:Response) => {
    res.send(`API is active.`);
});

// authentication router
const postRouter = require('./post');
api.use('/post', postRouter);
