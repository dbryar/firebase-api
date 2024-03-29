/****************
 * POST receiver *
 ****************/

// import dependencies
import * as admin from "firebase-admin"
import { isAuth, respond } from "./func"
import * as express from "express"
// const express = require('express');
const router = express.Router()

// Process an authorised form post and return a status response
router.post("/", [isAuth, create])
router.get("/:form/:id", [isAuth, retrieve])
router.get("/:form", [isAuth, retrieve])
router.get("/", [isAuth, retrieveAll])
router.put("/:id", [isAuth, update])
router.put("/", [isAuth, update])
router.delete("/:id", [isAuth, destroy])
router.delete("/", [isAuth, destroy])

async function create(req: express.Request, res: express.Response) {
  const data = req.body
  try {
    if (!data.submittedBy)
      throw new Error(
        JSON.stringify({
          code: 400,
          message: `Must include 'submittedBy (string)' field`,
          trace: "PC.002",
        })
      )
    if (!data.isComplete)
      throw new Error(
        JSON.stringify({
          code: 400,
          message: `Must include 'isComplete (string)' field`,
          trace: "PC.003",
        })
      )
    if (!data.formName)
      throw new Error(
        JSON.stringify({
          code: 400,
          message: `Must include 'formName (string)' field`,
          trace: "PC.004",
        })
      )
    if (!data.formData)
      throw new Error(
        JSON.stringify({
          code: 400,
          message: `Must include 'formData (JSON)' `,
          trace: "PC.005",
        })
      )
    if (res.locals.uid !== data.submittedBy)
      throw new Error(
        JSON.stringify({
          code: 401,
          message: `UID does not match (${res.locals.uid})`,
          trace: "PC.006",
        })
      )
    const timeNow = new Date()
    const db = admin.firestore()
    await db
      .collection("submissions")
      .add({
        submittedBy: data.submittedBy,
        isComplete: data.isComplete,
        modified: timeNow,
        formName: data.formName.replace(/-/g, " "),
        formData: data.formData,
      })
      .then(function (newDoc) {
        return respond(res, {
          code: 201,
          message: `success`,
          data: {
            id: newDoc.id,
          },
        })
      })
      .catch(function (error) {
        throw new Error(
          JSON.stringify({
            code: 500,
            message: `Firestore Error`,
            trace: "PC.001",
            data: error,
          })
        )
      })
  } catch (error) {
    try {
      JSON.parse(error.message)
      return respond(res, JSON.parse(error.message))
    } catch {
      return respond(res, error.message)
    }
  }
  return false
}

async function retrieve(req: express.Request, res: express.Response) {
  const formName = req.params.form
  const subId = req.params.id || false
  let response: { [key: string]: any } | undefined = {}
  let message = `no data`
  try {
    if (!formName)
      throw new Error(
        JSON.stringify({
          code: 400,
          message: `Must include '/formName' in request`,
          trace: "PR.005",
        })
      )
    if (formName.length < 3)
      throw new Error(
        JSON.stringify({
          code: 400,
          message: `Must include '/formName' in request`,
          trace: "PR.006",
        })
      )
    const db = admin.firestore()
    if (subId) {
      db.collection("submissions")
        .doc(subId)
        .get()
        .then(function (doc) {
          if (!doc.exists) {
            return respond(res, {
              code: 500,
              message: `Firestore Error`,
              trace: "PR.007",
              data: `Submission ${subId} does not exist`,
            })
          } else {
            response = doc.data()
            message = `success`
            return respond(res, {
              code: 200,
              message: message,
              trace: "PR:001",
              data: response,
            })
          }
        })
        .catch(function (error) {
          return respond(res, {
            code: 500,
            message: `Firestore Error`,
            trace: "PR.002",
            data: error,
          })
        })
    } else {
      console.log(
        `Looking for last incomplete '${formName.replace(
          /-/g,
          " "
        )}' submitted by '${res.locals.uid}'`
      )
      db.collection("submissions")
        .where("submittedBy", "==", res.locals.uid)
        .where("isComplete", "==", "false")
        .where("formName", "==", formName.replace(/-/g, " "))
        .orderBy("modified", "desc")
        .limit(1)
        .get()
        .then(function (subSnap) {
          subSnap.forEach(function (doc) {
            const sub = doc.data()
            sub.id = doc.id
            // console.log(doc.id," => ",sub)
            response = sub
            message = `success`
          })
          return respond(res, {
            code: 200,
            message: message,
            trace: "PR:003",
            data: response,
          })
        })
        .catch(function (error) {
          return respond(res, {
            code: 500,
            message: `Firestore Error`,
            trace: "PR.004",
            data: error,
          })
        })
    }
  } catch (error) {
    try {
      JSON.parse(error.message)
      return respond(res, JSON.parse(error.message))
    } catch {
      return respond(res, error.message)
    }
  }
  return false
}

async function retrieveAll(req: express.Request, res: express.Response) {
  const responses: { [key: string]: any }[] | undefined = []
  let message = `no data`
  try {
    const db = admin.firestore()

    console.log(`Looking for all submissions from '${res.locals.uid}'`)
    db.collection("submissions")
      .where("submittedBy", "==", res.locals.uid)
      .orderBy("modified", "desc")
      .get()
      .then(function (subSnap) {
        subSnap.forEach(function (doc) {
          const sub = doc.data()
          sub.id = doc.id
          // console.log(doc.id," => ",sub)
          responses?.push(sub)
          message = `success`
        })
        return respond(res, {
          code: 200,
          message: message,
          trace: "PR.003",
          data: responses,
        })
      })
      .catch(function (error) {
        return respond(res, {
          code: 500,
          message: `Firestore Error`,
          trace: "PR.004",
          data: error,
        })
      })
  } catch (error) {
    try {
      JSON.parse(error.message)
      return respond(res, JSON.parse(error.message))
    } catch {
      return respond(res, error.message)
    }
  }
  return false
}

async function update(req: express.Request, res: express.Response) {
  const data = req.body
  const docId = req.params.id
  try {
    if (!docId)
      throw new Error(
        JSON.stringify({
          code: 400,
          message: `Must include 'docID (string)' from past response in PUT request`,
          trace: "PU.002",
        })
      )
    if (!data.submittedBy)
      throw new Error(
        JSON.stringify({
          code: 400,
          message: `Must include 'submittedBy (string)' field`,
          trace: "PU.003",
        })
      )
    if (!data.isComplete)
      throw new Error(
        JSON.stringify({
          code: 400,
          message: `Must include 'isComplete (string)' field`,
          trace: "PU.004",
        })
      )
    if (!data.formName)
      throw new Error(
        JSON.stringify({
          code: 400,
          message: `Must include 'formName (string)' field`,
          trace: "PU.005",
        })
      )
    if (!data.formData)
      throw new Error(
        JSON.stringify({
          code: 400,
          message: `Must include 'formData (JSON)' `,
          trace: "PU.006",
        })
      )
    if (res.locals.uid !== data.submittedBy)
      throw new Error(
        JSON.stringify({
          code: 401,
          message: `UID does not match (${res.locals.uid})`,
          trace: "PU.007",
        })
      )
    const timeNow = new Date()
    const db = admin.firestore()
    await db
      .collection("submissions")
      .doc(docId)
      .set(
        {
          submittedBy: data.submittedBy,
          isComplete: data.isComplete,
          modified: timeNow,
          formName: data.formName.replace(/-/g, " "),
          formData: data.formData,
        },
        {
          merge: true,
        }
      )
      .then(function () {
        return respond(res, {
          code: 200,
          message: `success`,
          data: {
            id: docId,
            formData: data.formData,
          },
        })
      })
      .catch(function (error) {
        throw new Error(
          JSON.stringify({
            code: 500,
            message: `Firestore Error`,
            trace: "PU.001",
            data: error,
          })
        )
      })
  } catch (error) {
    try {
      JSON.parse(error.message)
      return respond(res, JSON.parse(error.message))
    } catch {
      return respond(res, error.message)
    }
  }
  return false
}

async function destroy(req: express.Request, res: express.Response) {
  const docId = req.params.id
  try {
    if (!docId)
      throw new Error(
        JSON.stringify({
          code: 400,
          message: `Must include 'docID (string)' from past response in DELETE request`,
          trace: "PD.001",
        })
      )
    const db = admin.firestore()
    const docRef = db.collection("submissions").doc(docId)
    docRef
      .get()
      .then(function (doc) {
        if (doc.exists) {
          docRef
            .delete()
            .then(function () {
              return respond(res, {
                code: 200,
                message: `success`,
              })
            })
            .catch(function (error) {
              throw new Error(
                JSON.stringify({
                  code: 500,
                  message: `Firestore Error`,
                  trace: "PD.002",
                  data: error,
                })
              )
            })
        } else {
          throw new Error(
            JSON.stringify({
              code: 400,
              message: `Document does not exist (${res.locals.uid})`,
              trace: "PD.003",
            })
          )
        }
      })
      .catch(function (error) {
        throw new Error(
          JSON.stringify({
            code: 500,
            message: `Firestore Error`,
            trace: "PD.004",
            data: error,
          })
        )
      })
  } catch (error) {
    try {
      JSON.parse(error.message)
      return respond(res, JSON.parse(error.message))
    } catch {
      return respond(res, error.message)
    }
  }
  return false
}

module.exports = router
