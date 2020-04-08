import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import * as bodyParser from 'body-parser';
import { Response } from 'express';

admin.initializeApp(functions.config().firebase);

console.log('Ready for requests');

const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const typeDefs = gql`
  type FormData {
    submittedBy: String
    isComplete: Boolean
    modified: String
    formName: String
    formData: String
  }
  type Query {
    submission: [FormData]
  }
`;
const resolvers = {
  Query: {
    submission: () =>
      admin
        .database()
        .ref("submission")
        .once("value")
        .then(snap => snap.val())
        .then(val => Object.keys(val).map(key => val[key]))
  }
};

// define Express.js as the main app
const app = express();
const main = express();

// define our enpoint base, and set the parser for JSON
main.use('/api/v1', app);
main.use(bodyParser.json());

// define our Apollo GraphQL endpoint
const apollo = new ApolloServer({ typeDefs, resolvers, introspection: true, playground: true });
apollo.applyMiddleware({ app, path: "/graphql", cors: true });
exports.graphql = functions.https.onRequest(app);

// define the app as a cloud funtion called webApi (referenced in firebase.json)
export const webApi = functions.https.onRequest(main);

// Automatically allow cross-origin requests
//app.use(cors({ origin: true }));

// test endpoint for confirming connectivity
app.get('/ready', (res:Response) => {
    res.send('API is active.');
});

// authentication router
const authRouter = require('./auth');
app.use('/auth', authRouter);
