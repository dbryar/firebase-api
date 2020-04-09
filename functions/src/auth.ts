/************
* User Auth *
************/


// import dependencies
import * as admin from 'firebase-admin';
import { Request, Response } from 'express';
import { respond } from './func';

const express = require('express');
const router = express.Router();

// Process a login from OAuth and return a UID to client
router.get('/', async (req:Request,res:Response) => {

  // get headers and check for JWT
  const { authorization } = req.headers;

  try {
    if (!authorization) throw new Error(JSON.stringify({code:401,message:`Unauthorized`,trace:'AL.001'}));
    if (!authorization.startsWith('Bearer')) throw new Error(JSON.stringify({code:401,message:`Unauthorized`,trace:'AL.002'}));
    if (authorization.split('Bearer ').length !== 2) throw new Error(JSON.stringify({code:401,message:`Unauthorized`,trace:'AL.003'}));

    // get the auth bearer token from the header
    const idToken = authorization.split('Bearer ')[1];

    // verify the token supplied by Google OAuth2 (valid for 1 hour)
    if (idToken.split('.').length !== 3) throw new Error(JSON.stringify({code:401,message:`Unauthorized`,trace:'AL.004'}));
    await admin.auth().verifyIdToken(idToken)
    .then(async function(decodedToken:any) {
      // respond to the client
      return respond(res, {
        message: 'success',
        data: {
          uid: decodedToken.uid,
          name: decodedToken.displayName,
          email: decodedToken.email
        }
      });
    })
    .catch((error) => {
      return respond(res, {
        code:400,
        message: `${error}`,
        trace: `AL:005`
      });
    });
  } catch (error) {
    try {
      JSON.parse(error.message);
      return respond(res, JSON.parse(error.message));
    } catch {
      return respond(res, {
        code:500,
        message: `${error}`,
        trace: `AL:006`
      });
    }
  }
  return;
});

module.exports = router
