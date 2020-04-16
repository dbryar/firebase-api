import { Request, Response } from 'express';
import * as admin from 'firebase-admin'

const Filter = require('bad-words'), filter = new Filter();

// API responder to structure response messages consistently
export function respond(res:Response, msg:any) {
  let log = false;
  if(msg.code || msg.data) {
    const json: {[key: string]: any} = {};
    if(msg.code >= 300) {
      // log errors to the console
      log = true;
      json.status = `Response code: ${msg.code}`;
    }
    if(msg.trace) json.trace = `Response ID: ${msg.trace}`;
    json.message = msg.message;
    if(msg.data) json.data = msg.data;
    if(msg.code) {
      if(msg.code === 204) {
        res.status(204).end();
      } else {
        if(log) console.log(JSON.stringify(json,null,2))
        res.status(msg.code).json(json);
      }
    } else {
      res.status(200).json(json);
    }
  } else {
    if(log) console.log(JSON.stringify({code:500,message:`Error ${msg}`},null,2))
    res.status(500).json({message: msg});
  }
  return res;
}


// return authorised and verified JWT assertion
export function isAuth(req:Request,res:Response,next:Function) {

  try {
    // get headers and check for JWT bearer token
    const { authorization } = req.headers

    if (!authorization) throw new Error(JSON.stringify({code:401,message:`Unauthorized`,trace:'GA.003'}));
    if (!authorization.startsWith('Bearer')) throw new Error(JSON.stringify({code:401,message:`Unauthorized`,trace:'GA.004'}));
    if (authorization.split('Bearer ').length !== 2) throw new Error(JSON.stringify({code:401,message:`Unauthorized`,trace:'GA.005'}));

    // get the auth bearer token from the header
    const idToken = authorization.split('Bearer ')[1]

    // verify the token is a JWT structure
    if (idToken.split('.').length !== 3) throw new Error(JSON.stringify({code:401,message:`Unauthorized`,trace:'GA.006'}));

    // verify the token supplied by Google OAuth2 (valid for 1 hour)
    admin.auth().verifyIdToken(idToken)
    .then(function(decodedToken) {
      res.locals = { ...res.locals, uid:decodedToken.uid };
      return next();
    })
    .catch(function(error) {
      return respond(res, {code:401,message:'Token Error',data:`${error.message}`,trace:'GA.007'})
    });
  } catch (error) {
    try {
      JSON.parse(error.message);
      return respond(res, JSON.parse(error.message));
    } catch {
      return respond(res, error.message)
    }
  }
  return false;
}

// *** TO DO *** profanity filter of user entered data
export function isClean(data:any) {
  if(filter.isProfane(data)) return false;
  return true;
}
